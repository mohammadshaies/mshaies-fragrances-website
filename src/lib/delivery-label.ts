import type { Order } from "./products-store";

function escHtml(val: unknown): string {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPKRPlain(amount: number): string {
  return `₨ ${Number(amount || 0).toLocaleString("en-PK")}`;
}

/**
 * Generates and opens a dedicated, print-ready Courier Delivery Label & Customer Packing Slip
 * for one or multiple orders (supports both thermal label printers and A4/A5 sheets).
 */
export function printDeliveryLabel(orderOrOrders: Order | Order[]) {
  if (typeof window === "undefined") return;
  const list = Array.isArray(orderOrOrders) ? orderOrOrders : [orderOrOrders];
  if (list.length === 0) return;

  const slipsHtml = list
    .map((order, idx) => {
      const isCod = order.paymentMethod === "cod";
      const paymentLabel =
        order.paymentMethod === "cod"
          ? "Cash on Delivery (COD)"
          : order.paymentMethod === "easypaisa"
          ? "Online — Easypaisa"
          : order.paymentMethod === "jazzcash"
          ? "Online — JazzCash"
          : order.paymentMethod === "nayapay"
          ? "Online — NayaPay"
          : String(order.paymentMethod || "COD").toUpperCase();

      const itemsRows = (order.items || [])
        .map(
          (item) => `
          <tr>
            <td style="padding:6px 8px;border:1px solid #222;font-weight:600;">${escHtml(item.name)}</td>
            <td style="padding:6px 8px;border:1px solid #222;text-align:center;">${escHtml(item.volume || "Standard")}</td>
            <td style="padding:6px 8px;border:1px solid #222;text-align:center;font-weight:700;">${Number(item.qty || 1)}</td>
            <td style="padding:6px 8px;border:1px solid #222;text-align:right;">${formatPKRPlain((item.price || 0) * (item.qty || 1))}</td>
          </tr>`
        )
        .join("");

      const totalQty = (order.items || []).reduce((acc, i) => acc + Number(i.qty || 1), 0);

      return `
      <div class="delivery-slip" style="${idx < list.length - 1 ? "page-break-after: always;" : ""}">
        <!-- Header: Brand & Order ID -->
        <div class="slip-header">
          <div>
            <div class="brand-tag">OFFICIAL COURIER DELIVERY PARCEL SLIP</div>
            <h1 class="brand-title">M.SHAIES FRAGRANCES</h1>
            <div class="brand-sub">www.mshaiesfragrances.com · Dispatch Helpline / WhatsApp: +92 339 0001829</div>
          </div>
          <div class="order-box">
            <div class="order-id-label">ORDER / PARCEL ID</div>
            <div class="order-id-val">#${escHtml(order.id)}</div>
            <div class="order-date">${escHtml(order.date || new Date().toLocaleDateString())}</div>
          </div>
        </div>

        <!-- Prominent Courier Collection Banner -->
        <div class="cod-banner ${isCod ? "cod-collect" : "cod-prepaid"}">
          <div>
            <div class="cod-title">
              ${
                isCod
                  ? "CASH ON DELIVERY (COD) — COLLECT CASH FROM CUSTOMER"
                  : `ONLINE PAYMENT (${escHtml(paymentLabel.toUpperCase())}) — ${escHtml(order.paymentStatus || "PAID")}`
              }
            </div>
            <div class="cod-sub">
              Payment Method: <strong>${escHtml(paymentLabel)}</strong>
              ${order.transactionId ? ` · Transaction ID (TID): <strong>${escHtml(order.transactionId)}</strong>` : ""}
              ${order.courierName ? ` · Courier: <strong>${escHtml(order.courierName)}</strong>` : ""}
              ${order.trackingNumber ? ` · Tracking #: <strong>${escHtml(order.trackingNumber)}</strong>` : ""}
            </div>
          </div>
          <div class="cod-amount-box">
            <div class="cod-amount-label">${isCod ? "AMOUNT TO COLLECT" : "CASH TO COLLECT"}</div>
            <div class="cod-amount-val">${isCod ? formatPKRPlain(order.total) : "₨ 0 (ONLINE)"}</div>
          </div>
        </div>

        <!-- Customer Delivery Details Grid -->
        <div class="customer-box">
          <div class="section-heading">DELIVER TO — CUSTOMER DELIVERY DETAILS</div>
          <div class="customer-grid">
            <div class="field-block">
              <div class="field-label">Customer Full Name</div>
              <div class="field-val-lg">${escHtml(order.customerName)}</div>
            </div>
            <div class="field-block">
              <div class="field-label">Phone Number (Call / WhatsApp)</div>
              <div class="field-val-lg font-mono">${escHtml(order.phone)}</div>
            </div>
            <div class="field-block col-span-2">
              <div class="field-label">Complete Delivery Street Address</div>
              <div class="field-val-addr">${escHtml(order.address)}</div>
            </div>
            <div class="field-block">
              <div class="field-label">City &amp; State / Province</div>
              <div class="field-val-md">${escHtml(order.city)}</div>
            </div>
            <div class="field-block">
              <div class="field-label">Customer Email &amp; Postal Code</div>
              <div class="field-val-sm">
                Email: <strong>${escHtml(order.email || "N/A")}</strong>
                ${order.postalCode ? ` · Postal Code: <strong>${escHtml(order.postalCode)}</strong>` : ""}
              </div>
            </div>
          </div>
        </div>

        <!-- Packing Checklist Table -->
        <div class="items-box">
          <div class="section-heading">PARCEL CONTENTS &amp; PACKING CHECKLIST (${totalQty} ${totalQty === 1 ? "ITEM" : "ITEMS"})</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align:left;">Fragrance / Item Description</th>
                <th style="text-align:center;width:110px;">Flacon Volume</th>
                <th style="text-align:center;width:65px;">Qty</th>
                <th style="text-align:right;width:115px;">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals-row">
            <div>
              ${
                order.isGiftWrapped
                  ? `<div class="gift-badge">🎁 ROYAL GIFT WRAPPED PARCEL ${order.giftMessage ? `— Note: "${escHtml(order.giftMessage)}"` : ""}</div>`
                  : `<div style="font-size:9pt;color:#444;">Handle with care · Fragile glass flacon inside</div>`
              }
            </div>
            <div class="totals-summary">
              <div>Subtotal: <strong>${formatPKRPlain(order.subtotal)}</strong></div>
              ${order.discountAmount ? `<div>Discount (${escHtml(order.discountCode || "Voucher")}): <strong>- ${formatPKRPlain(order.discountAmount)}</strong></div>` : ""}
              <div>Shipping: <strong>${order.shipping === 0 ? "FREE" : formatPKRPlain(order.shipping)}</strong></div>
              <div class="grand-total">Order Total: ${formatPKRPlain(order.total)}</div>
            </div>
          </div>
        </div>

        <!-- Rider & Customer Sign-Off Footer -->
        <div class="slip-footer">
          <div>Sender: <strong>M.shaies Fragrances (Muhammad Shees)</strong> · Pakistan</div>
          <div>Receiver Signature: ___________________________</div>
        </div>
      </div>`;
    })
    .join("\n");

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Delivery Parcel Slip — M.shaies Fragrances</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
      color: #111;
      background: #fff;
      margin: 0;
      padding: 12px;
    }
    .print-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #181512;
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 14px;
    }
    .print-btn {
      background: #c5a059;
      color: #111;
      border: none;
      padding: 8px 18px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 10pt;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    @media print {
      .print-toolbar { display: none !important; }
      body { padding: 0; }
    }
    .delivery-slip {
      border: 2.5px solid #111;
      border-radius: 10px;
      padding: 16px 18px;
      max-width: 780px;
      margin: 0 auto 20px auto;
      background: #fff;
    }
    .slip-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-tag {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #7c5c22;
      text-transform: uppercase;
    }
    .brand-title {
      font-family: Georgia, serif;
      font-size: 18pt;
      margin: 2px 0;
      letter-spacing: 0.5px;
    }
    .brand-sub { font-size: 8.5pt; color: #444; }
    .order-box {
      text-align: right;
      border: 1.5px solid #111;
      padding: 6px 12px;
      border-radius: 6px;
      background: #faf7f2;
    }
    .order-id-label { font-size: 7.5pt; font-weight: 700; color: #555; letter-spacing: 1px; }
    .order-id-val { font-family: Consolas, monospace; font-size: 14pt; font-weight: 900; color: #111; }
    .order-date { font-size: 8pt; color: #555; }
    .cod-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-radius: 8px;
      border: 2px solid #111;
      margin-bottom: 12px;
    }
    .cod-collect { background: #fff8e6; }
    .cod-prepaid { background: #ecfdf5; }
    .cod-title { font-size: 10.5pt; font-weight: 800; letter-spacing: 0.5px; }
    .cod-sub { font-size: 8.5pt; color: #333; margin-top: 3px; }
    .cod-amount-box {
      text-align: right;
      background: #111;
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      min-width: 155px;
    }
    .cod-amount-label { font-size: 7pt; letter-spacing: 1px; color: #e6c67c; font-weight: 700; }
    .cod-amount-val { font-size: 13.5pt; font-weight: 900; }
    .customer-box {
      border: 2px solid #111;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
      background: #fcfaf6;
    }
    .section-heading {
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #111;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .customer-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 16px;
    }
    .col-span-2 { grid-column: span 2; }
    .field-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #555;
      font-weight: 700;
    }
    .field-val-lg { font-size: 13pt; font-weight: 800; color: #000; margin-top: 1px; }
    .field-val-addr {
      font-size: 12pt;
      font-weight: 700;
      color: #000;
      margin-top: 2px;
      padding: 6px 8px;
      background: #fff;
      border: 1px dashed #666;
      border-radius: 5px;
    }
    .field-val-md { font-size: 11.5pt; font-weight: 800; color: #000; margin-top: 1px; }
    .field-val-sm { font-size: 9.5pt; color: #222; margin-top: 2px; }
    .font-mono { font-family: Consolas, monospace; }
    .items-box {
      border: 1.5px solid #111;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 10px;
    }
    .items-table th {
      background: #181512;
      color: #e6c67c;
      padding: 6px 8px;
      font-size: 8pt;
      text-transform: uppercase;
      border: 1px solid #181512;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 6px;
      border-top: 1px solid #ccc;
    }
    .gift-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #fff8e6;
      border: 1px solid #c5a059;
      border-radius: 6px;
      font-size: 8.5pt;
      font-weight: 700;
    }
    .totals-summary { text-align: right; font-size: 9pt; line-height: 1.5; }
    .grand-total { font-size: 11.5pt; font-weight: 900; margin-top: 2px; }
    .slip-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #888;
      font-size: 8.5pt;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div>
      <strong>M.shaies Courier Delivery Slip Preview</strong> (${list.length} ${list.length === 1 ? "Parcel" : "Parcels"})
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Print Delivery Slip</button>
  </div>
  ${slipsHtml}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  const printWin = window.open("", "_blank", "width=860,height=920");
  if (printWin) {
    printWin.document.open();
    printWin.document.write(fullHtml);
    printWin.document.close();
  }
}
