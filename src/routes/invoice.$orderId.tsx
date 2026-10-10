import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useProductsStore, type Order, type OrderItem } from "@/lib/products-store";
import { formatPKR } from "@/lib/cart-context";
import { getOrderByIdServerFn } from "@/lib/api/orders.server";
import { 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Shield, 
  QrCode, 
  Clock, 
  AlertCircle, 
  MessageCircle, 
  ExternalLink, 
  Loader2,
  Truck,
  Banknote,
  Sparkles,
  Mail,
  Copy,
  Check,
  Award,
  PackageCheck,
  Smartphone,
  CreditCard,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/invoice/$orderId")({
  component: InvoicePage,
});

/**
 * Converts numbers into English words for luxury check/invoice presentation
 */
function numberToWordsPKR(num: number): string {
  if (!num || num <= 0) return "Zero Rupees Only";
  
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n: number): string {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + " ";
    }
    return str.trim();
  }

  let result = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = num;

  if (crore > 0) result += convertGroup(crore) + " Crore ";
  if (lakh > 0) result += convertGroup(lakh) + " Lakh ";
  if (thousand > 0) result += convertGroup(thousand) + " Thousand ";
  if (remaining > 0) result += convertGroup(remaining);

  return `${result.trim()} Pakistani Rupees Only`;
}

function InvoicePage() {
  const { orderId } = Route.useParams();
  const { getOrder } = useProductsStore();

  const localOrder = getOrder(orderId);
  const [serverOrder, setServerOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(!localOrder);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!localOrder && orderId) {
      setLoading(true);
      getOrderByIdServerFn({ data: { orderId } })
        .then((res) => {
          if (res.success && res.order) {
            setServerOrder(res.order as Order);
          }
        })
        .catch((err) => console.warn("Failed to fetch order from server:", err))
        .finally(() => setLoading(false));
    }
  }, [localOrder, orderId]);

  const order = localOrder || serverOrder;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-5 bg-background">
        <div className="size-16 rounded-full bg-pearl border border-gold/40 grid place-items-center mb-5 animate-pulse">
          <Loader2 className="size-8 text-gold-deep animate-spin" />
        </div>
        <h2 className="font-serif text-2xl text-ink font-semibold">Authenticating Official Invoice...</h2>
        <p className="text-muted-foreground mt-2 text-xs tracking-wider uppercase">
          Verifying reference #{orderId} with Maison atelier records
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-5 bg-background">
        <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 grid place-items-center mb-5">
          <AlertCircle className="size-8 text-destructive" />
        </div>
        <h1 className="font-serif text-3xl text-ink">Invoice Not Located</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-sm">
          No active order record exists for reference ID: <strong className="text-ink font-mono">{orderId}</strong>
        </p>
        <Link
          to="/shop"
          className="mt-6 btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest inline-flex items-center gap-2"
        >
          <ArrowLeft className="size-3.5" />
          Explore Fragrance Collection
        </Link>
      </div>
    );
  }

  const isCod = order.paymentMethod === "cod";
  const formattedDate = order.date || new Date().toISOString().split("T")[0];
  const wordsAmount = numberToWordsPKR(order.total);

  return (
    <div className="pt-24 sm:pt-28 pb-20 bg-background min-h-screen print:p-0 print:m-0 print:bg-white print:min-h-0">
      
      {/* Print Specific Stylings */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, footer, .print\\:hidden, #ai-scent-advisor-root {
            display: none !important;
          }
          .invoice-sheet {
            border: 1.5px solid #b8860b !important;
            box-shadow: none !important;
            padding: 24px !important;
            margin: 0 !important;
            max-width: 100% !important;
            background: #ffffff !important;
            border-radius: 0 !important;
          }
          .invoice-watermark {
            opacity: 0.03 !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 print:p-0 print:max-w-none">
        
        {/* Top Action & Control Bar (Hidden on Print) */}
        <div className="print:hidden mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <Link
            to="/shop"
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-gold-deep flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Continue Shopping
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyLink}
              type="button"
              className="px-4 py-2 rounded-full border border-border bg-card text-ink hover:border-gold text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Share Link</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              type="button"
              className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold flex items-center gap-2 shadow-sm"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>

        {/* Dynamic Context Notice 1: Smart Direct Mobile Transfer Pending Verification */}
        {order.paymentStatus === "Verification Required" && (
          <div className="print:hidden mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-sm font-bold text-ink">
                    Payment Verification Underway · Direct Mobile Account
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 border border-amber-500/30">
                    Awaiting Screenshot
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your order <strong className="text-ink">#{order.id}</strong> has been received! Transfer details for <strong className="text-ink">Muhammad Shees</strong> (0332 5568922) are being confirmed by our accounts desk.
                  {order.transactionId ? (
                    <> Your submitted TID is <strong className="font-mono text-ink bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">{order.transactionId}</strong>.</>
                  ) : null}
                  {" "}Please share your payment screenshot on WhatsApp to expedite courier packing.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 pl-8">
              <a
                href={`https://wa.me/923390001829?text=${encodeURIComponent(
                  `Assalam-o-Alaikum! Here is the payment receipt screenshot for M.Shaies Order #${order.id} of ${formatPKR(order.total)} via ${order.paymentMethod.toUpperCase()}.${order.transactionId ? ` TID: ${order.transactionId}` : ''}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <MessageCircle className="size-3.5" />
                Send Screenshot on WhatsApp (+92 339 0001829)
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}

        {/* Dynamic Context Notice 2: Cash on Delivery (COD) Doorstep Ready Notice */}
        {isCod && (
          <div className="print:hidden mb-6 p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 shadow-xs">
            <div className="flex items-start gap-3">
              <Banknote className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-sm font-bold text-ink">
                    Cash on Delivery (COD) Doorstep Packing Confirmed
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-800 border border-emerald-500/30">
                    ₨ 400 Collection Surcharge Included
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your order is booked with <strong className="text-ink">{order.courierName || "TCS Express & Leopards Courier"}</strong>. Please keep exact cash of <strong className="text-ink font-serif text-sm font-bold">{formatPKR(order.total)}</strong> ready for the courier rider upon delivery to <strong className="text-ink">{order.address}, {order.city}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email Notification Status Badge */}
        <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-pearl/60 border border-gold/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-gold-deep" />
            <span>
              {order.email ? (
                <>Official invoice dispatched to <strong className="text-ink">{order.email}</strong></>
              ) : (
                <>Atelier ledger updated · Notification routed to <strong className="text-ink">m.shaiesfragrances@gmail.com</strong></>
              )}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
            ✓ Digital Record Synced
          </span>
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL LUXURY INVOICE SHEET (PRINTS ON A4 PORTRAIT)                     */}
        {/* ========================================================================= */}
        <div className="invoice-sheet relative bg-card text-card-foreground border-2 border-gold/50 rounded-2xl sm:rounded-3xl p-6 sm:p-12 shadow-[var(--shadow-luxe)] overflow-hidden">
          
          {/* Subtle Watermark Monogram */}
          <div 
            aria-hidden="true" 
            className="invoice-watermark absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.02] -z-0"
          >
            <span className="font-serif text-[180px] font-bold tracking-widest text-gold-deep">MSH</span>
          </div>

          <div className="relative z-10 space-y-8">
            
            {/* Header: Maison Crest & Official Reference */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b-2 border-gold/40">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src="/logo-wordmark.png"
                    alt="M.shaies Fragrances"
                    className="h-9 sm:h-11 w-auto object-contain"
                  />
                  <div className="hidden sm:block h-6 w-px bg-gold/40" />
                  <span className="hidden sm:inline-block text-[11px] uppercase tracking-[0.2em] font-serif text-gold-deep font-semibold">
                    Haute Parfumerie
                  </span>
                </div>
                <p className="text-xs font-serif text-ink">M.shaies Luxury Fragrances & Horology Atelier</p>
                <p className="text-[11px] text-muted-foreground">
                  Gulberg III Studio · Lahore, Pakistan · Delivering Nationwide
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  Reg ID: PK-LHR-2026-MSH · Helpline: +92 339 0001829 · m.shaiesfragrances@gmail.com
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pearl border border-gold/50 text-[10px] font-bold text-gold-deep uppercase tracking-[0.2em] mb-2 shadow-xs">
                  <Award className="size-3 text-gold-deep" />
                  Official Tax Invoice
                </div>
                <p className="font-mono text-lg sm:text-xl font-bold text-ink tracking-tight">
                  #{order.id}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Date: <strong className="text-ink font-medium">{formattedDate}</strong>
                </p>
              </div>
            </div>

            {/* 3-Column Logistics & Settlement Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4 border-b border-border/80 text-xs">
              
              {/* Box 1: Billed & Delivered To */}
              <div className="p-4 rounded-xl bg-pearl/40 border border-gold/25 space-y-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-bold flex items-center gap-1 mb-2">
                  <Building2 className="size-3 text-gold-deep" />
                  Billed & Delivered To
                </span>
                <p className="font-serif text-sm font-bold text-ink">{order.customerName}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {order.address}
                </p>
                <p className="text-ink font-semibold">
                  {order.city}, Pakistan {order.postalCode ? `· ${order.postalCode}` : ""}
                </p>
                <p className="text-ink font-mono text-[11px] pt-1">
                  📞 {order.phone}
                </p>
                {order.email && (
                  <p className="text-muted-foreground text-[11px] truncate">
                    ✉️ {order.email}
                  </p>
                )}
              </div>

              {/* Box 2: Dispatch Logistics */}
              <div className="p-4 rounded-xl bg-pearl/40 border border-gold/25 space-y-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-bold flex items-center gap-1 mb-2">
                  <Truck className="size-3 text-gold-deep" />
                  Dispatch Logistics
                </span>
                <p className="font-serif text-sm font-bold text-ink">
                  {order.courierName || (order.city.toLowerCase() === "lahore" ? "Studio Rider Delivery" : "TCS Nationwide Express")}
                </p>
                <p className="text-muted-foreground">
                  Transit Time: <strong className="text-ink">2–4 Business Days</strong>
                </p>
                <p className="text-muted-foreground">
                  Packaging: <strong className="text-ink">Tamper-Proof Carton + Wax Seal</strong>
                </p>
                <div className="pt-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold border border-emerald-500/25">
                    ● Dispatched From Lahore Atelier
                  </span>
                </div>
              </div>

              {/* Box 3: Payment Instrument & Settlement */}
              <div className="p-4 rounded-xl bg-pearl/40 border border-gold/25 space-y-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-bold flex items-center gap-1 mb-2">
                  <CreditCard className="size-3 text-gold-deep" />
                  Payment Instrument
                </span>
                <p className="font-serif text-sm font-bold text-ink uppercase">
                  {isCod ? "Cash on Delivery (COD)" : `${order.paymentMethod.toUpperCase()} Direct`}
                </p>
                
                {/* Dynamic Status Badge */}
                <div className="pt-1">
                  {order.paymentStatus === "Paid" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                      <CheckCircle2 className="size-3" />
                      Paid & Verified
                    </span>
                  ) : order.paymentStatus === "Verification Required" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30">
                      <Clock className="size-3 text-amber-600" />
                      Verification Underway
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 border border-blue-500/30">
                      <Banknote className="size-3 text-blue-600" />
                      Pending Cash Collection
                    </span>
                  )}
                </div>

                {order.transactionId ? (
                  <p className="font-mono text-[11px] text-muted-foreground pt-1.5">
                    TID: <strong className="text-ink">{order.transactionId}</strong>
                  </p>
                ) : null}

                {isCod ? (
                  <p className="text-[11px] text-amber-800 pt-1 font-medium">
                    Collect at Doorstep: <strong>{formatPKR(order.total)}</strong>
                  </p>
                ) : null}
              </div>

            </div>

            {/* Itemized Fragrance Ledger Table */}
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gold/40 bg-pearl/60 text-ink uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-3">Item Description</th>
                      <th className="py-3 px-2 text-center">Volume</th>
                      <th className="py-3 px-2 text-center">Qty</th>
                      <th className="py-3 px-3 text-right">Unit Price</th>
                      <th className="py-3 px-3 text-right">Amount (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {order.items.map((item: OrderItem, idx: number) => (
                      <tr key={idx} className="hover:bg-pearl/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="size-10 rounded-lg object-cover border border-gold/30 shrink-0 print:hidden"
                              />
                            )}
                            <div>
                              <p className="font-serif text-sm font-bold text-ink">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Hand-poured Pure Artisan Fragrance · Small Batch
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-center text-muted-foreground font-mono text-[11px]">
                          {item.volume}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-ink">
                          {item.qty}
                        </td>
                        <td className="py-3.5 px-3 text-right text-muted-foreground font-mono">
                          {formatPKR(item.price)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-serif font-bold text-ink text-sm">
                          {formatPKR(item.price * item.qty)}
                        </td>
                      </tr>
                    ))}

                    {/* Complimentary Discovery Gift Line Item */}
                    <tr className="bg-emerald-500/5">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-serif text-xs font-bold text-emerald-800">
                              Complimentary 3ml Discovery Flacon
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Royal Maison Welcome Gift · Hand-poured Pure Attar Sampler
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-muted-foreground font-mono text-[11px]">
                        3ml Vial
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-emerald-700">1</td>
                      <td className="py-3 px-3 text-right text-emerald-600 font-bold uppercase text-[10px]">
                        GIFT
                      </td>
                      <td className="py-3 px-3 text-right font-serif font-bold text-emerald-700 text-sm">
                        ₨ 0
                      </td>
                    </tr>

                    {/* Gift Wrapped Line Item if applicable */}
                    {order.isGiftWrapped && (
                      <tr className="bg-pearl/30">
                        <td className="py-3 px-3">
                          <p className="font-serif text-xs font-bold text-ink">
                            Luxury Maison Gift Wrapping & Custom Greeting
                          </p>
                          {order.giftMessage && (
                            <p className="text-[10px] text-muted-foreground italic">
                              "{order.giftMessage}"
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center text-muted-foreground text-[10px]">—</td>
                        <td className="py-3 px-2 text-center font-bold text-ink">1</td>
                        <td className="py-3 px-3 text-right text-muted-foreground font-mono">₨ 250</td>
                        <td className="py-3 px-3 text-right font-serif font-bold text-ink text-sm">₨ 250</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Ledger & Surcharge Calculation */}
            <div className="pt-2 pb-6 border-b-2 border-gold/40">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                
                {/* Left: Words Summary & Verification Notes */}
                <div className="space-y-2 text-xs max-w-sm">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
                    Amount in Words:
                  </span>
                  <p className="font-serif text-xs italic text-ink font-medium leading-relaxed bg-pearl/60 p-2.5 rounded-xl border border-gold/30">
                    "{wordsAmount}"
                  </p>
                  {isCod && (
                    <p className="text-[11px] text-amber-800 font-medium">
                      * Cash on Delivery courier surcharge of <strong>₨ 400</strong> is itemized and accounted for in the delivery fee.
                    </p>
                  )}
                </div>

                {/* Right: Calculations Matrix */}
                <div className="w-full sm:w-80 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-serif font-medium text-ink">{formatPKR(order.subtotal)}</span>
                  </div>

                  {order.discountAmount && order.discountAmount > 0 ? (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Promo Discount ({order.discountCode || "COUPON"}):</span>
                      <span className="font-serif">- {formatPKR(order.discountAmount)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-muted-foreground">
                    <span>Courier Delivery Fee:</span>
                    <span className="font-serif font-medium text-ink">
                      {order.shipping === 0 ? "FREE" : formatPKR(isCod ? Math.max(0, order.shipping - 400) : order.shipping)}
                    </span>
                  </div>

                  {/* Explicit Cash on Delivery Line Item */}
                  {isCod && (
                    <div className="flex justify-between text-amber-800 font-medium bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/25">
                      <span>COD Courier Collection Surcharge:</span>
                      <span className="font-serif font-bold">+ ₨ 400</span>
                    </div>
                  )}

                  {!isCod && (
                    <div className="flex justify-between text-emerald-700 text-[11px]">
                      <span>Online Payment Advantage:</span>
                      <span className="font-semibold">COD Surcharge Waived (₨ 0)</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-3 border-t-2 border-gold/40 text-base">
                    <span className="font-serif font-bold text-ink text-base">Grand Total Payable:</span>
                    <span className="font-serif text-2xl font-bold text-gold-deep">
                      {formatPKR(order.total)}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Authenticity Guarantee, Digital Wax Seal & QR Verification */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left text-xs">
              
              {/* Authenticity Badges */}
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-full border-2 border-gold/60 bg-pearl grid place-items-center shrink-0 shadow-xs">
                  <Shield className="size-6 text-gold-deep" />
                </div>
                <div>
                  <p className="font-serif text-sm text-ink font-bold">100% Authentic Maison Craft</p>
                  <p className="text-[11px] text-muted-foreground">
                    Small-batch botanical attars & pure agarwood extrait de parfums.
                  </p>
                  <p className="text-[10px] text-gold-deep font-semibold">
                    7-Day Sealed Exchange Protection Guarantee
                  </p>
                </div>
              </div>

              {/* Digital Seal & QR Code */}
              <div className="flex items-center gap-4 text-center sm:text-right">
                <div className="hidden sm:block">
                  <p className="text-[10px] uppercase tracking-widest text-gold-deep font-bold">
                    Official Studio Seal
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    PK-LAHORE-STUDIO-VERIFIED
                  </p>
                  <p className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                    AUTHENTICITY CERTIFIED
                  </p>
                </div>

                <div className="size-14 rounded-2xl bg-pearl border-2 border-gold/40 grid place-items-center shrink-0 shadow-xs">
                  <QrCode className="size-8 text-ink/80" />
                </div>
              </div>

            </div>

            {/* Atelier Sign-off & Support Notice */}
            <div className="pt-4 border-t border-border/60 text-center text-[11px] text-muted-foreground space-y-1">
              <p>
                Thank you for choosing <strong>M.shaies Haute Parfumerie</strong>. Every vial is hand-poured and inspected with artisanal devotion.
              </p>
              <p>
                For immediate nationwide tracking, bulk gifting, or custom bespoke blends, contact WhatsApp concierge:{" "}
                <a
                  href="https://wa.me/923390001829"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline"
                >
                  +92 339 0001829
                </a>
                {" "}or email{" "}
                <a
                  href="mailto:m.shaiesfragrances@gmail.com"
                  className="text-ink font-semibold hover:underline"
                >
                  m.shaiesfragrances@gmail.com
                </a>
              </p>
            </div>

          </div>
        </div>

        {/* Back Link for Non-Print */}
        <div className="print:hidden mt-8 text-center">
          <Link
            to="/shop"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-gold-deep inline-flex items-center gap-2 transition-colors font-semibold"
          >
            <ArrowLeft className="size-3.5" />
            Return to Haute Parfumerie Catalog
          </Link>
        </div>

      </div>
    </div>
  );
}
