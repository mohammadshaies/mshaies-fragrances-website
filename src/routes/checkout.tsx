import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCart, formatPKR } from "@/lib/cart-context";
import { useProductsStore } from "@/lib/products-store";
import { useState } from "react";
import { 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  ArrowRight,
  X
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Secure Checkout & Payment — M.shaies Fragrances" },
      { name: "description", content: "Complete your order with Cash on Delivery (COD), JazzCash, Easypaisa, NayaPay, or Visa/Mastercard. Nationwide delivery in Pakistan." }
    ]
  }),
  component: CheckoutPage,
});

const CITIES = [
  "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", 
  "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", 
  "Hyderabad", "Bahawalpur", "Sargodha", "Abbottabad", "Other"
];

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total: subtotal, clear, add, remove, setQty } = useCart();
  const { placeOrder, products, validateCoupon, settings } = useProductsStore();

  // Customer Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lahore");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");

  // Shipping Method State ("standard" | "express" | "lahoreLocal")
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express" | "lahoreLocal">("standard");

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "jazzcash" | "easypaisa" | "nayapay" | "card">("cod");
  const [transactionId, setTransactionId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    freeShipping: boolean;
    description: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  // Dynamic Shipping Calculation from Store Settings
  const freeThreshold = settings?.freeShippingThreshold ?? 5000;
  const isFreeEligible = (settings?.freeShippingEnabled !== false && subtotal >= freeThreshold) || appliedCoupon?.freeShipping;

  let baseShippingRate = settings?.standardShippingFee ?? 250;
  if (shippingMethod === "express" && settings?.expressShippingActive !== false) {
    baseShippingRate = settings?.expressShippingFee ?? 450;
  } else if (shippingMethod === "lahoreLocal" && city.toLowerCase() === "lahore" && settings?.lahoreLocalActive !== false) {
    baseShippingRate = settings?.lahoreLocalFee ?? 150;
  }

  const shippingFee = items.length === 0 
    ? 0 
    : isFreeEligible 
      ? (shippingMethod === "express" ? Math.max(0, (settings?.expressShippingFee ?? 450) - (settings?.standardShippingFee ?? 250)) : 0)
      : baseShippingRate;

  // COD Handling Surcharge
  const codSurcharge = (paymentMethod === "cod" && settings?.codFee) ? settings.codFee : 0;
  
  // Calculate Final Total
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee + codSurcharge);

  // Recommended Fragrances (Items not in current cart)
  const recommendedItems = products
    .filter((p) => !items.some((i) => i.id === p.id) && p.stock > 0)
    .slice(0, 3);

  // Apply Coupon Handler
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }

    const result = validateCoupon(couponInput, subtotal);
    if (result.valid && result.coupon) {
      setAppliedCoupon({
        code: result.coupon.code,
        discountAmount: result.discountAmount,
        freeShipping: !!result.freeShipping,
        description: result.coupon.description,
      });
      toast.success(result.message);
      setCouponInput("");
    } else {
      toast.error(result.message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info("Coupon removed.");
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error("Your cart is empty. Please add a fragrance first.");
      return;
    }

    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("Please fill in your name, contact phone, and delivery address.");
      return;
    }

    if ((paymentMethod === "jazzcash" || paymentMethod === "easypaisa" || paymentMethod === "nayapay") && !transactionId.trim()) {
      toast.error("Please enter the Transaction ID (TID) from your payment app.");
      return;
    }

    setLoading(true);

    try {
      const orderItems = items.map((i) => {
        const prod = products.find((p) => p.id === i.id);
        return {
          productId: i.id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          volume: prod?.volume || "12ml Pure Attar",
          image: prod?.image || "/product-box.jpg",
        };
      });

      const orderId = await placeOrder({
        customerName: name,
        email,
        phone,
        address,
        city,
        postalCode,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "Pending COD" : "Verification Required",
        transactionId: transactionId || undefined,
        items: orderItems,
        subtotal,
        discountCode: appliedCoupon?.code,
        discountAmount,
        shipping: shippingFee,
        total: finalTotal,
        orderStatus: "Confirmed",
      });

      clear();
      toast.success("Order confirmed successfully! Generating official invoice...");
      navigate({ to: "/invoice/$orderId", params: { orderId } });
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm order. Please check details and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-4 bg-background">
        <div className="size-20 rounded-full bg-pearl border border-gold/40 grid place-items-center mb-6">
          <Tag className="size-8 text-gold-deep" />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink">Your Shopping Bag is Empty</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          Select signature pure attars, spray perfumes, or luxury timepieces from our collection to begin.
        </p>
        <Link
          to="/shop"
          className="mt-8 btn-gold btn-gold-hover px-8 py-3.5 rounded-full text-xs uppercase tracking-widest inline-flex items-center gap-2"
        >
          Explore Collection
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-28 pb-12 sm:pb-20 bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-gold-deep flex items-center gap-2 transition-colors mb-2"
            >
              <ArrowLeft className="size-3.5" />
              Continue Shopping
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight">
              Checkout & Payment
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="size-4 text-gold-deep" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Mobile-Only Quick Cart Summary Accordion */}
        <div className="lg:hidden mb-6 rounded-2xl border border-gold/40 bg-card overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowMobileSummary(!showMobileSummary)}
            className="w-full p-4 bg-pearl/60 flex items-center justify-between text-xs font-semibold text-ink"
          >
            <div className="flex items-center gap-2">
              <span className="gold-gradient-text font-bold uppercase tracking-wider">Order Summary</span>
              <span className="text-[11px] text-muted-foreground">({items.reduce((a, b) => a + b.qty, 0)} items)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-ink">{formatPKR(finalTotal)}</span>
              <span className="text-gold-deep text-xs font-bold">{showMobileSummary ? "▲" : "▼"}</span>
            </div>
          </button>

          {showMobileSummary && (
            <div className="p-4 border-t border-border/60 divide-y divide-border/40 text-xs bg-background">
              {items.map((i) => (
                <div key={i.id} className="py-2 flex items-center justify-between">
                  <span className="truncate max-w-[55%] sm:max-w-[200px]">{i.name} (x{i.qty})</span>
                  <span className="font-semibold text-ink">{formatPKR(i.price * i.qty)}</span>
                </div>
              ))}
              <div className="pt-2 flex justify-between text-muted-foreground text-[11px]">
                <span>Nationwide Express:</span>
                <span className="text-emerald-600 font-bold">{shippingFee === 0 ? "FREE" : formatPKR(shippingFee)}</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-12 items-start">
          
          {/* LEFT: Customer Address & Payment Gateways (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Section 1: Shipping Details */}
            <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                <Truck className="size-5 text-gold-deep" />
                <h2 className="font-serif text-xl text-ink font-semibold">1. Delivery Address</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="e.g. Tariq Mehmood"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                    Phone (WhatsApp Active) *
                  </label>
                  <input
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                    Complete Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="street-address"
                    placeholder="House/Apartment #, Street, Block, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                    City *
                  </label>
                  <select
                    value={city}
                    autoComplete="address-level2"
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink focus:border-gold focus:outline-none"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                    Postal Code (Optional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="e.g. 54000"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Choose Delivery Method */}
            <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <Truck className="size-5 text-gold-deep" />
                  <h2 className="font-serif text-xl text-ink font-semibold">2. Choose Delivery Method</h2>
                </div>
                {isFreeEligible && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/40">
                    Free Shipping Unlocked ✨
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Standard Courier */}
                <button
                  type="button"
                  onClick={() => setShippingMethod("standard")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                    shippingMethod === "standard"
                      ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                      : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink">Standard Courier Delivery</p>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      {settings?.shippingEstimateDays || "2-4 Business Days"} · {settings?.courierPartners || "TCS & Leopards"}
                    </p>
                  </div>
                  <span className="font-serif text-xs font-bold text-ink shrink-0 ml-2">
                    {isFreeEligible ? <span className="text-emerald-600 uppercase">FREE</span> : formatPKR(settings?.standardShippingFee ?? 250)}
                  </span>
                </button>

                {/* Express Flight Dispatch */}
                {settings?.expressShippingActive !== false && (
                  <button
                    type="button"
                    onClick={() => setShippingMethod("express")}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                      shippingMethod === "express"
                        ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                        : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink">VIP Express Flight Dispatch</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 font-bold uppercase">Fast</span>
                      </div>
                      <p className="text-[11px] font-normal text-muted-foreground">
                        24-48 Hours Express Air Dispatch
                      </p>
                    </div>
                    <span className="font-serif text-xs font-bold text-gold-deep shrink-0 ml-2">
                      {isFreeEligible 
                        ? formatPKR(Math.max(0, (settings?.expressShippingFee ?? 450) - (settings?.standardShippingFee ?? 250)))
                        : formatPKR(settings?.expressShippingFee ?? 450)
                      }
                    </span>
                  </button>
                )}

                {/* Lahore Local Studio Delivery */}
                {city.toLowerCase() === "lahore" && settings?.lahoreLocalActive !== false && (
                  <button
                    type="button"
                    onClick={() => setShippingMethod("lahoreLocal")}
                    className={`sm:col-span-2 p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                      shippingMethod === "lahoreLocal"
                        ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                        : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink">Lahore Same-Day Rider Delivery</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-gold/30 text-ink font-bold uppercase">Local Studio</span>
                      </div>
                      <p className="text-[11px] font-normal text-muted-foreground">
                        Direct bike courier from Gulberg III Studio
                      </p>
                    </div>
                    <span className="font-serif text-xs font-bold text-ink shrink-0 ml-2">
                      {isFreeEligible ? <span className="text-emerald-600 uppercase">FREE</span> : formatPKR(settings?.lahoreLocalFee ?? 150)}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Pakistani Payment Gateways */}
            <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                <CreditCard className="size-5 text-gold-deep" />
                <h2 className="font-serif text-xl text-ink font-semibold">3. Select Payment Method</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between ${
                    paymentMethod === "cod"
                      ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                      : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Banknote className="size-4 text-emerald-600" />
                      <span className="text-sm">Cash on Delivery (COD)</span>
                    </div>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      Pay cash at doorstep anywhere in Pakistan
                    </p>
                  </div>
                  {paymentMethod === "cod" && <CheckCircle2 className="size-4 text-gold-deep shrink-0" />}
                </button>

                {/* JazzCash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("jazzcash")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between ${
                    paymentMethod === "jazzcash"
                      ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                      : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-[#d81e05]" />
                      <span className="text-sm">JazzCash</span>
                    </div>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      Direct Wallet or Till Payment
                    </p>
                  </div>
                  {paymentMethod === "jazzcash" && <CheckCircle2 className="size-4 text-gold-deep shrink-0" />}
                </button>

                {/* Easypaisa */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("easypaisa")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between ${
                    paymentMethod === "easypaisa"
                      ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                      : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-[#00a859]" />
                      <span className="text-sm">Easypaisa</span>
                    </div>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      Instant mobile wallet transfer
                    </p>
                  </div>
                  {paymentMethod === "easypaisa" && <CheckCircle2 className="size-4 text-gold-deep shrink-0" />}
                </button>

                {/* NayaPay */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("nayapay")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between ${
                    paymentMethod === "nayapay"
                      ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                      : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-[#ff5f00]" />
                      <span className="text-sm">NayaPay</span>
                    </div>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      Send to @mshaies NayaPay ID
                    </p>
                  </div>
                  {paymentMethod === "nayapay" && <CheckCircle2 className="size-4 text-gold-deep shrink-0" />}
                </button>

                {/* Debit / Credit Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between sm:col-span-2 ${
                    paymentMethod === "card"
                      ? "border-gold bg-pearl text-ink font-bold shadow-sm ring-1 ring-gold"
                      : "border-border bg-card text-muted-foreground hover:text-ink hover:border-gold/50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-ink" />
                      <span className="text-sm">Visa / Mastercard (Credit or Debit)</span>
                    </div>
                    <p className="text-[11px] font-normal text-muted-foreground">
                      Secure Pakistani & International cards accepted
                    </p>
                  </div>
                  {paymentMethod === "card" && <CheckCircle2 className="size-4 text-gold-deep shrink-0" />}
                </button>
              </div>

              {/* Dynamic Gateway Instructions */}
              {paymentMethod === "jazzcash" && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-ink">JazzCash Transfer Instructions:</p>
                    <p className="text-muted-foreground">1. Send <strong>{formatPKR(finalTotal)}</strong> to Account: <strong>0300 1234567</strong> (Title: M.shaies Fragrances) or Till ID: <strong>89210</strong>.</p>
                    <p className="text-muted-foreground">2. Enter the Transaction ID (TID) below to generate your confirmed invoice.</p>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter 12-digit JazzCash TID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink font-mono focus:border-gold focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === "easypaisa" && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-ink">Easypaisa Transfer Instructions:</p>
                    <p className="text-muted-foreground">1. Send <strong>{formatPKR(finalTotal)}</strong> to Easypaisa Account: <strong>0345 7654321</strong> (Title: M.shaies Maison).</p>
                    <p className="text-muted-foreground">2. Enter your Easypaisa TID below.</p>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter Easypaisa TID (e.g. 10928374)"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink font-mono focus:border-gold focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === "nayapay" && (
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 space-y-3">
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-ink">NayaPay Transfer Instructions:</p>
                    <p className="text-muted-foreground">Send <strong>{formatPKR(finalTotal)}</strong> to NayaPay ID: <strong>@mshaies</strong> and enter your reference ID below.</p>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter NayaPay Ref ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink font-mono focus:border-gold focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="p-5 rounded-2xl border border-border bg-pearl/40 space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      autoComplete="cc-name"
                      placeholder="Name on card"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="XXXX XXXX XXXX XXXX"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink font-mono focus:border-gold focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="12/28"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink font-mono focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={4}
                        placeholder="•••"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base sm:text-sm text-ink font-mono focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Editable Cart, Coupon Generator Box & Order Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28 lg:self-start">
            
            {/* Order Items & Editable Cart */}
            <div className="p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="font-serif text-lg text-ink font-semibold">Your Items ({items.reduce((a, b) => a + b.qty, 0)})</h2>
                <span className="text-xs text-muted-foreground">Editable In-Line</span>
              </div>

              {/* Items List with Inline Quantity Modifier */}
              <div className="divide-y divide-border/60 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => {
                  const prod = products.find((p) => p.id === item.id);
                  return (
                    <div key={item.id} className="py-3 flex items-center gap-3">
                      <img
                        src={prod?.image || "/product-box.jpg"}
                        alt={item.name}
                        className="size-12 rounded-xl object-contain bg-pearl border border-border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-semibold text-ink truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{prod?.volume || "12ml Pure Attar"}</p>
                        <p className="text-xs font-semibold text-gold-deep mt-0.5">{formatPKR(item.price)}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-pearl border border-border/80 rounded-full px-2 py-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQty(item.id, item.qty - 1)}
                          className="size-5 grid place-items-center text-muted-foreground hover:text-ink rounded-full"
                          title="Decrease quantity"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="text-xs font-bold text-ink min-w-4 text-center">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => add({ id: item.id, name: item.name, price: item.price })}
                          className="size-5 grid place-items-center text-muted-foreground hover:text-ink rounded-full"
                          title="Increase quantity"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="text-muted-foreground hover:text-destructive p-1 shrink-0 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Box */}
              <div className="pt-2 border-t border-border/80">
                <label className="block text-[11px] uppercase tracking-wider text-ink font-semibold mb-2">
                  Have a Promo / Coupon Code?
                </label>

                {!appliedCoupon ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-gold-deep pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Enter coupon (e.g. LUXE15)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-background text-ink uppercase font-mono focus:border-gold focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 rounded-xl bg-gold text-ink text-xs uppercase tracking-wider font-bold hover:scale-[1.02] transition-transform shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-ink">
                          Code <span className="font-mono text-emerald-600">{appliedCoupon.code}</span> Applied!
                        </p>
                        <p className="text-[10px] text-muted-foreground">{appliedCoupon.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="size-6 rounded-full border border-border grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title="Remove coupon"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2 pt-3 border-t border-border text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-ink">{formatPKR(subtotal)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>- {formatPKR(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>
                    {shippingMethod === "express" 
                      ? "VIP Express Air Dispatch" 
                      : shippingMethod === "lahoreLocal" 
                        ? "Lahore Same-Day Rider" 
                        : "Nationwide Courier Delivery"}
                  </span>
                  <span>{shippingFee === 0 ? <strong className="text-emerald-600 uppercase text-[11px]">Free Shipping</strong> : formatPKR(shippingFee)}</span>
                </div>

                {codSurcharge > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>COD Handling Surcharge</span>
                    <span className="font-semibold text-ink">{formatPKR(codSurcharge)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-border flex justify-between text-base font-serif font-bold text-ink">
                  <span>Total Amount</span>
                  <span className="text-lg text-gold-deep">{formatPKR(finalTotal)}</span>
                </div>
              </div>

              {/* Complete Order Button */}
              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="w-full btn-gold btn-gold-hover py-4 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="size-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                    Processing Order & Stock...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span className="inline-flex flex-wrap items-center justify-center gap-1 text-center">
                      <span>Confirm &amp; Place Order</span>
                      <span className="opacity-90 font-medium">({formatPKR(finalTotal)})</span>
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Recommended Pairings / Frequently Bought Together */}
            {recommendedItems.length > 0 && (
              <div className="p-5 rounded-3xl bg-pearl/40 border border-gold/30 shadow-xs space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gold-deep font-bold">
                  <Sparkles className="size-3.5" />
                  Recommended Pairings
                </div>

                <div className="space-y-2.5">
                  {recommendedItems.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <img
                        src={rec.image}
                        alt={rec.name}
                        className="size-10 rounded-lg object-contain bg-pearl border border-border shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-xs font-semibold text-ink truncate">{rec.name}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.volume} · {formatPKR(rec.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          add({ id: rec.id, name: rec.name, price: rec.price });
                          toast.success(`Added ${rec.name} to order!`);
                        }}
                        className="px-2.5 py-1 rounded-full bg-gold text-ink font-bold text-[10px] uppercase tracking-wider hover:scale-105 transition-transform flex items-center gap-1 shrink-0 shadow-sm"
                      >
                        <Plus className="size-2.5" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </form>

      </div>
    </div>
  );
}
