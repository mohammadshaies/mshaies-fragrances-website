import nodemailer from "nodemailer";
import { getSupabaseAdmin, isSupabaseConfigured } from "../supabase.server";

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

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "m.shaiesfragrances@gmail.com";
const STORE_NAME = "M.shaies Haute Parfumerie";
const STORE_WHATSAPP = "+92 339 0001829";

/**
 * Formats PKR numbers cleanly
 */
function formatPKR(num: number): string {
  return `₨ ${Number(num || 0).toLocaleString("en-PK")}`;
}

/**
 * Creates email transport or returns null if no credentials configured
 */
function getEmailTransport() {
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || ADMIN_EMAIL;
  const smtpHost = process.env.SMTP_HOST;

  if (gmailPass) {
    if (smtpHost) {
      return nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: smtpUser,
          pass: gmailPass,
        },
      });
    }

    // Default to Gmail service
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: gmailPass,
      },
    });
  }

  return null;
}

/**
 * Sends email via Resend API directly if RESEND_API_KEY is configured
 */
async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "M.shaies Fragrances <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn("[Email Service] Resend API error:", errBody);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Email Service] Resend fetch exception:", err);
    return false;
  }
}

/**
 * Dispatches an email using available transport (Resend or Nodemailer)
 */
async function sendEmailMessage({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; method: string; error?: string }> {
  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    const success = await sendViaResend(to, subject, html);
    if (success) {
      return { sent: true, method: "resend" };
    }
  }

  // 2. Try Nodemailer / SMTP / Gmail if configured
  const transporter = getEmailTransport();
  if (transporter) {
    try {
      const fromAddress = process.env.SMTP_FROM || `"${STORE_NAME}" <${ADMIN_EMAIL}>`;
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });
      return { sent: true, method: "smtp" };
    } catch (err: any) {
      console.warn("[Email Service] SMTP dispatch error:", err?.message || err);
      return { sent: false, method: "smtp", error: err?.message };
    }
  }

  return {
    sent: false,
    method: "none",
    error: "No email transport configured (set GMAIL_APP_PASSWORD or RESEND_API_KEY in .env)",
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
              <p style="margin: 6px 0 0; font-size: 11px; letter-spacing: 2px; color: #d4af37; text-transform: uppercase;">Haute Parfumerie · Lahore, Pakistan</p>
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
                Thank you for patronizing <strong>M.shaies Fragrances</strong>. Your signature order <strong style="color: #111;">#${order.id}</strong> has been received and is being prepared with artisanal care at our atelier in Lahore.
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
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e8e2d5; font-size: 12px; color: #15803d;">
                      ✨ <strong>Complimentary 3ml Discovery Flacon</strong><br>
                      <span style="font-size: 10px; color: #78716c;">Pure Attar Sampler (Hand-Poured Gift)</span>
                    </td>
                    <td align="center" style="padding: 10px 14px; border-bottom: 1px solid #e8e2d5; font-size: 12px; color: #15803d;">1</td>
                    <td align="right" style="padding: 10px 14px; border-bottom: 1px solid #e8e2d5; font-size: 12px; color: #15803d;">FREE</td>
                    <td align="right" style="padding: 10px 14px; border-bottom: 1px solid #e8e2d5; font-size: 12px; color: #15803d; font-weight: bold;">₨ 0</td>
                  </tr>
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
                <strong>M.shaies Haute Parfumerie</strong> · Gulberg III, Lahore, Pakistan · Delivering Nationwide
              </p>
              <p style="margin: 0;">
                WhatsApp Helpline: <a href="https://wa.me/923390001829" style="color: #15803d; font-weight: bold; text-decoration: none;">+92 339 0001829</a> · Email: <a href="mailto:${ADMIN_EMAIL}" style="color: #1c1917; text-decoration: none;">${ADMIN_EMAIL}</a>
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
            <td>${order.courierName || (order.city.toLowerCase() === "lahore" ? "Rider Hand Delivery" : "TCS Express")}</td>
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
 * 1. Store Admin (m.shaiesfragrances@gmail.com)
 * 2. Customer (order.email if provided)
 */
export async function dispatchOrderNotificationEmails(order: OrderEmailData): Promise<{
  adminEmail: { sent: boolean; method: string; error?: string };
  customerEmail?: { sent: boolean; method: string; error?: string };
}> {
  console.log(`[Email Service] Initiating order email dispatches for #${order.id}...`);

  // 1. Send Admin Order Alert Email to m.shaiesfragrances@gmail.com
  const adminSubject = `✨ New Order Placed: #${order.id} (${formatPKR(order.total)}) — ${order.customerName} (${order.city})`;
  const adminHtml = generateAdminOrderAlertHtml(order);
  const adminResult = await sendEmailMessage({
    to: ADMIN_EMAIL,
    subject: adminSubject,
    html: adminHtml,
  });

  console.log(`[Email Service] Admin notification result for ${ADMIN_EMAIL}:`, adminResult);

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
          details: `Order #${order.id} notification: Admin to ${ADMIN_EMAIL} (${adminResult.sent ? "Sent via " + adminResult.method : "Queued: " + (adminResult.error || "No email credentials configured")})${
            order.email
              ? ` · Customer to ${order.email} (${customerResult?.sent ? "Sent" : "Queued"})`
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
