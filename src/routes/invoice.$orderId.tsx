import { createFileRoute, Link } from "@tanstack/react-router";
import { useProductsStore } from "@/lib/products-store";
import { formatPKR } from "@/lib/cart-context";
import { 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Shield, 
  QrCode, 
  Download,
  Clock,
  AlertCircle,
  MessageCircle,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/invoice/$orderId")({
  component: InvoicePage,
});

function InvoicePage() {
  const { orderId } = Route.useParams();
  const { getOrder } = useProductsStore();

  const order = getOrder(orderId);

  const handlePrint = () => {
    window.print();
  };

  if (!order) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-5">
        <h1 className="font-serif text-3xl text-ink">Invoice Not Found</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-sm">
          No invoice records found for reference ID: <strong>{orderId}</strong>
        </p>
        <Link
          to="/shop"
          className="mt-6 btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest inline-flex items-center gap-2"
        >
          <ArrowLeft className="size-3.5" />
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-background min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="print:hidden mb-6 flex items-center justify-between gap-4">
          <Link
            to="/shop"
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-gold-deep flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Continue Shopping
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="btn-gold btn-gold-hover px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold flex items-center gap-2 shadow-md"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Dynamic Verification Required Alert for Online Payments */}
        {order.paymentStatus === "Verification Required" && (
          <div className="print:hidden mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Payment Verification in Progress · Direct Mobile Account
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your order <strong className="text-ink">#{order.id}</strong> has been received! Our team is verifying the transfer to <strong className="text-ink">Muhammad Shees</strong> (0332 5568922).
                  {order.transactionId ? (
                    <> Your submitted TID is <strong className="font-mono text-ink bg-amber-500/20 px-1.5 py-0.5 rounded">{order.transactionId}</strong>.</>
                  ) : (
                    <> Please share your payment screenshot on WhatsApp to expedite courier packing.</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 pl-8">
              <a
                href={`https://wa.me/923325568922?text=${encodeURIComponent(
                  `Assalam-o-Alaikum Muhammad Shees! Here is the payment receipt screenshot for M.Shaies Order #${order.id} of ${formatPKR(order.total)} via ${order.paymentMethod.toUpperCase()}.${order.transactionId ? ` TID: ${order.transactionId}` : ''}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <MessageCircle className="size-3.5" />
                Send Receipt Screenshot to Muhammad Shees (+92 332 5568922)
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}

        {/* Official Printable Invoice Sheet */}
        <div className="bg-card text-card-foreground border border-gold/40 rounded-2xl sm:rounded-3xl p-5 sm:p-12 shadow-[var(--shadow-luxe)] print:border-none print:shadow-none print:p-0 print:m-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-gold/30">
            <div>
              <img
                src="/logo-wordmark.png"
                alt="M.shaies Fragrances"
                className="h-10 w-auto object-contain mb-2"
              />
              <p className="text-xs text-muted-foreground">Maison de Parfum · Pakistan</p>
              <p className="text-[11px] text-muted-foreground">Delivering Nationwide Across Pakistan · info@mshaies.com</p>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] uppercase tracking-[0.25em] text-gold-deep font-semibold px-3 py-1 rounded-full bg-pearl border border-gold/30 inline-block mb-2">
                Official Tax Invoice
              </span>
              <p className="font-mono text-base sm:text-lg font-bold text-ink break-all">{order.id}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Date: {order.date}</p>
            </div>
          </div>

          {/* Customer & Shipping Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-border/80 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-semibold mb-2">
                Billed & Shipped To:
              </p>
              <p className="font-semibold text-sm text-ink">{order.customerName}</p>
              <p className="text-muted-foreground mt-1">{order.address}</p>
              <p className="text-muted-foreground">{order.city}, Pakistan {order.postalCode || ""}</p>
              <p className="text-ink font-medium mt-1">Phone: {order.phone}</p>
              {order.email && <p className="text-muted-foreground">Email: {order.email}</p>}
            </div>

            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-semibold mb-2">
                Payment Details:
              </p>
              <p className="font-semibold text-sm uppercase text-ink">
                {order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : order.paymentMethod === "jazzcash"
                  ? "JazzCash Transfer"
                  : order.paymentMethod === "easypaisa"
                  ? "Easypaisa Transfer"
                  : order.paymentMethod === "nayapay"
                  ? "NayaPay Transfer"
                  : "Debit / Credit Card"}
              </p>
              {order.paymentStatus === "Paid" ? (
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                  <CheckCircle2 className="size-3" />
                  Status: Paid & Verified
                </div>
              ) : order.paymentStatus === "Verification Required" ? (
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/30">
                  <Clock className="size-3 text-amber-600" />
                  Status: Verification In Progress
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 border border-blue-500/30">
                  <CheckCircle2 className="size-3 text-blue-600" />
                  Status: Pending COD
                </div>
              )}
              {order.transactionId && (
                <p className="font-mono text-[11px] text-muted-foreground mt-1.5">
                  TID: <span className="font-semibold text-ink">{order.transactionId}</span>
                </p>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-6 sm:py-8 border-b border-border/80">
            {/* Desktop Table & Print */}
            <div className="hidden sm:block print:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Item Description</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Unit Price</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="py-3">
                      <td className="py-3.5 pr-4">
                        <p className="font-serif text-sm font-semibold text-ink">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {item.volume}
                        </p>
                      </td>
                      <td className="py-3.5 text-center font-medium">{item.qty}</td>
                      <td className="py-3.5 text-right text-muted-foreground">
                        {formatPKR(item.price)}
                      </td>
                      <td className="py-3.5 text-right font-serif font-semibold text-ink">
                        {formatPKR(item.price * item.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Items List */}
            <div className="sm:hidden print:hidden space-y-2.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border/60 bg-pearl/30 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-sm font-semibold text-ink truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {item.volume} · Qty: {item.qty}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatPKR(item.price)} each
                    </p>
                  </div>
                  <p className="font-serif font-bold text-ink shrink-0">
                    {formatPKR(item.price * item.qty)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="pt-6 pb-8 border-b border-border/80 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span className="font-serif font-medium text-ink">{formatPKR(order.subtotal)}</span>
            </div>
            {order.discountAmount && order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Promotional Discount ({order.discountCode || "COUPON"}):</span>
                <span className="font-serif font-medium">- {formatPKR(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Nationwide Delivery {order.paymentMethod === "cod" ? "(incl. ₨ 400 COD Surcharge)" : ""}:</span>
              <span className="font-serif font-medium text-ink">
                {order.shipping === 0 ? "FREE" : formatPKR(order.shipping)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-4 border-t border-border text-sm">
              <span className="font-serif text-base font-bold text-ink">Grand Total:</span>
              <span className="font-serif text-xl sm:text-2xl font-bold text-gold-deep">
                {formatPKR(order.total)}
              </span>
            </div>
          </div>

          {/* Authenticity Seal & Footer */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full border border-gold/40 bg-pearl grid place-items-center shrink-0">
                <Shield className="size-6 text-gold-deep" />
              </div>
              <div>
                <p className="font-serif text-sm text-ink font-semibold">Authentic Maison Craft</p>
                <p className="text-[10px]">100% Pure Attar Oils & Hand-Poured Fragrances</p>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-3 text-center sm:text-right">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold-deep font-semibold">Verification Seal</p>
                <p className="font-mono text-[10px]">VERIFIED-PK-LAHOR</p>
              </div>
              <div className="size-12 rounded-xl bg-pearl border border-border grid place-items-center shrink-0">
                <QrCode className="size-7 text-ink/70" />
              </div>
            </div>
          </div>
        </div>

        {/* Post-order notice */}
        <div className="print:hidden mt-8 text-center text-xs text-muted-foreground">
          <p>A copy of this invoice has been stored in the Maison records.</p>
          <p className="mt-1">
            For shipping updates or order modifications, contact WhatsApp concierge at{" "}
            <a
              href="https://wa.me/923325568922"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-1"
            >
              +92 332 5568922 ↗
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
