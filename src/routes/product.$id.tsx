import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProductsStore, DEFAULT_FLACON_SIZES, getCustomSizeDetails, type FlaconSizeOption } from "@/lib/products-store";
import { useCart, formatPKR } from "@/lib/cart-context";
import { trackViewContent } from "@/lib/pixel-tracking";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Plus, 
  Minus, 
  AlertCircle, 
  ArrowLeft, 
  Flame, 
  Check,
  Star,
  ThumbsUp,
  MessageSquarePlus,
  CheckCircle2,
  User,
  PenLine,
  Clock,
  Wind,
  Gift,
  Layers,
  Sun,
  Snowflake,
  Award,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { PromotionalBanner } from "@/components/PromotionalBanner";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { products, settings, addReview, voteHelpful, getProductReviews, getProductRating } = useProductsStore();
  const { add, setOpen } = useCart();
  const navigate = useNavigate();

  const product = products.find((p) => p.id === id);

  // Track product view for Meta Pixel & Google Analytics (ViewContent / view_item)
  useEffect(() => {
    if (product) {
      trackViewContent(product);
    }
  }, [product?.id]);

  // Dynamic Flacon Size Options from Store Settings & Product Customization
  const allStoreSizes = (settings?.flaconSizes && settings.flaconSizes.length > 0)
    ? settings.flaconSizes
    : DEFAULT_FLACON_SIZES;

  // Filter or generate available sizes for this product (supports custom ml)
  const activeSizeOptions: FlaconSizeOption[] = useMemo(() => {
    if (product?.availableSizes && Array.isArray(product.availableSizes)) {
      if (product.availableSizes.length === 0) return [];

      return product.availableSizes.map((sizeName) => {
        const found = allStoreSizes.find(
          (opt) =>
            opt.label.toLowerCase() === sizeName.toLowerCase() ||
            opt.id.toLowerCase() === sizeName.toLowerCase() ||
            opt.ml.toLowerCase() === sizeName.toLowerCase()
        );
        if (found) return found;

        const details = getCustomSizeDetails(sizeName);
        return {
          id: sizeName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          label: sizeName,
          ml: sizeName,
          sub: details.sub,
          multiplier: details.multiplier,
          isEnabled: true,
        };
      });
    }

    return allStoreSizes.filter((opt) => opt.isEnabled);
  }, [product?.availableSizes, allStoreSizes]);

  const [selectedVolume, setSelectedVolume] = useState(() => {
    return activeSizeOptions[0]?.label || "12ml";
  });

  // Keep selectedVolume valid if available sizes change
  useEffect(() => {
    if (activeSizeOptions.length > 0 && !activeSizeOptions.some((o) => o.label === selectedVolume)) {
      setSelectedVolume(activeSizeOptions[0].label);
    }
  }, [activeSizeOptions, selectedVolume]);
  const [qty, setQty] = useState(1);
  const [addGiftWrap, setAddGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  // Multi-Image Gallery State
  const gallery = (product?.images && product.images.length > 0)
    ? product.images
    : (product ? [product.image] : []);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const currentImage = gallery[activeImageIndex] || product?.image || "/product-box.jpg";

  const layeringProduct = product?.layeringPairId 
    ? products.find((p) => p.id === product.layeringPairId) 
    : null;

  // Reviews state
  const productReviews = getProductReviews(product?.id || "");
  const ratingInfo = getProductRating(product?.id || "");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedFilterRating, setSelectedFilterRating] = useState<number | "all">("all");
  
  // Review form inputs
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState("");
  const [authorCity, setAuthorCity] = useState("Lahore");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!authorName.trim() || !reviewComment.trim() || !reviewTitle.trim()) {
      toast.error("Please fill in your name, title, and review comments.");
      return;
    }
    setSubmittingReview(true);
    setTimeout(() => {
      addReview({
        productId: product.id,
        author: authorName.trim(),
        city: authorCity.trim() || "Pakistan",
        rating: newRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
        verified: true,
      });
      setAuthorName("");
      setReviewTitle("");
      setReviewComment("");
      setNewRating(5);
      setShowReviewForm(false);
      setSubmittingReview(false);
      toast.success("Thank you! Your verified review has been published.");
    }, 350);
  };

  if (!product) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex flex-col items-center justify-center text-center px-5">
        <h1 className="font-serif text-3xl text-ink">Fragrance Not Found</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          The requested perfume does not exist in our catalog.
        </p>
        <Link
          to="/shop"
          className="mt-6 btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-widest inline-flex items-center gap-2"
        >
          <ArrowLeft className="size-3.5" />
          Back to Collection
        </Link>
      </div>
    );
  }

  // Calculate price dynamically from selected size option
  const currentSizeOption = activeSizeOptions.find(
    (o) => o.label === selectedVolume || o.id === selectedVolume || o.ml === selectedVolume
  ) || activeSizeOptions[0];

  const calculatedPrice = currentSizeOption
    ? Math.round(product.price * (currentSizeOption.multiplier || 1.0))
    : product.price;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < qty; i++) {
      add({
        id: `${product.id}-${selectedVolume}`,
        name: `${product.name} (${selectedVolume})`,
        price: calculatedPrice,
        image: product.image,
        volume: selectedVolume,
      });
    }

    if (addGiftWrap) {
      add({
        id: `gift-wrap-${product.id}`,
        name: `Luxury Wax-Sealed Gift Box ${giftMessage ? `(Note: "${giftMessage}")` : ""}`,
        price: 250,
      });
    }

    toast.success(`Added ${qty}x ${product.name} (${selectedVolume}) to your cart.`);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    add({
      id: `${product.id}-${selectedVolume}`,
      name: `${product.name} (${selectedVolume})`,
      price: calculatedPrice,
      image: product.image,
      volume: selectedVolume,
    });

    if (addGiftWrap) {
      add({
        id: `gift-wrap-${product.id}`,
        name: `Luxury Wax-Sealed Gift Box ${giftMessage ? `(Note: "${giftMessage}")` : ""}`,
        price: 250,
      });
    }

    setOpen(false);
    navigate({ to: "/checkout" });
  };

  const handleAddLayeringPair = () => {
    if (!layeringProduct) return;
    add({
      id: layeringProduct.id,
      name: layeringProduct.name,
      price: layeringProduct.price,
      image: layeringProduct.image,
      volume: layeringProduct.volume,
    });
    toast.success(`Added ${layeringProduct.name} to your cart for fragrance layering!`);
  };

  const productSchema = product ? {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: [
      product.image.startsWith("http") ? product.image : `https://mshaies.com${product.image}`,
      ...(product.images || []).map((img) => img.startsWith("http") ? img : `https://mshaies.com${img}`)
    ],
    description: product.description || `${product.name} - ${product.tagline || product.notes}. Handcrafted luxury ${product.category} by M.shaies Haute Parfumerie.`,
    sku: product.id,
    mpn: product.id,
    brand: {
      "@type": "Brand",
      name: "M.shaies Haute Parfumerie"
    },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `https://mshaies.com/product/${product.id}`,
      priceCurrency: "PKR",
      price: calculatedPrice,
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: !isOutOfStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "M.shaies Haute Parfumerie"
      }
    },
    ...(ratingInfo?.count > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: ratingInfo.average.toFixed(1),
        reviewCount: ratingInfo.count,
        bestRating: "5",
        worstRating: "1"
      }
    } : {})
  } : null;

  return (
    <div className="pt-20 sm:pt-28 pb-28 sm:pb-20 bg-background min-h-screen">
      {productSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 sm:mb-8">
          <Link
            to="/shop"
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-gold-deep flex items-center gap-2 w-fit transition-colors min-h-[44px] py-2"
          >
            <ArrowLeft className="size-3.5" />
            Back to Collection
          </Link>
        </div>

        {/* Promotional Banner */}
        {settings.heroBannerActive !== false && (settings.promotionalSlides === undefined || (Array.isArray(settings.promotionalSlides) && settings.promotionalSlides.length > 0)) && (
          <div className="mb-6 sm:mb-8">
            <PromotionalBanner />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left Column: Product Imagery & Multi-Image Glass Stage */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-pearl to-muted border border-gold/30 p-6 sm:p-12 flex items-center justify-center min-h-[340px] sm:min-h-[520px] shadow-[var(--shadow-soft)] group"
            >
              <div className="absolute size-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
              
              {/* Category tag & Photo Indicator */}
              <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gold-deep font-bold px-3 py-1.5 rounded-full bg-background/85 backdrop-blur-md border border-gold/30">
                  {product.category}
                </span>
                {gallery.length > 1 && (
                  <span className="text-[11px] font-bold text-muted-foreground px-2.5 py-1 rounded-full bg-background/85 backdrop-blur-md border border-border/80">
                    {activeImageIndex + 1} / {gallery.length} Photos
                  </span>
                )}
              </div>

              {/* Gallery Navigation Arrows (if > 1 image) */}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center text-ink hover:bg-gold transition-colors z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 size-9 rounded-full bg-background/80 backdrop-blur-md border border-border flex items-center justify-center text-ink hover:bg-gold transition-colors z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}

              {/* High-res Image with crossfade transition */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  src={currentImage}
                  alt={`${product.name} - View ${activeImageIndex + 1}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.28 }}
                  className="max-h-[280px] sm:max-h-[420px] w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.22)] relative z-10 group-hover:scale-[1.03] transition-transform duration-500"
                />
              </AnimatePresence>
            </motion.div>

            {/* Gallery Thumbnails Strip (Up to 5 Photos) */}
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`size-16 sm:size-20 rounded-2xl overflow-hidden border-2 p-1 bg-pearl/60 shrink-0 transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? "border-gold shadow-md ring-1 ring-gold"
                        : "border-border/70 hover:border-gold/50 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details, Pyramid & Purchasing */}
          <div className="space-y-8 lg:sticky lg:top-28 lg:self-start">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm uppercase tracking-[0.25em] text-gold-deep font-semibold">
                  M.shaies Maison
                </span>
                <span className="size-1 rounded-full bg-gold" />
                <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1">
                  In Stock
                </span>
              </div>

              <h1 className="font-serif text-2xl xs:text-3xl sm:text-5xl lg:text-6xl text-ink mt-2 tracking-tight">
                {product.name}
              </h1>

              {/* Rating & Review Count Header Anchor */}
              <a
                href="#customer-reviews"
                className="inline-flex items-center gap-2 mt-2.5 group cursor-pointer"
              >
                {productReviews.length > 0 ? (
                  <>
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`size-4 ${
                            star <= Math.round(ratingInfo.average)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-sm text-ink">{ratingInfo.average}</span>
                    <span className="text-sm text-muted-foreground group-hover:text-gold-deep transition-colors underline decoration-dotted">
                      ({productReviews.length} Verified {productReviews.length === 1 ? "Review" : "Reviews"})
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center text-muted-foreground/30">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="size-4 text-muted-foreground/30 fill-transparent" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-gold-deep transition-colors">
                      No reviews yet · <span className="underline decoration-dotted text-gold font-medium">Be the first to review</span>
                    </span>
                  </>
                )}
              </a>

              {/* Price & Stock */}
              <div className="mt-4 flex items-center gap-4">
                <p className="font-serif text-2xl sm:text-4xl text-ink font-bold">
                  {formatPKR(calculatedPrice)}
                </p>

                {isOutOfStock ? (
                  <span className="text-xs sm:text-sm uppercase tracking-wider font-semibold px-3 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                    Sold Out
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm uppercase tracking-wider font-semibold px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-pulse">
                    <Flame className="size-4" />
                    Only {product.stock} bottles left in stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm uppercase tracking-wider font-semibold px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                    <Check className="size-4" />
                    In Stock ({product.stock} Available)
                  </span>
                )}
              </div>

              <p className="mt-5 text-base sm:text-lg text-ink/80 leading-relaxed font-normal">
                {product.description || product.tagline}
              </p>
            </div>

            {/* Volume & Flacon Selector */}
            {activeSizeOptions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm uppercase tracking-[0.2em] text-ink font-bold">
                    Select Flacon Size
                  </label>
                  <span className="text-xs text-gold-deep font-bold">
                    {currentSizeOption?.sub || "Full Bottle Flacon"}
                  </span>
                </div>
                <div className={`grid grid-cols-2 ${activeSizeOptions.length >= 4 ? "sm:grid-cols-4" : activeSizeOptions.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-2.5`}>
                  {activeSizeOptions.map((vol) => {
                    const optionPrice = Math.round(product.price * (vol.multiplier || 1.0));
                    const subText = vol.sub || formatPKR(optionPrice);

                    return (
                      <button
                        key={vol.label}
                        type="button"
                        onClick={() => setSelectedVolume(vol.label)}
                        className={`p-3.5 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${
                          selectedVolume === vol.label
                            ? "border-gold bg-pearl shadow-md shadow-gold/15 ring-1 ring-gold"
                            : "border-border/80 bg-card hover:border-gold/50"
                        }`}
                      >
                        <p className="font-serif text-base font-bold text-ink">{vol.label}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1 font-medium truncate">
                          {subText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SENSORY SPECS: Longevity Bar & Sillage Meter */}
            <div className="rounded-3xl border border-gold/30 bg-card p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-gold-deep" />
                  <h3 className="font-serif text-base font-bold text-ink">Sensory Performance & Sillage</h3>
                </div>
                {product.gender && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-pearl border border-gold/30 text-ink">
                    {product.gender}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Longevity Bar */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-pearl/60 border border-border/60">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
                      <Clock className="size-4 text-gold-deep" />
                      Longevity on Skin
                    </span>
                    <span className="font-bold text-ink text-sm sm:text-base">{product.longevityHours || 18}+ Hours</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-gold transition-all duration-700"
                      style={{ width: `${Math.min(100, ((product.longevityHours || 18) / 24) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Beast mode projection: 48+ hrs on fabrics.</p>
                </div>

                {/* Sillage Rating */}
                <div className="space-y-2 p-3.5 rounded-2xl bg-pearl/60 border border-border/60">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
                      <Wind className="size-4 text-gold-deep" />
                      Sillage & Throw
                    </span>
                    <span className="font-bold text-gold-deep text-sm sm:text-base">{product.sillageRating || "Strong"} Trail</span>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {["Intimate", "Moderate", "Strong", "Enormous"].map((lvl, idx) => {
                      const currentRank = product.sillageRating === "Enormous" ? 4 : product.sillageRating === "Moderate" ? 2 : 3;
                      const active = idx < currentRank;
                      return (
                        <div 
                          key={lvl} 
                          className={`h-2.5 flex-1 rounded-full ${active ? "bg-gold" : "bg-muted"}`} 
                          title={lvl}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Noticeable within 6-10 feet radius.</p>
                </div>
              </div>

              {/* Season & Occasion Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {product.fragranceFamily && (
                  <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-background border border-gold/40 text-ink">
                    Family: <strong>{product.fragranceFamily}</strong>
                  </span>
                )}
                {product.seasonSuitability?.map((season) => (
                  <span key={season} className="px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-muted/60 text-muted-foreground">
                    {season === "Summer" ? "☀️ Summer" : season === "Winter" ? "❄️ Winter" : `🌿 ${season}`}
                  </span>
                ))}
                {product.occasionSuitability?.slice(0, 2).map((occ) => (
                  <span key={occ} className="px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-muted/60 text-muted-foreground">
                    👑 {occ}
                  </span>
                ))}
              </div>

              {/* Inspired-By Accord Note */}
              {product.inspiredBy && (
                <div className="p-3.5 rounded-2xl bg-pearl border border-gold/30 space-y-1">
                  <p className="text-xs uppercase tracking-wider text-gold-deep font-bold">
                    Sommelier's Accord Kinship:
                  </p>
                  <p className="text-ink/80 italic text-sm sm:text-base leading-relaxed">
                    "{product.inspiredBy}"
                  </p>
                </div>
              )}
            </div>

            {/* Interactive Olfactory Scent Pyramid */}
            <div className="rounded-3xl border border-gold/30 bg-pearl/30 p-6 sm:p-7 space-y-4">
              <p className="text-sm uppercase tracking-[0.25em] text-gold-deep font-bold flex items-center gap-2">
                <Sparkles className="size-4" />
                Olfactory Pyramid Notes
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-background/80 border border-border/80 shadow-xs space-y-1">
                  <p className="text-xs uppercase tracking-widest text-gold-deep font-bold">
                    Top Notes
                  </p>
                  <p className="text-sm sm:text-base text-ink font-serif font-medium">
                    {product.topNotes || "Bergamot, Fresh Saffron"}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-background/80 border border-border/80 shadow-xs space-y-1">
                  <p className="text-xs uppercase tracking-widest text-gold-deep font-bold">
                    Heart Notes
                  </p>
                  <p className="text-sm sm:text-base text-ink font-serif font-medium">
                    {product.heartNotes || "Damask Rose, Leather Accord"}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-background/80 border border-border/80 shadow-xs space-y-1">
                  <p className="text-xs uppercase tracking-widest text-gold-deep font-bold">
                    Base Notes
                  </p>
                  <p className="text-sm sm:text-base text-ink font-serif font-medium">
                    {product.baseNotes || "Aged Cambodian Oud, Amber"}
                  </p>
                </div>
              </div>
            </div>

            {/* Fragrance Layering Duo Recommendation */}
            {layeringProduct && (
              <div className="p-5 rounded-3xl border border-gold/40 bg-pearl/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img 
                    src={layeringProduct.image} 
                    alt={layeringProduct.name} 
                    className="size-14 rounded-2xl object-contain bg-background border border-gold/30 shrink-0 p-1" 
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="size-4 text-gold-deep" />
                      <p className="text-sm sm:text-base font-bold text-ink">Master Layering Pairing</p>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      Pair with <strong>{layeringProduct.name}</strong> for intoxicating depth.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddLayeringPair}
                  className="px-4 py-2 rounded-full bg-gold text-ink font-bold text-xs uppercase tracking-wider hover:scale-[1.03] transition-transform shrink-0 cursor-pointer self-end sm:self-auto shadow-xs"
                >
                  + Add Duo ({formatPKR(layeringProduct.price)})
                </button>
              </div>
            )}

            {/* Luxury Gift Wrapping Option */}
            <div className="p-5 rounded-3xl border border-border/80 bg-card space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-gold/15 border border-gold/30 grid place-items-center text-gold-deep">
                    <Gift className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-ink">Luxury Wax-Sealed Gift Box & Card</p>
                    <p className="text-xs text-muted-foreground">Handwritten calligraphy card with gold ribbon</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-serif font-bold text-gold-deep">+ ₨ 250</span>
                  <input
                    type="checkbox"
                    checked={addGiftWrap}
                    onChange={(e) => setAddGiftWrap(e.target.checked)}
                    className="size-4 accent-gold cursor-pointer"
                  />
                </div>
              </label>

              {addGiftWrap && (
                <div className="pt-2 border-t border-border/60">
                  <input
                    type="text"
                    placeholder="Enter recipient name and handwritten message..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background text-ink focus:border-gold focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Quantity & Buy Buttons */}
            <div className="space-y-3.5 pt-2">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Quantity */}
                <div className="flex items-center justify-between sm:justify-center border border-border rounded-full bg-card px-5 sm:px-4 py-2.5 sm:py-2">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="size-8 rounded-full border border-border sm:border-transparent grid place-items-center text-muted-foreground hover:text-ink transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center text-base font-bold tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    disabled={qty >= product.stock}
                    className="size-8 rounded-full border border-border sm:border-transparent grid place-items-center text-muted-foreground hover:text-ink transition-colors disabled:opacity-40 cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 py-2.5 sm:py-4 px-3 sm:px-6 rounded-full border-2 border-gold/70 bg-card hover:bg-gold/15 text-ink font-bold text-xs sm:text-sm uppercase tracking-wider sm:tracking-[0.18em] transition-all flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer min-h-[40px] sm:min-h-[44px] whitespace-nowrap"
                >
                  <Plus className="size-3.5 sm:size-4 shrink-0" />
                  <span>{isOutOfStock ? "Sold Out" : "Add to Cart"}</span>
                </button>
              </div>

              {/* Instant Checkout */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="w-full btn-gold btn-gold-hover py-2.5 sm:py-4 px-4 sm:px-6 rounded-full font-bold text-xs sm:text-base uppercase tracking-wider sm:tracking-[0.2em] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[40px] sm:min-h-[44px] whitespace-nowrap"
              >
                Instant Buy & Checkout
              </button>
            </div>

            {/* Trust Badges & Batch Compliance */}
            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-pearl/50">
                  <Truck className="size-4 text-gold-deep" />
                  <span className="text-xs text-ink font-bold">Nationwide Express</span>
                  <span className="text-[11px] text-muted-foreground">Free above ₨ 5,000</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-pearl/50">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span className="text-xs text-ink font-bold">100% Halal Oil</span>
                  <span className="text-[11px] text-muted-foreground">Pure Non-Alcoholic</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-pearl/50">
                  <RotateCcw className="size-4 text-gold-deep" />
                  <span className="text-xs text-ink font-bold">Maison Quality</span>
                  <span className="text-[11px] text-muted-foreground">Flacon Replacement</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pt-1 border-t border-border/40">
                <span>Batch: <strong className="text-ink font-mono">{product.batchNumber || "MSH-2026-B1"}</strong></span>
                <span>Shelf Life: <strong className="text-ink">36 Months</strong></span>
                <span>IFRA Standard: <strong className="text-emerald-600">Compliant</strong></span>
              </div>
            </div>
            </div>
          </div>

        {/* ===================================================================== */}
        {/* CUSTOMER REVIEWS & EXPERIENCES SECTION                               */}
        {/* ===================================================================== */}
        <div id="customer-reviews" className="mt-16 sm:mt-24 border-t border-border/80 pt-12 sm:pt-16 space-y-10">
          
          {/* Header & Rating Breakdown */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-card border border-gold/30 rounded-3xl p-6 sm:p-10 shadow-sm">
            
            {/* Left: Score & Stars */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 lg:border-r border-border/80 lg:pr-12">
              {productReviews.length > 0 ? (
                <>
                  <div className="text-center sm:text-left">
                    <div className="font-serif text-5xl sm:text-6xl font-bold text-ink flex items-baseline gap-1">
                      {ratingInfo.average}
                      <span className="text-lg text-muted-foreground font-sans font-normal">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 mt-2 justify-center sm:justify-start">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`size-4 sm:size-5 ${
                            s <= Math.round(ratingInfo.average)
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on {productReviews.length} verified customer {productReviews.length === 1 ? "review" : "reviews"}
                    </p>
                  </div>

                  {/* Progress bars */}
                  <div className="w-full sm:w-56 space-y-1.5 text-xs text-muted-foreground">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = productReviews.filter((r) => r.rating === rating).length;
                      const pct = (count / productReviews.length) * 100;
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="w-3 text-right font-medium">{rating}</span>
                          <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />
                          <div className="flex-1 h-2 rounded-full bg-pearl overflow-hidden border border-border/60">
                            <div
                              className="h-full bg-gold rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-6 text-right tabular-nums text-[11px]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center sm:text-left space-y-2 py-2">
                  <div className="flex items-center gap-1 text-muted-foreground/30 justify-center sm:justify-start">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="size-5 text-muted-foreground/30 fill-transparent" />
                    ))}
                  </div>
                  <h4 className="font-serif text-2xl font-bold text-ink">No Reviews Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Be the first customer to share your thoughts and rate {product.name}.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Write Review CTA */}
            <div className="flex flex-col items-start lg:items-end justify-center gap-3">
              <h3 className="font-serif text-xl sm:text-2xl text-ink font-bold">
                Share Your Fragrance Impression
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md lg:text-right">
                Have you experienced {product.name}? Share how this artisanal blend projects and performs in your city.
              </p>
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="btn-gold btn-gold-hover px-6 py-3 rounded-full text-xs uppercase tracking-[0.18em] font-bold flex items-center gap-2 shadow-md cursor-pointer mt-1"
              >
                <PenLine className="size-4" />
                <span>{showReviewForm ? "Close Review Form" : "Write a Review"}</span>
              </button>
            </div>
          </div>

          {/* Review Submission Form */}
          <AnimatePresence>
            {showReviewForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleReviewSubmit}
                className="bg-card border-2 border-gold/50 rounded-3xl p-6 sm:p-10 shadow-lg space-y-6 overflow-hidden"
              >
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="size-5 text-gold-deep" />
                    <h3 className="font-serif text-xl sm:text-2xl text-ink font-bold">
                      Write a Verified Customer Review
                    </h3>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-emerald-600 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                    Verified Customer
                  </span>
                </div>

                {/* Rating Picker */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-2">
                    Your Overall Rating *
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            className={`size-7 ${
                              star <= (hoverRating || newRating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-muted text-muted"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs uppercase tracking-wider font-bold text-gold-deep ml-2">
                      {newRating === 5 && "5 Stars · Outstanding Masterpiece"}
                      {newRating === 4 && "4 Stars · High Quality & Long-Lasting"}
                      {newRating === 3 && "3 Stars · Pleasant Scent"}
                      {newRating === 2 && "2 Stars · Needs Improvement"}
                      {newRating === 1 && "1 Star · Not Satisfied"}
                    </span>
                  </div>
                </div>

                {/* Name & City Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariq Mehmood"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-pearl/30 text-ink text-sm focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                      City in Pakistan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lahore, Karachi, Islamabad"
                      value={authorCity}
                      onChange={(e) => setAuthorCity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-pearl/30 text-ink text-sm focus:outline-none focus:border-gold"
                    />
                    {/* Quick City Suggestions */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Lahore", "Karachi", "Islamabad", "Peshawar", "Faisalabad", "Multan", "Quetta"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAuthorCity(c)}
                          className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 hover:border-gold text-muted-foreground hover:text-ink cursor-pointer transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review Headline */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                    Review Headline / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Incredible silage that lasts 12+ hours in summer"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-pearl/30 text-ink text-sm focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Review Comments */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                    Detailed Fragrance Experience & Notes *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe the projection, compliment factor, dry-down notes, and packaging quality..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-border bg-pearl/30 text-ink text-sm focus:outline-none focus:border-gold resize-y"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-5 py-2.5 rounded-full border border-border text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn-gold btn-gold-hover px-6 py-2.5 rounded-full text-xs uppercase tracking-[0.18em] font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submittingReview ? "Submitting..." : "Publish Review"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Rating Filter Tabs */}
          {productReviews.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedFilterRating("all")}
                  className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
                    selectedFilterRating === "all"
                      ? "bg-gold text-ink font-bold shadow-xs"
                      : "bg-pearl/50 text-muted-foreground hover:text-ink"
                  }`}
                >
                  All Reviews ({productReviews.length})
                </button>
                {[5, 4, 3].map((star) => {
                  const count = productReviews.filter((r) => r.rating === star).length;
                  return (
                    <button
                      key={star}
                      onClick={() => setSelectedFilterRating(star)}
                      className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                        selectedFilterRating === star
                          ? "bg-gold text-ink font-bold shadow-xs"
                          : "bg-pearl/50 text-muted-foreground hover:text-ink"
                      }`}
                    >
                      <span>{star} Stars</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Showing {productReviews.filter((r) => selectedFilterRating === "all" || r.rating === selectedFilterRating).length} of {productReviews.length} reviews
              </p>
            </div>
          )}

          {/* Reviews List */}
          {productReviews.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border border-dashed border-border/80 bg-pearl/20 p-8 space-y-3">
              <MessageSquarePlus className="size-10 mx-auto text-gold-deep opacity-60" />
              <h4 className="font-serif text-xl text-ink font-bold">No Reviews Yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Be the first connoisseur in Pakistan to experience and review {product.name}.
              </p>
              <button
                onClick={() => setShowReviewForm(true)}
                className="btn-gold btn-gold-hover px-5 py-2 rounded-full text-xs uppercase tracking-wider font-bold shadow-md cursor-pointer mt-2"
              >
                Write the First Review
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {productReviews
                .filter((r) => selectedFilterRating === "all" || r.rating === selectedFilterRating)
                .map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 sm:p-6 rounded-3xl border border-border/80 bg-card shadow-xs flex flex-col justify-between space-y-4 hover:border-gold/50 transition-colors"
                  >
                    <div className="space-y-3">
                      {/* Reviewer Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center font-serif text-base font-bold text-gold-deep shrink-0">
                            {rev.author.charAt(0)}
                          </div>
                          <div>
                            <p className="font-serif text-sm sm:text-base font-bold text-ink flex items-center gap-1.5">
                              {rev.author}
                              {rev.verified && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-sans font-semibold">
                                  <CheckCircle2 className="size-2.5" />
                                  Verified Buyer
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {rev.city}, Pakistan · {rev.date}
                            </p>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center text-amber-400 shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`size-3.5 ${
                                s <= rev.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-muted text-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Title */}
                      <h5 className="font-serif text-base sm:text-lg font-bold text-ink leading-snug">
                        "{rev.title}"
                      </h5>

                      {/* Body */}
                      <p className="text-sm sm:text-base text-ink/80 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>

                    {/* Helpful Button */}
                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Verified Pakistan customer</span>
                      <button
                        onClick={() => {
                          voteHelpful(rev.id);
                          toast.success("Thank you for your feedback!");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 hover:border-gold hover:text-ink text-[11px] transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="size-3" />
                        <span>Helpful ({rev.helpfulCount})</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Purchase Bar (Visible on mobile only, pb-safe) */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-xl border-t border-gold/40 px-4 py-3 z-30 flex items-center justify-between gap-3 pb-safe shadow-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src={product.image} 
            alt={product.name} 
            className="size-11 rounded-xl object-contain bg-pearl border border-gold/30 shrink-0 p-0.5" 
          />
          <div className="min-w-0">
            <p className="font-serif text-sm font-bold text-ink truncate leading-tight">{product.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-bold text-gold-deep">{formatPKR(calculatedPrice)}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">({selectedVolume})</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="btn-gold btn-gold-hover px-3.5 py-2 rounded-full text-xs uppercase tracking-wider font-bold shrink-0 flex items-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer min-h-[38px] whitespace-nowrap"
        >
          <Plus className="size-3.5 shrink-0" />
          <span>{isOutOfStock ? "Sold Out" : "Add to Cart"}</span>
        </button>
      </div>
    </div>
  );
}
