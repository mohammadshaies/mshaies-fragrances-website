import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured, verifyAdminSession } from "../supabase.server";

export interface OrderEmailItem {
  name: string;
  price: number;
  qty: number;
  volume: string;
  image?: string;
}

export interface OrderEmailData {
  id: string;
  customerName: string;
  email?: string | null;
  phone: string;
  address: string;
  city: string;
  postalCode?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string | null;
  subtotal: number;
  discountCode?: string | null;
  discountAmount?: number;
  shipping: number;
  total: number;
  courierName?: string | null;
  date?: string;
  items: OrderEmailItem[];
}

export interface EmailConfig {
  provider: "resend" | "gmail" | "smtp";
  resendApiKey?: string;
  emailFrom?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  adminEmail: string;
}

const DEFAULT_ADMIN_EMAIL = "m.shaiesfragrances@gmail.com";
const STORE_NAME = "M.shaies Haute Parfumerie";
const STORE_WHATSAPP = "+92 339 0001829";

/**
 * Formats PKR numbers cleanly
 */
function formatPKR(num: number): string {
  return `₨ ${Number(num || 0).toLocaleString("en-PK")}`;
}

/**
 * Retrieves authoritative Email Configuration:
 * 1. Checks Supabase system-config-email record in audit_logs (allows instant setup via Admin UI)
 * 2. Merges with environment variables (process.env.RESEND_API_KEY, GMAIL_APP_PASSWORD, etc.)
 * 3. Sanitizes spaces and Windows CRLF carriage returns
 */
export async function getActiveEmailConfig(): Promise<EmailConfig> {
  let dbConfig: Partial<EmailConfig> = {};

  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseAdmin();
      if (client) {
        const { data } = await client
          .from("audit_logs")
          .select("details")
          .eq("id", "system-config-email")
          .maybeSingle();
        if (data?.details) {
          try {
            dbConfig = JSON.parse(data.details);
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[Email Service] Could not fetch db email config:", e);
    }
  }

  // Sanitize environment variables against Windows carriage returns and spacing
  const envResendApiKey = (process.env.RESEND_API_KEY || "").trim().replace(/[\r\n]/g, "");
  const envGmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").trim().replace(/[\r\n\s]/g, "");
  const envGmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || DEFAULT_ADMIN_EMAIL).trim().replace(/[\r\n]/g, "");
  const envAdminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_EMAIL).trim().replace(/[\r\n]/g, "");
  const envEmailFrom = (process.env.EMAIL_FROM || "").trim().replace(/[\r\n]/g, "");

  const resendApiKey = (dbConfig.resendApiKey || envResendApiKey || "").trim().replace(/[\r\n]/g, "");
  const gmailPass = (dbConfig.gmailAppPassword || envGmailPass || "").trim().replace(/[\r\n\s]/g, "");
  const gmailUser = (dbConfig.gmailUser || envGmailUser || DEFAULT_ADMIN_EMAIL).trim().replace(/[\r\n]/g, "");
  const adminEmail = (dbConfig.adminEmail || envAdminEmail || DEFAULT_ADMIN_EMAIL).trim().replace(/[\r\n]/g, "");
  const emailFrom = (dbConfig.emailFrom || envEmailFrom || `M.shaies Haute Parfumerie <${adminEmail}>`).trim();

  const provider: "resend" | "gmail" | "smtp" = dbConfig.provider || (resendApiKey ? "resend" : "gmail");

  const smtpHost = (dbConfig.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com").trim().replace(/[\r\n]/g, "");
  const smtpPort = Number(dbConfig.smtpPort || process.env.SMTP_PORT || 465);
  const smtpUser = (dbConfig.smtpUser || gmailUser).trim().replace(/[\r\n]/g, "");
  const smtpPass = (dbConfig.smtpPass || gmailPass).trim().replace(/[\r\n\s]/g, "");
  const smtpSecure = dbConfig.smtpSecure ?? (smtpPort === 465);

  return {
    provider,
    resendApiKey,
    emailFrom,
    gmailUser,
    gmailAppPassword: gmailPass,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpSecure,
    adminEmail,
  };
}

/**
 * Sends email via Resend HTTP REST API
 */
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  config: EmailConfig
): Promise<{ sent: boolean; method: string; error?: string }> {
  if (!config.resendApiKey) {
    return { sent: false, method: "resend", error: "Missing RESEND_API_KEY" };
  }

  try {
    // If testing without verified domain, Resend requires onboarding@resend.dev
    const fromAddress = config.emailFrom && !config.emailFrom.includes("@gmail.com")
      ? config.emailFrom
      : "M.shaies Fragrances <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn("[Email Service] Resend API error:", errBody);
      let errorMsg = `Resend API error (${res.status})`;
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.message) {
          errorMsg = parsed.message;
        }
      } catch {
        errorMsg = errBody;
      }
      return { sent: false, method: "resend", error: errorMsg };
    }
    return { sent: true, method: "resend" };
  } catch (err: any) {
    console.warn("[Email Service] Resend fetch exception:", err);
    return { sent: false, method: "resend", error: err?.message || "Failed to reach Resend API" };
  }
}

/**
 * Sends email via Nodemailer SMTP (Gmail or custom server)
 */
async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  config: EmailConfig
): Promise<{ sent: boolean; method: string; error?: string }> {
  const host = config.smtpHost || "smtp.gmail.com";
  const port = config.smtpPort || 465;
  const isSecure = port === 465;
  const user = (config.smtpUser || config.gmailUser)?.trim();
  const rawPass = config.smtpPass || config.gmailAppPassword;
  // Google App Passwords are 16 characters often presented as 4 groups of 4 with spaces
  const pass = rawPass ? rawPass.replace(/\s+/g, "") : "";

  if (!pass || !user) {
    return {
      sent: false,
      method: "smtp",
      error: "Missing SMTP/Gmail username or app password. Please configure them in Admin Settings.",
    };
  }

  try {
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const fromAddress = config.emailFrom || `"${STORE_NAME}" <${user}>`;
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    return { sent: true, method: host.includes("gmail") ? "gmail-smtp" : "smtp" };
  } catch (err: any) {
    console.warn("[Email Service] SMTP dispatch error:", err?.message || err);
    let errorMsg = err?.message || "Failed to send email via SMTP";
    if (
      errorMsg.includes("535") ||
      errorMsg.includes("BadCredentials") ||
      errorMsg.includes("Username and Password not accepted")
    ) {
      errorMsg =
        "Google SMTP rejected credentials (535 Bad Credentials). Ensure 2-Step Verification is ON and generate a fresh 16-character App Password at https://myaccount.google.com/apppasswords";
    } else if (errorMsg.includes("ETIMEDOUT") || errorMsg.includes("ECONNREFUSED")) {
      errorMsg = `Connection to ${host}:${port} timed out. Cloud serverless platforms may restrict SMTP ports; consider switching to Resend API.`;
    }
    return { sent: false, method: host.includes("gmail") ? "gmail-smtp" : "smtp", error: errorMsg };
  }
}

/**
 * Dispatches an email using the active or fallback transport
 */
export async function sendEmailMessage({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; method: string; error?: string }> {
  const config = await getActiveEmailConfig();

  // 1. If configured for Resend
  if (config.provider === "resend" && config.resendApiKey) {
    const resendResult = await sendViaResend(to, subject, html, config);
    if (resendResult.sent) return resendResult;
    // Fallback to Gmail SMTP if available
    if (config.gmailAppPassword) {
      console.log("[Email Service] Resend failed, attempting fallback to Gmail SMTP...");
      const smtpResult = await sendViaSmtp(to, subject, html, config);
      if (smtpResult.sent) return smtpResult;
    }
    return resendResult;
  }

  // 2. If configured for Gmail / SMTP
  if (config.provider === "gmail" || config.provider === "smtp") {
    if (config.gmailAppPassword || config.smtpPass) {
      const smtpResult = await sendViaSmtp(to, subject, html, config);
      if (smtpResult.sent) return smtpResult;
      // Fallback to Resend if available
      if (config.resendApiKey) {
        console.log("[Email Service] SMTP failed, attempting fallback to Resend API...");
        const resendResult = await sendViaResend(to, subject, html, config);
        if (resendResult.sent) return resendResult;
      }
      return smtpResult;
    }
  }

  // 3. Fallback: try any configured credentials
  if (config.resendApiKey) {
    return sendViaResend(to, subject, html, config);
  }
  if (config.gmailAppPassword || config.smtpPass) {
    return sendViaSmtp(to, subject, html, config);
  }

  return {
    sent: false,
    method: "none",
    error: "No email transport configured. Please configure Resend API Key or Gmail App Password in Admin Settings.",
  };
}

/**
 * Generates royal luxury HTML invoice template for the Customer
 */
export function generateCustomerInvoiceHtml(order: OrderEmailData): string {
  const isCod = order.paymentMethod === "cod";
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 14px; border-bottom: 1px solid #e8e2d5; font-size: 13px; color: #1c1917;">
        <strong style="font-family: Georgia, serif; color: #111;">${item.name}</strong><br>
        <span style="font-size: 11px; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px;">${item.volume}</span>
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #e8e2d5; font-size: 13px; color: #44403c; text-align: center;">
        ${item.qty}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #e8e2d5; font-size: 13px; color: #44403c; text-align: right;">
        ${formatPKR(item.price)}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid #e8e2d5; font-size: 13px; color: #111; font-weight: bold; text-align: right; font-family: Georgia, serif;">
        ${formatPKR(item.price * item.qty)}
      </td>
    </tr>
  `
    )
    .join("");

  const cleanPhone = order.phone.replace(/[^0-9]/g, "");
  const invoiceUrl = `https://mshaies.com/invoice/${order.id}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>M.shaies Fragrances — Invoice #${order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f5f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f5f0; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; border: 1px solid #d4af37; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
          
          <!-- Royal Header Banner -->
          <tr>
            <td style="background-color: #12100e; padding: 32px 30px; text-align: center; border-bottom: 3px solid #d4af37;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; letter-spacing: 3px; color: #f5eedc; text-transform: uppercase;">M.SHAIES</h1>
              <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 2px; color: #d4af37; text-transform: uppercase;">Haute Parfumerie · In Stock & Dispatched Nationwide</p>
              <div style="margin-top: 16px; display: inline-block; padding: 4px 16px; background-color: rgba(212,175,55,0.15); border: 1px solid #d4af37; border-radius: 20px;">
                <span style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #d4af37; text-transform: uppercase;">Official Tax Invoice & Order Receipt</span>
              </div>
            </td>
          </tr>

          <!-- Thank You Message -->
          <tr>
            <td style="padding: 28px 30px 20px;">
              <h2 style="margin: 0 0 10px; font-family: Georgia, serif; font-size: 20px; color: #111;">
                Assalam-o-Alaikum, ${order.customerName}!
              </h2>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #57534e;">
                Thank you for patronizing <strong>M.shaies Fragrances</strong>. Your signature order <strong style="color: #111;">#${order.id}</strong> has been received and is prepared with artisanal care at our atelier. All items are in stock and ready for prompt courier dispatch.
              </p>
            </td>
          </tr>

          <!-- Order Summary Meta Box -->
          <tr>
            <td style="padding: 0 30px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #faf7f2; border: 1px solid #e8e2d5; border-radius: 12px; padding: 18px 20px;">
                <tr>
                  <td width="50%" valign="top" style="padding-bottom: 12px;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; font-weight: bold; display: block;">Order Reference</span>
                    <strong style="font-family: monospace; font-size: 15px; color: #111;">${order.id}</strong>
                  </td>
                  <td width="50%" valign="top" align="right" style="padding-bottom: 12px;">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; font-weight: bold; display: block;">Payment Method</span>
                    <strong style="font-size: 13px; color: #111; text-transform: uppercase;">${order.paymentMethod.toUpperCase()}</strong>
                  </td>
                </tr>
                <tr>
                  <td width="50%" valign="top">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; font-weight: bold; display: block;">Delivery Address</span>
                    <span style="font-size: 13px; color: #292524; line-height: 1.4;">${order.address}, ${order.city}</span><br>
                    <span style="font-size: 12px; color: #78716c;">Phone: ${order.phone}</span>
                  </td>
                  <td width="50%" valign="top" align="right">
                    <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a8a29e; font-weight: bold; display: block;">Payment Status</span>
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; ${
                      order.paymentStatus === "Paid"
                        ? "background-color: #dcfce7; color: #15803d; border: 1px solid #86efac;"
                        : order.paymentStatus === "Verification Required"
                        ? "background-color: #fef3c7; color: #b45309; border: 1px solid #fcd34d;"
                        : "background-color: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;"
                    }">
                      ${order.paymentStatus}
                    </span>
                    ${
                      order.transactionId
                        ? `<br><span style="font-family: monospace; font-size: 11px; color: #78716c;">TID: ${order.transactionId}</span>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #12100e; color: #f5eedc;">
                    <th align="left" style="padding: 10px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Fragrance Item</th>
                    <th align="center" style="padding: 10px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Qty</th>
                    <th align="right" style="padding: 10px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Unit Price</th>
                    <th align="right" style="padding: 10px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td style="padding: 18px 30px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px; color: #57534e;">
                      <tr>
                        <td>Subtotal:</td>
                        <td align="right" style="color: #111; font-family: Georgia, serif;">${formatPKR(order.subtotal)}</td>
                      </tr>
                      ${
                        order.discountAmount && order.discountAmount > 0
                          ? `<tr>
                        <td style="color: #15803d;">Discount (${order.discountCode || "COUPON"}):</td>
                        <td align="right" style="color: #15803d; font-family: Georgia, serif;">- ${formatPKR(order.discountAmount)}</td>
                      </tr>`
                          : ""
                      }
                      <tr>
                        <td>Shipping Fee:</td>
                        <td align="right" style="color: #111; font-family: Georgia, serif;">${order.shipping === 0 ? "FREE" : formatPKR(order.shipping)}</td>
                      </tr>
                      ${
                        isCod
                          ? `<tr>
                        <td style="color: #b45309; font-size: 11px;">COD Courier Surcharge:</td>
                        <td align="right" style="color: #b45309; font-size: 11px;">(Included in Shipping)</td>
                      </tr>`
                          : ""
                      }
                      <tr style="border-top: 2px solid #111;">
                        <td style="padding-top: 10px; font-size: 15px; font-weight: bold; color: #111; font-family: Georgia, serif;">Grand Total:</td>
                        <td align="right" style="padding-top: 10px; font-size: 18px; font-weight: bold; color: #b45309; font-family: Georgia, serif;">${formatPKR(order.total)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Notice Card -->
          <tr>
            <td style="padding: 0 30px 28px;">
              <div style="padding: 16px 20px; border-radius: 12px; ${
                isCod
                  ? "background-color: #fefce8; border: 1px solid #fde047;"
                  : "background-color: #ecfdf5; border: 1px solid #a7f3d0;"
              }">
                <p style="margin: 0; font-size: 13px; color: #1c1917; line-height: 1.5;">
                  ${
                    isCod
                      ? `💵 <strong>Cash on Delivery (COD) Instructions:</strong> Please have exact cash of <strong>${formatPKR(order.total)}</strong> ready for the courier rider upon delivery to your doorstep in <strong>${order.city}</strong>.`
                      : `📱 <strong>Smart Mobile Transfer:</strong> Payment transfer to <strong>Muhammad Shees</strong> (0332 5568922). ${
                          order.transactionId ? `Your recorded TID is <code>${order.transactionId}</code>.` : ""
                        } For instant confirmation, share your screenshot on WhatsApp at <strong>+92 339 0001829</strong>.`
                  }
                </p>
              </div>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding: 0 30px 32px;">
              <a href="${invoiceUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #d4af37; color: #12100e; font-size: 13px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; border-radius: 30px; box-shadow: 0 4px 15px rgba(212,175,55,0.35);">
                View & Print Official Invoice Online ↗
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #faf7f2; border-top: 1px solid #e8e2d5; padding: 24px 30px; text-align: center; font-size: 11px; color: #78716c; line-height: 1.6;">
              <p style="margin: 0 0 6px;">
                <strong>M.shaies Haute Parfumerie</strong> · 100% In Stock · Delivering Nationwide Across Pakistan
              </p>
              <p style="margin: 0;">
                WhatsApp Helpline: <a href="https://wa.me/923390001829" style="color: #15803d; font-weight: bold; text-decoration: none;">+92 339 0001829</a> · Email: <a href="mailto:${DEFAULT_ADMIN_EMAIL}" style="color: #1c1917; text-decoration: none;">${DEFAULT_ADMIN_EMAIL}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generates immediate Order Alert HTML email for the Store Admin (m.shaiesfragrances@gmail.com)
 */
export function generateAdminOrderAlertHtml(order: OrderEmailData): string {
  const isCod = order.paymentMethod === "cod";
  const itemsList = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 13px;">
        <strong>${item.name}</strong> (${item.volume})
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 13px; text-align: center;">${item.qty}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 13px; text-align: right;">${formatPKR(item.price)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 13px; text-align: right; font-weight: bold;">${formatPKR(item.price * item.qty)}</td>
    </tr>
  `
    )
    .join("");

  const cleanPhone = order.phone.replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("0") ? `92${cleanPhone.slice(1)}` : cleanPhone;
  const waChatLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Assalam-o-Alaikum ${order.customerName}! Regarding your M.shaies Order #${order.id} of ${formatPKR(order.total)}.`)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order #${order.id}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4; color: #222;">
  <table role="presentation" width="100%" style="max-width: 650px; margin: 0 auto; background-color: #fff; border-radius: 12px; border: 2px solid #b8860b; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
    
    <!-- Admin Header -->
    <tr style="background-color: #111; color: #fff;">
      <td style="padding: 24px 25px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; color: #d4af37; text-transform: uppercase; letter-spacing: 2px;">⚡ NEW ORDER RECEIVED</h2>
        <p style="margin: 6px 0 0; font-size: 14px; color: #eee;">Order #${order.id} · Total: <strong style="color: #d4af37; font-size: 18px;">${formatPKR(order.total)}</strong></p>
      </td>
    </tr>

    <!-- Customer Information -->
    <tr>
      <td style="padding: 20px 25px;">
        <h3 style="margin: 0 0 12px; font-size: 16px; border-bottom: 2px solid #eee; padding-bottom: 6px; color: #111;">Customer & Shipping Profile</h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px;">
          <tr>
            <td width="30%"><strong>Customer Name:</strong></td>
            <td>${order.customerName}</td>
          </tr>
          <tr>
            <td><strong>Contact Phone:</strong></td>
            <td>
              <a href="tel:${order.phone}" style="color: #0066cc; font-weight: bold;">${order.phone}</a>
              &nbsp;·&nbsp;
              <a href="${waChatLink}" target="_blank" style="display: inline-block; padding: 2px 8px; background-color: #25d366; color: #fff; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: bold;">Open WhatsApp 💬</a>
            </td>
          </tr>
          <tr>
            <td><strong>Email Address:</strong></td>
            <td>${order.email ? `<a href="mailto:${order.email}" style="color: #0066cc;">${order.email}</a>` : '<em style="color: #888;">Not provided</em>'}</td>
          </tr>
          <tr>
            <td><strong>Delivery City:</strong></td>
            <td><strong style="color: #111;">${order.city}</strong></td>
          </tr>
          <tr>
            <td><strong>Complete Address:</strong></td>
            <td>${order.address} ${order.postalCode ? `(Postal: ${order.postalCode})` : ""}</td>
          </tr>
          <tr>
            <td><strong>Assigned Courier:</strong></td>
            <td>${order.courierName || "TCS Express"}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Payment Instrument -->
    <tr>
      <td style="padding: 0 25px 20px;">
        <div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px 16px;">
          <h4 style="margin: 0 0 8px; font-size: 14px; text-transform: uppercase; color: #b8860b;">Payment Details</h4>
          <p style="margin: 0 0 4px; font-size: 13px;"><strong>Method:</strong> <span style="text-transform: uppercase; font-weight: bold;">${order.paymentMethod}</span></p>
          <p style="margin: 0 0 4px; font-size: 13px;"><strong>Status:</strong> <span style="font-weight: bold; color: ${isCod ? "#0284c7" : "#d97706"};">${order.paymentStatus}</span></p>
          ${
            order.transactionId
              ? `<p style="margin: 0 0 4px; font-size: 13px; font-family: monospace;"><strong>Submitted TID:</strong> <span style="background: #ffecb3; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${order.transactionId}</span></p>`
              : ""
          }
          ${
            isCod
              ? `<p style="margin: 0; font-size: 12px; color: #666;">Cash Collection: Rider must collect <strong>${formatPKR(order.total)}</strong> cash at doorstep.</p>`
              : `<p style="margin: 0; font-size: 12px; color: #666;">Direct Mobile Transfer: Verify transaction in Muhammad Shees account (0332 5568922).</p>`
          }
        </div>
      </td>
    </tr>

    <!-- Items Ordered -->
    <tr>
      <td style="padding: 0 25px 20px;">
        <h3 style="margin: 0 0 10px; font-size: 15px; border-bottom: 2px solid #eee; padding-bottom: 6px;">Ordered Items (${order.items.length})</h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2; color: #333;">
              <th align="left" style="padding: 8px 10px; font-size: 11px;">Product</th>
              <th align="center" style="padding: 8px 10px; font-size: 11px;">Qty</th>
              <th align="right" style="padding: 8px 10px; font-size: 11px;">Unit Price</th>
              <th align="right" style="padding: 8px 10px; font-size: 11px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
        </table>
      </td>
    </tr>

    <!-- Financial Breakdown -->
    <tr>
      <td style="padding: 0 25px 25px;" align="right">
        <table role="presentation" width="280" cellspacing="0" cellpadding="4" style="font-size: 13px;">
          <tr>
            <td>Subtotal:</td>
            <td align="right"><strong>${formatPKR(order.subtotal)}</strong></td>
          </tr>
          ${
            order.discountAmount
              ? `<tr>
            <td style="color: green;">Discount (${order.discountCode}):</td>
            <td align="right" style="color: green;">-${formatPKR(order.discountAmount)}</td>
          </tr>`
              : ""
          }
          <tr>
            <td>Shipping Fee:</td>
            <td align="right"><strong>${order.shipping === 0 ? "FREE" : formatPKR(order.shipping)}</strong></td>
          </tr>
          <tr style="border-top: 2px solid #333; font-size: 16px;">
            <td style="padding-top: 8px;"><strong>Total Payable:</strong></td>
            <td align="right" style="padding-top: 8px; color: #b8860b; font-weight: bold;"><strong>${formatPKR(order.total)}</strong></td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Quick Action Bar -->
    <tr>
      <td style="background-color: #fafafa; border-top: 1px solid #eee; padding: 20px 25px; text-align: center;">
        <a href="https://mshaies.com/admin" target="_blank" style="display: inline-block; padding: 10px 24px; background-color: #111; color: #d4af37; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; text-transform: uppercase; margin-right: 10px;">Open Admin Dashboard →</a>
        <a href="https://mshaies.com/invoice/${order.id}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #e5e5e5; color: #333; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: bold;">View Web Invoice</a>
      </td>
    </tr>

  </table>
</body>
</html>
  `;
}

/**
 * Dispatches automated order notification emails to:
 * 1. Store Admin (from active config or default m.shaiesfragrances@gmail.com)
 * 2. Customer (order.email if provided)
 */
export async function dispatchOrderNotificationEmails(order: OrderEmailData): Promise<{
  adminEmail: { sent: boolean; method: string; error?: string };
  customerEmail?: { sent: boolean; method: string; error?: string };
}> {
  console.log(`[Email Service] Initiating order email dispatches for #${order.id}...`);
  const config = await getActiveEmailConfig();
  const adminRecipient = config.adminEmail || DEFAULT_ADMIN_EMAIL;

  // 1. Send Admin Order Alert Email
  const adminSubject = `✨ New Order Placed: #${order.id} (${formatPKR(order.total)}) — ${order.customerName} (${order.city})`;
  const adminHtml = generateAdminOrderAlertHtml(order);
  const adminResult = await sendEmailMessage({
    to: adminRecipient,
    subject: adminSubject,
    html: adminHtml,
  });

  console.log(`[Email Service] Admin notification result for ${adminRecipient}:`, adminResult);

  // 2. Send Customer Invoice Email (if customer provided an email)
  let customerResult: { sent: boolean; method: string; error?: string } | undefined = undefined;
  if (order.email && order.email.includes("@")) {
    const customerSubject = `✨ Your M.shaies Fragrances Invoice & Order Confirmation #${order.id}`;
    const customerHtml = generateCustomerInvoiceHtml(order);
    customerResult = await sendEmailMessage({
      to: order.email.trim(),
      subject: customerSubject,
      html: customerHtml,
    });
    console.log(`[Email Service] Customer invoice email result for ${order.email}:`, customerResult);
  } else {
    console.log(`[Email Service] Skipping customer email: No customer email provided for order #${order.id}`);
  }

  // 3. Log results to Supabase audit_logs
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseAdmin();
      if (client) {
        await client.from("audit_logs").insert({
          id: `log-email-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: adminResult.sent ? "Order Email Dispatched" : "Order Email Queued",
          category: "Order",
          details: `Order #${order.id} notification: Admin to ${adminRecipient} (${adminResult.sent ? "Sent via " + adminResult.method : "Queued: " + (adminResult.error || "No email credentials configured")})${
            order.email
              ? ` · Customer to ${order.email} (${customerResult?.sent ? "Sent" : "Queued: " + (customerResult?.error || "Pending")})`
              : " · (Customer email not provided)"
          }`,
          user: "Automated Mailer",
        });
      }
    } catch (auditErr) {
      console.warn("[Email Service] Failed to log email audit record:", auditErr);
    }
  }

  return {
    adminEmail: adminResult,
    customerEmail: customerResult,
  };
}

/**
 * Generates verification test email HTML
 */
export function generateTestEmailHtml(recipient: string, provider: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background-color: #f7f5f0; padding: 40px 20px; color: #1c1917; margin: 0;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1.5px solid #d4af37; padding: 36px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-align: center;">
    <h1 style="color: #12100e; font-size: 26px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 6px;">M.SHAIES</h1>
    <p style="color: #d4af37; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 24px;">Haute Parfumerie · System Verification</p>
    
    <div style="padding: 20px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #86efac; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #166534; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ✓ Email Transmission Operational!
      </h2>
      <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        Congratulations! Your automated transactional email dispatcher is successfully configured via <strong>${provider.toUpperCase()}</strong>. Official order confirmations, invoices, and customer notifications are ready for nationwide delivery.
      </p>
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="text-align: left; font-size: 12px; color: #57534e; background-color: #faf7f2; border: 1px solid #e8e2d5; border-radius: 8px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <tr>
        <td width="35%"><strong>Recipient:</strong></td>
        <td>${recipient}</td>
      </tr>
      <tr>
        <td><strong>Provider:</strong></td>
        <td>${provider.toUpperCase()}</td>
      </tr>
      <tr>
        <td><strong>Timestamp:</strong></td>
        <td>${new Date().toUTCString()}</td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 11px; color: #a8a29e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      M.shaies Haute Parfumerie · Dispatch Desk
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Server Function: Get current email settings (with masked keys)
 */
export const getEmailConfigServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ authToken: z.string().optional() }))
  .handler(async ({ data }) => {
    const sessionCheck = await verifyAdminSession(data.authToken);
    if (!sessionCheck.valid) {
      return { success: false, error: sessionCheck.error || "Unauthorized" };
    }

    const config = await getActiveEmailConfig();
    const maskKey = (k?: string) => (k && k.length > 6 ? `${k.slice(0, 3)}••••••••${k.slice(-3)}` : k ? "••••••••" : "");

    return {
      success: true,
      config: {
        provider: config.provider,
        resendApiKey: maskKey(config.resendApiKey),
        hasResendApiKey: Boolean(config.resendApiKey),
        emailFrom: config.emailFrom,
        gmailUser: config.gmailUser,
        hasGmailPassword: Boolean(config.gmailAppPassword),
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUser: config.smtpUser,
        hasSmtpPass: Boolean(config.smtpPass),
        smtpSecure: config.smtpSecure,
        adminEmail: config.adminEmail,
        isConfigured: Boolean(config.resendApiKey || config.gmailAppPassword || config.smtpPass),
      },
    };
  });

/**
 * Server Function: Save email settings directly to Supabase
 */
export const saveEmailConfigServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      provider: z.enum(["resend", "gmail", "smtp"]),
      resendApiKey: z.string().optional(),
      emailFrom: z.string().optional(),
      gmailUser: z.string().optional(),
      gmailAppPassword: z.string().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPass: z.string().optional(),
      smtpSecure: z.boolean().optional(),
      adminEmail: z.string().min(5),
    })
  )
  .handler(async ({ data }) => {
    const sessionCheck = await verifyAdminSession(data.authToken);
    if (!sessionCheck.valid) {
      return { success: false, error: sessionCheck.error || "Unauthorized" };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: "Database not configured to store settings." };
    }

    const client = getSupabaseAdmin();
    if (!client) {
      return { success: false, error: "Supabase admin client not available." };
    }

    // Existing config to preserve unedited masked passwords
    let existing: any = {};
    try {
      const { data: exRow } = await client
        .from("audit_logs")
        .select("details")
        .eq("id", "system-config-email")
        .maybeSingle();
      if (exRow?.details) existing = JSON.parse(exRow.details);
    } catch {}

    const newResendApiKey =
      data.resendApiKey && !data.resendApiKey.includes("••••")
        ? data.resendApiKey.trim()
        : (existing.resendApiKey || process.env.RESEND_API_KEY || "").trim();

    const newGmailAppPassword =
      data.gmailAppPassword && !data.gmailAppPassword.includes("••••")
        ? data.gmailAppPassword.trim().replace(/[\r\n\s]/g, "")
        : (existing.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || "").trim().replace(/[\r\n\s]/g, "");

    const newSmtpPass =
      data.smtpPass && !data.smtpPass.includes("••••")
        ? data.smtpPass.trim().replace(/[\r\n\s]/g, "")
        : (existing.smtpPass || existing.gmailAppPassword || process.env.SMTP_PASS || "").trim().replace(/[\r\n\s]/g, "");

    const toSave = {
      provider: data.provider,
      resendApiKey: newResendApiKey,
      emailFrom: data.emailFrom?.trim() || `M.shaies Haute Parfumerie <${data.adminEmail.trim()}>`,
      gmailUser: data.gmailUser?.trim() || "m.shaiesfragrances@gmail.com",
      gmailAppPassword: newGmailAppPassword,
      smtpHost: data.smtpHost?.trim() || "smtp.gmail.com",
      smtpPort: data.smtpPort || 465,
      smtpUser: data.smtpUser?.trim() || data.gmailUser?.trim() || "m.shaiesfragrances@gmail.com",
      smtpPass: newSmtpPass,
      smtpSecure: data.smtpSecure ?? true,
      adminEmail: data.adminEmail.trim(),
    };

    const { error: upsertErr } = await client.from("audit_logs").upsert({
      id: "system-config-email",
      action: "email_credentials",
      category: "Config",
      details: JSON.stringify(toSave),
      timestamp: new Date().toISOString(),
      user: sessionCheck.user?.email || "Admin Console",
    });

    if (upsertErr) {
      return { success: false, error: `Failed to save email settings: ${upsertErr.message}` };
    }

    // Audit log
    await client.from("audit_logs").insert({
      id: `log-email-config-${Date.now()}`,
      action: "Email Settings Updated",
      category: "Config",
      details: `Email provider updated to ${data.provider.toUpperCase()} (Admin recipient: ${data.adminEmail})`,
      timestamp: new Date().toISOString(),
      user: sessionCheck.user?.email || "Admin Console",
    });

    return { success: true, message: "Email configuration saved successfully!" };
  });

/**
 * Server Function: Test email dispatch
 */
export const testEmailServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      authToken: z.string().optional(),
      targetEmail: z.string().min(5),
    })
  )
  .handler(async ({ data }) => {
    const sessionCheck = await verifyAdminSession(data.authToken);
    if (!sessionCheck.valid) {
      return { success: false, error: sessionCheck.error || "Unauthorized" };
    }

    const config = await getActiveEmailConfig();
    const testHtml = generateTestEmailHtml(data.targetEmail.trim(), config.provider);

    const result = await sendEmailMessage({
      to: data.targetEmail.trim(),
      subject: `✨ M.shaies Fragrances — Email Service Connection Verification`,
      html: testHtml,
    });

    if (result.sent) {
      return {
        success: true,
        method: result.method,
        message: `Verification email sent successfully to ${data.targetEmail.trim()} via ${result.method.toUpperCase()}! Please check your inbox.`,
      };
    }

    return {
      success: false,
      method: result.method,
      error: result.error || "Failed to dispatch test verification email.",
    };
  });

