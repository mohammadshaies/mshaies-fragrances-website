import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Compass } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bottle3D } from "./Bottle3D";

// ============================================================================
// HERO SECTION COMPONENT (Interactive 3D Luxury Showcase)
// ============================================================================
// The primary showcase section for the store. Features:
// 1. Seamless background gradient that connects directly into the catalog below.
// 2. High-impact headline & CTA buttons (Explore Collection & Scent Journey).
// 3. Interactive, rotating 3D Bottle showcase with ambient pedestal glow.
export function Hero() {
  // Only mount ONE 3D Canvas instance depending on screen size (saves 50%+ GPU load)
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  // Smoothly scroll down to the product catalog
  const scrollToShop = () => {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="top"
      className="relative flex items-center overflow-hidden pt-28 xs:pt-32 sm:pt-36 pb-2 sm:pb-16"
      // SEAMLESS GRADIENT: Blends from pearlescent off-white (#fcfaf6) at top
      // to warm champagne pearl (#f3ece0) at bottom, seamlessly matching the section below.
      style={{ background: "linear-gradient(180deg, #fcfaf6 0%, #f7f2e8 60%, #f3ece0 100%)" }}
    >
      {/* Ambient background accent glows (Hardware accelerated) */}
      <div 
        className="pointer-events-none absolute -top-24 -left-24 size-[380px] rounded-full opacity-35 blur-3xl transform-gpu"
        style={{ background: "radial-gradient(circle, var(--gold-soft), transparent 70%)" }} 
      />
      <div 
        className="pointer-events-none absolute -bottom-24 right-0 size-[420px] rounded-full opacity-25 blur-3xl transform-gpu"
        style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }} 
      />

      <div className="mx-auto max-w-7xl w-full px-4 sm:px-8 relative z-10">
        
        {/* ===================================================================== */}
        {/* 1. MOBILE & TABLET LAYOUT: TEXT ON LEFT, 3D BOTTLE ON RIGHT (< 1024px) */}
        {/* ===================================================================== */}
        <div className="lg:hidden">
          <div className="flex flex-row items-center justify-between gap-1 xs:gap-2 sm:gap-6">
            
            {/* Left Column: Brand Story & Compact CTAs */}
            <div className="w-[52%] xs:w-[50%] sm:w-[50%] flex flex-col items-start text-left shrink-0">
              {/* Collection Year Pill Badge */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-gold/40 bg-background/80 backdrop-blur-sm text-[8.5px] xs:text-[9.5px] uppercase tracking-[0.2em] text-gold-deep mb-2 shadow-2xs font-semibold"
              >
                <Sparkles className="size-2.5 text-gold" />
                <span>Maison 2026</span>
              </motion.div>

              {/* Mobile Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="font-serif text-[21px] xs:text-[24px] sm:text-3xl leading-[1.12] text-ink font-bold tracking-tight"
              >
                The Essence of <br />
                <span className="gold-gradient-text font-bold">Luxury.</span>
                <span className="block text-[11px] xs:text-xs font-sans font-normal text-muted-foreground mt-0.5">
                  Crafted for Pakistan
                </span>
              </motion.h1>

              {/* Mobile Subtitle & Value Proposition */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-1.5 text-[10px] xs:text-[11.5px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-3"
              >
                Pure attars & extrait perfumes. 35% oil concentration.
              </motion.p>

              {/* Action Buttons for Mobile */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="mt-3 flex items-center gap-2"
              >
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
              </motion.div>
            </div>

            {/* Right Column: 3D Bottle Showcase on RIGHT (Calibrated Size & Non-touchable on Mobile) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="w-[48%] xs:w-[50%] sm:w-[50%] relative h-[230px] xs:h-[260px] sm:h-[300px] flex items-center justify-center shrink-0 pointer-events-none select-none"
            >
              {/* Ambient Pedestal Glow (GPU accelerated) */}
              <div 
                className="absolute inset-2 rounded-full opacity-45 blur-2xl pointer-events-none transform-gpu"
                style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }}
              />

              {!isDesktop && (
                <Suspense fallback={
                  <div className="size-7 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                }>
                  <Bottle3D isCompact={true} />
                </Suspense>
              )}
            </motion.div>
          </div>

          {/* Mobile Centered Trust Value Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-2 sm:mt-4 pt-1.5 sm:pt-3 border-t border-gold/20 flex items-center justify-center gap-1.5 xs:gap-2.5 sm:gap-4 text-center text-[7.5px] xs:text-[8.5px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-medium overflow-hidden px-1"
          >
            <span className="shrink-0">100% Pure Attars</span>
            <span className="text-gold/60 text-[8px] shrink-0">•</span>
            <span className="shrink-0">Free Delivery &gt; ₨ 5k</span>
            <span className="text-gold/60 text-[8px] shrink-0">•</span>
            <span className="shrink-0">Nationwide Delivery</span>
          </motion.div>
        </div>

        {/* ===================================================================== */}
        {/* 2. DEDICATED PC & DESKTOP DESIGN (>= 1024px)                          */}
        {/* ===================================================================== */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Brand Narrative & Grand CTAs */}
          <div className="lg:col-span-7 text-left">
            {/* Collection Year Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/40 bg-background/80 backdrop-blur-sm text-[11px] uppercase tracking-[0.25em] text-gold-deep mb-5 shadow-sm"
            >
              <Sparkles className="size-3 text-gold" />
              <span>Maison Collection · 2026</span>
            </motion.div>

            {/* Primary Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.05 }}
              className="font-serif text-5xl xl:text-6xl leading-[1.08] tracking-tight text-ink"
            >
              The Essence of <em className="not-italic gold-gradient-text">Luxury.</em>
              <br />
              Crafted for Pakistan.
            </motion.h1>

            {/* Subtitle & Value Proposition */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mt-4 max-w-lg text-base text-muted-foreground leading-relaxed"
            >
              Signature pure attars, extrait perfumes, and luxury horology hand-poured in Pakistan. Formulated with 35% oil concentration for extraordinary projection nationwide.
            </motion.p>

            {/* Action Call-to-Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="mt-7 flex items-center gap-4"
            >
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
            </motion.div>

            {/* Trust Value Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.4 }}
              className="mt-8 pt-6 border-t border-border/40 flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
            >
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
            </motion.div>
          </div>

          {/* Right Column: Grand 3D Bottle Showcase (5 Columns) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15 }}
            className="lg:col-span-5 relative h-[480px] lg:h-[520px] xl:h-[560px] w-full flex items-center justify-center"
          >
            {/* Golden ambient pedestal glow below bottle (GPU accelerated) */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 bottom-2 size-64 rounded-full opacity-45 blur-3xl pointer-events-none transform-gpu"
              style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }} 
            />
            
            {/* 3D Bottle Viewer with smooth Suspense fallback */}
            {isDesktop && (
              <Suspense fallback={
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="size-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gold-deep animate-pulse font-semibold">
                    Loading 3D Attar Bottle...
                  </div>
                </div>
              }>
                <Bottle3D isCompact={false} />
              </Suspense>
            )}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
