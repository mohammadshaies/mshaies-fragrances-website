import { ArrowRight, Sparkles, Compass, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

// ============================================================================
// HERO SECTION COMPONENT (High-Performance Luxury Showcase)
// ============================================================================
// Completely skips 3D WebGL / Canvas / GLTF loading for lightning-fast mobile
// performance (0% GPU load, instant tap response, zero download latency).
export function Hero() {
  const scrollToShop = () => {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      className="relative flex items-center overflow-hidden pt-28 xs:pt-32 sm:pt-36 pb-3 sm:pb-16"
      style={{ background: "linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 60%, #f3ece0 100%)" }}
    >
      {/* Ambient background accent glows (hardware-accelerated CSS) */}
      <div 
        className="pointer-events-none absolute -top-24 -left-24 size-[340px] sm:size-[380px] rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--gold-soft), transparent 70%)" }} 
      />
      <div 
        className="pointer-events-none absolute -bottom-24 right-0 size-[380px] sm:size-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }} 
      />

      <div className="mx-auto max-w-7xl w-full px-4 sm:px-8 relative z-10">
        
        {/* ===================================================================== */}
        {/* 1. MOBILE & TABLET LAYOUT (< 1024px)                                  */}
        {/* ===================================================================== */}
        <div className="lg:hidden">
          <div className="flex flex-row items-center justify-between gap-2 xs:gap-3 sm:gap-6">
            
            {/* Left Column: Brand Story & Headline */}
            <div className="w-[52%] xs:w-[50%] sm:w-[48%] flex flex-col items-start text-left shrink-0">
              {/* Collection Year Pill Badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-gold/40 bg-background/85 text-[9px] xs:text-[10px] uppercase tracking-[0.2em] text-gold-deep mb-2 font-semibold shadow-2xs">
                <Sparkles className="size-2.5 text-gold" />
                <span>Maison 2026</span>
              </div>

              {/* Mobile Headline */}
              <h1 className="font-serif text-[20px] xs:text-[23px] sm:text-3xl leading-[1.12] text-ink font-bold tracking-tight">
                The Essence of <br />
                <span className="gold-gradient-text font-bold">Luxury.</span>
                <span className="block text-[11px] xs:text-xs font-sans font-normal text-muted-foreground mt-0.5">
                  Crafted for Pakistan
                </span>
              </h1>

              {/* Mobile Subtitle */}
              <p className="mt-1.5 text-[10px] xs:text-[11px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-3">
                Pure attars & extrait perfumes. 35% oil concentration.
              </p>

              {/* Mobile Action Buttons */}
              <div className="mt-3 flex items-center gap-2">
                <button 
                  onClick={scrollToShop} 
                  className="btn-gold btn-gold-hover px-3.5 xs:px-4 py-2 rounded-full text-[10px] xs:text-[11px] uppercase tracking-wider font-bold flex items-center gap-1 shadow-md shrink-0 cursor-pointer active:scale-95"
                >
                  <span>Explore</span>
                  <ArrowRight className="size-3" />
                </button>
                <Link
                  to="/journey"
                  className="size-8 rounded-full border border-border bg-card/80 flex items-center justify-center text-gold-deep hover:bg-pearl shrink-0 active:scale-95"
                  title="Scent Journey"
                >
                  <Compass className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Column: High-Performance Luxury Bottle Showcase (Fast Static Image, No 3D WebGL) */}
            <div className="w-[46%] xs:w-[48%] sm:w-[50%] relative h-[210px] xs:h-[240px] sm:h-[280px] flex items-center justify-center shrink-0">
              {/* Golden Ambient Glow */}
              <div 
                className="absolute inset-1 rounded-full opacity-40 blur-2xl pointer-events-none"
                style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }}
              />

              <Link
                to="/product/$id"
                params={{ id: "oud-al-jamil-signature-royal-flacon" }}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center group cursor-pointer"
                title="View Signature Royal Flacon"
              >
                <div className="relative w-full h-[82%] flex items-center justify-center">
                  <img
                    src="/product-desert-gold.png"
                    alt="Maison Signature Attar Flacon"
                    loading="eager"
                    decoding="async"
                    className="max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(212,175,55,0.25)] transition-transform duration-300 group-hover:scale-105 active:scale-95"
                  />
                  {/* Floating Tag */}
                  <div className="absolute -bottom-1 inset-x-0 mx-auto w-fit px-2 py-0.5 rounded-full bg-background/90 border border-gold/40 text-[8px] uppercase tracking-widest text-gold-deep font-bold shadow-xs backdrop-blur-sm whitespace-nowrap">
                    Royal Flacon
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Mobile Centered Trust Value Badges */}
          <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-gold/20 flex items-center justify-center gap-2 xs:gap-3 sm:gap-4 text-center text-[8px] xs:text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium overflow-hidden px-1">
            <span className="shrink-0">100% Pure Attars</span>
            <span className="text-gold/60 text-[8px] shrink-0">•</span>
            <span className="shrink-0">Free Delivery &gt; ₨ 5k</span>
            <span className="text-gold/60 text-[8px] shrink-0">•</span>
            <span className="shrink-0">Nationwide Delivery</span>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 2. DEDICATED PC & DESKTOP DESIGN (>= 1024px)                          */}
        {/* ===================================================================== */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Brand Narrative & Grand CTAs */}
          <div className="lg:col-span-7 text-left">
            {/* Collection Year Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/40 bg-background/80 backdrop-blur-sm text-[11px] uppercase tracking-[0.25em] text-gold-deep mb-5 shadow-sm">
              <Sparkles className="size-3 text-gold" />
              <span>Maison Collection · 2026</span>
            </div>

            {/* Primary Main Headline */}
            <h1 className="font-serif text-5xl xl:text-6xl leading-[1.08] tracking-tight text-ink">
              The Essence of <em className="not-italic gold-gradient-text">Luxury.</em>
              <br />
              Crafted for Pakistan.
            </h1>

            {/* Subtitle & Value Proposition */}
            <p className="mt-4 max-w-lg text-base text-muted-foreground leading-relaxed">
              Signature pure attars, extrait perfumes, and luxury horology hand-poured in Pakistan. Formulated with 35% oil concentration for extraordinary projection nationwide.
            </p>

            {/* Action Call-to-Action Buttons */}
            <div className="mt-7 flex items-center gap-4">
              <button 
                onClick={scrollToShop} 
                className="btn-gold btn-gold-hover px-6 py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-semibold flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Explore Collection</span>
                <ArrowRight className="size-4" />
              </button>
              <Link
                to="/journey"
                className="px-5 py-3 rounded-full border border-border/80 bg-background/60 hover:bg-pearl text-xs uppercase tracking-[0.2em] text-ink/80 hover:text-ink font-semibold transition-all flex items-center gap-2"
              >
                <Compass className="size-3.5 text-gold-deep" />
                <span>Scent Journey</span>
              </Link>
            </div>

            {/* Trust Value Badges */}
            <div className="mt-8 pt-6 border-t border-border/40 flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold" />
                100% Pure Attars
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold" />
                Free Delivery &gt; ₨ 5,000
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold" />
                Delivering All Across Pakistan
              </span>
            </div>
          </div>

          {/* Right Column: Grand Luxury Bottle Showcase (Fast, High-Fidelity & Zero Lag) */}
          <div className="lg:col-span-5 relative h-[480px] lg:h-[520px] xl:h-[560px] w-full flex items-center justify-center">
            {/* Golden ambient pedestal glow below bottle */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 bottom-4 size-72 rounded-full opacity-50 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }} 
            />

            <Link
              to="/product/$id"
              params={{ id: "oud-al-jamil-signature-royal-flacon" }}
              className="group relative z-10 w-full h-full flex flex-col items-center justify-center cursor-pointer"
              title="Discover Oud Al-Jamil Signature Royal Flacon"
            >
              {/* Floating Highlight Pill */}
              <div className="absolute top-6 px-3.5 py-1 rounded-full bg-background/90 border border-gold/50 shadow-md backdrop-blur-md text-[10px] uppercase tracking-[0.2em] text-gold-deep font-bold flex items-center gap-1.5 transition-transform duration-300 group-hover:-translate-y-1">
                <Sparkles className="size-3 text-gold" />
                <span>Signature Maison Flacon</span>
              </div>

              {/* High-Fidelity Bottle Image */}
              <div className="relative w-full h-[78%] flex items-center justify-center">
                <img
                  src="/product-desert-gold.png"
                  alt="Maison Signature Royal Flacon"
                  loading="eager"
                  className="max-h-full max-w-full object-contain drop-shadow-[0_20px_40px_rgba(212,175,55,0.3)] transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-2"
                />
              </div>

              {/* Bottom Subtle Pill */}
              <div className="mt-2 text-center">
                <span className="text-xs uppercase tracking-[0.25em] text-ink font-serif font-bold group-hover:text-gold-deep transition-colors">
                  Oud Al-Jamil · 35% Extrait
                </span>
                <span className="block text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  Click to View Fragrance Notes →
                </span>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
