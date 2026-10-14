import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Tag, ChevronLeft, ChevronRight, Truck, Flame, Watch, Gift, ShieldCheck, Gem } from "lucide-react";
import { useProductsStore, DEFAULT_PROMOTIONAL_SLIDES, PromotionalSlide } from "@/lib/products-store";

// Transition Variants for Animated Slide Changes
const slideTransitionVariants = {
  slide: {
    enter: (direction: number) => ({
      x: direction >= 0 ? "100%" : "-100%",
      opacity: 1,
    }),
    center: {
      x: "0%",
      opacity: 1,
      transition: {
        x: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.2 },
      },
    },
    exit: (direction: number) => ({
      x: direction >= 0 ? "-100%" : "100%",
      opacity: 1,
      transition: {
        x: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.2 },
      },
    }),
  },
  fade: {
    enter: {
      opacity: 0,
      scale: 0.98,
    },
    center: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  },
  zoom: {
    enter: {
      opacity: 0,
      scale: 0.9,
    },
    center: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
    },
    exit: {
      opacity: 0,
      scale: 1.08,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  },
  flip: {
    enter: {
      opacity: 0,
      rotateX: 35,
      transformPerspective: 1000,
    },
    center: {
      opacity: 1,
      rotateX: 0,
      transformPerspective: 1000,
      transition: { duration: 0.45, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      rotateX: -35,
      transformPerspective: 1000,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  },
};

export interface BannerSlide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  code?: string;
  buttonText: string;
  linkUrl: string;
  icon?: "sparkles" | "truck" | "flame" | "watch" | "gift" | "shield" | "tag" | "gem";
  imageUrl?: string;
}

interface Props {
  imageUrl?: string;
  alt?: string;
  linkUrl?: string;
  animationType?: "slide" | "marquee" | "fade" | "zoom" | "flip" | "fadeIn" | "slideLeft" | "zoomIn";
  tag?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  className?: string;
  autoPlayInterval?: number; // ms
  showControls?: boolean;
}

export const PromotionalBanner: React.FC<Props> = (props) => {
  const { settings } = useProductsStore();

  // If globally disabled in settings, don't render
  const isActive = settings.heroBannerActive !== false;
  if (!isActive) return null;

  // Resolve transition style
  const rawAnimation = props.animationType || settings.heroBannerTransitionEffect || settings.heroBannerAnimation || "slide";
  const transitionEffect: "slide" | "marquee" | "fade" | "zoom" | "flip" =
    rawAnimation === "marquee"
      ? "marquee"
      : rawAnimation === "fade" || rawAnimation === "fadeIn"
      ? "fade"
      : rawAnimation === "zoom" || rawAnimation === "zoomIn"
      ? "zoom"
      : rawAnimation === "flip"
      ? "flip"
      : "slide";

  const speed = props.autoPlayInterval || settings.heroBannerTransitionSpeed || 4500;
  const showShimmer = settings.heroBannerShimmer !== false;

  // Custom primary offer configured in admin
  const primaryTitle = props.title || settings.heroBannerTitle || "Free Express Delivery Across Pakistan On Orders Over ₨ 5,000";
  const primaryTag = props.tag || settings.heroBannerTag || "Maison Exclusive · Limited Festive Release";
  const primarySubtitle = props.subtitle || settings.heroBannerSubtitle || "100% Alcohol-Free Pure Attar Oils & 35% Extrait Parfums. Use Code LUXE15 for Flat 15% OFF.";
  const primaryButtonText = props.buttonText || settings.heroBannerButtonText || "Claim Exclusive Offer";
  const primaryLink = props.linkUrl || settings.heroBannerLink || "/shop";
  const customImage = props.imageUrl !== undefined ? props.imageUrl : settings.heroBannerImage;
  const hasCustomGraphic = Boolean(customImage && customImage.length > 30 && (customImage.startsWith("data:") || customImage.startsWith("http") || customImage.startsWith("/uploads")));

  // User-configurable slides from store settings (falling back to DEFAULT_PROMOTIONAL_SLIDES)
  const configuredSlides: PromotionalSlide[] =
    settings.promotionalSlides !== undefined && settings.promotionalSlides !== null
      ? settings.promotionalSlides
      : DEFAULT_PROMOTIONAL_SLIDES;

  const slides: BannerSlide[] = useMemo(() => {
    return configuredSlides
      .filter((s) => s.isEnabled !== false)
      .map((s, idx) => {
        if (s.id === "slide-primary" || idx === 0) {
          return {
            id: s.id,
            tag: s.tag || props.tag || settings.heroBannerTag || primaryTag,
            title: s.title || props.title || settings.heroBannerTitle || primaryTitle,
            subtitle: s.subtitle || props.subtitle || settings.heroBannerSubtitle || primarySubtitle,
            code: s.code || "LUXE15",
            buttonText: s.buttonText || props.buttonText || settings.heroBannerButtonText || primaryButtonText,
            linkUrl: s.linkUrl || props.linkUrl || settings.heroBannerLink || primaryLink,
            icon: s.icon || "sparkles",
            imageUrl: s.imageUrl || (hasCustomGraphic ? customImage : undefined),
          };
        }
        return {
          id: s.id,
          tag: s.tag,
          title: s.title,
          subtitle: s.subtitle,
          code: s.code,
          buttonText: s.buttonText,
          linkUrl: s.linkUrl,
          icon: s.icon,
          imageUrl: s.imageUrl,
        };
      });
  }, [configuredSlides, props.tag, props.title, props.subtitle, props.buttonText, props.linkUrl, settings.heroBannerTag, settings.heroBannerTitle, settings.heroBannerSubtitle, settings.heroBannerButtonText, settings.heroBannerLink, primaryTag, primaryTitle, primarySubtitle, primaryButtonText, primaryLink, hasCustomGraphic, customImage]);

  const [[currentIndex, direction], setPage] = useState<[number, number]>([0, 0]);
  const [isHovered, setIsHovered] = useState(false);
  const isDraggingRef = useRef(false);

  // Advance to next slide
  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setPage(([curr]) => [(curr + 1) % slides.length, 1]);
  }, [slides.length]);

  // Previous slide
  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setPage(([curr]) => [(curr - 1 + slides.length) % slides.length, -1]);
  }, [slides.length]);

  // Jump to specific slide
  const goToSlide = (index: number) => {
    setPage(([curr]) => [index, index >= curr ? 1 : -1]);
  };

  // Auto-slide transition timer (pauses on hover)
  useEffect(() => {
    if (isHovered || speed <= 0 || transitionEffect === "marquee" || slides.length <= 1) return;
    const interval = setInterval(nextSlide, speed);
    return () => clearInterval(interval);
  }, [isHovered, nextSlide, speed, transitionEffect, slides.length]);

  if (slides.length === 0) return null;

  const safeIndex = currentIndex >= slides.length ? 0 : currentIndex;
  const currentSlide = slides[safeIndex] || slides[0];
  if (!currentSlide) return null;
  const isExternal = Boolean(currentSlide.linkUrl && (currentSlide.linkUrl.startsWith("http://") || currentSlide.linkUrl.startsWith("https://")));

  const renderIcon = (iconName?: string) => {
    switch (iconName) {
      case "truck":
        return <Truck className="size-3 text-gold" />;
      case "flame":
        return <Flame className="size-3 text-amber-400" />;
      case "watch":
        return <Watch className="size-3 text-amber-300" />;
      case "gift":
        return <Gift className="size-3 text-gold" />;
      case "tag":
        return <Tag className="size-3 text-gold" />;
      case "shield":
        return <ShieldCheck className="size-3 text-emerald-400" />;
      case "gem":
        return <Gem className="size-3 text-amber-300" />;
      default:
        return <Sparkles className="size-3 text-gold animate-pulse" />;
    }
  };

  // Continuous Infinite Sliding Ribbon Mode (Marquee)
  if (transitionEffect === "marquee") {
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative w-full overflow-hidden rounded-2xl border border-gold/50 bg-gradient-to-r from-[#17130e] via-[#241c13] to-[#17130e] text-pearl py-3.5 px-4 shadow-md group select-none ${props.className || ""}`}
      >
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-8 -left-8 size-32 rounded-full bg-gold/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-0 size-32 rounded-full bg-amber-500/10 blur-2xl" />

        {/* Edge Gradient Fades for Infinite Horizon Illusion */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-[#17130e] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-[#17130e] to-transparent z-10" />

        {/* Sweeping Shimmer Light Beam */}
        {showShimmer && (
          <motion.div
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              repeat: Infinity,
              duration: 3.5,
              ease: "easeInOut",
              repeatDelay: 1.5,
            }}
            className="pointer-events-none absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-10 will-change-transform"
          />
        )}

        <div className="flex overflow-hidden">
          <motion.div
            animate={isHovered ? {} : { x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 28,
            }}
            className="flex items-center gap-6 shrink-0 whitespace-nowrap will-change-transform"
          >
            {[...slides, ...slides].map((s, idx) => {
              const isExt = s.linkUrl.startsWith("http://") || s.linkUrl.startsWith("https://");
              const chip = (
                <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-gold/15 border border-white/10 hover:border-gold/50 transition-all text-xs cursor-pointer group/item">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-bold uppercase tracking-wider">
                    {renderIcon(s.icon)}
                    <span>{s.tag}</span>
                  </span>
                  <span className="font-semibold text-white tracking-tight text-xs sm:text-sm">{s.title}</span>
                  {s.code && (
                    <span className="px-2 py-0.5 rounded-md bg-gold/20 text-gold font-mono font-bold text-[10px] border border-gold/40">
                      CODE: {s.code}
                    </span>
                  )}
                  <span className="text-gold group-hover/item:text-pearl flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider transition-colors ml-1">
                    <span>{s.buttonText}</span>
                    <ArrowRight className="size-3 group-hover/item:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-gold/40 select-none pl-3 text-sm">✦</span>
                </div>
              );

              return isExt ? (
                <a key={`marquee-${s.id}-${idx}`} href={s.linkUrl} target="_blank" rel="noopener noreferrer">
                  {chip}
                </a>
              ) : (
                <Link key={`marquee-${s.id}-${idx}`} to={s.linkUrl as any}>
                  {chip}
                </Link>
              );
            })}
          </motion.div>
        </div>
      </div>
    );
  }

  // Content for current slide
  const slideContent = currentSlide.imageUrl ? (
    // Custom Graphic Image Slide
    <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-gold/40 shadow-sm group min-h-[75px] xs:min-h-[85px] sm:min-h-[125px]">
      <img
        src={currentSlide.imageUrl}
        alt={currentSlide.title}
        className="w-full h-auto max-h-[110px] sm:max-h-[170px] md:max-h-[190px] object-cover block"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  ) : (
    // Luxury Dynamic Panoramic Slide
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-gold/50 bg-gradient-to-r from-[#17130e] via-[#241c13] to-[#17130e] text-pearl px-2.5 py-1.5 xs:px-3 xs:py-2 sm:p-5 md:p-6 shadow-md hover:border-gold hover:shadow-lg transition-all min-h-[44px] xs:min-h-[48px] sm:min-h-[110px] flex flex-col justify-center">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-12 -left-12 size-48 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 right-0 size-48 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Sweeping Shimmer Light Beam (Desktop only to keep mobile 100% silk smooth) */}
      {showShimmer && (
        <motion.div
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 3.5,
            ease: "easeInOut",
            repeatDelay: 1.5,
          }}
          className="pointer-events-none absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 will-change-transform hidden sm:block"
        />
      )}

      <div className="relative z-10 flex flex-row items-center justify-between gap-2 sm:gap-4">
        {/* Left: Tagline, Promo Code & Title */}
        <div className="space-y-0.5 sm:space-y-1.5 max-w-2xl min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex items-center gap-1 px-1.5 xs:px-2 py-0.2 sm:py-0.5 rounded-full bg-gold/20 border border-gold/40 text-[7px] xs:text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-gold">
              {renderIcon(currentSlide.icon)}
              <span className="truncate max-w-[120px] sm:max-w-none">{currentSlide.tag}</span>
            </div>

            {currentSlide.code && (
              <div className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.2 sm:px-2 sm:py-1 rounded-md sm:rounded-xl bg-gold/15 border border-gold/40 text-[7px] xs:text-[8px] sm:text-[10px] font-mono font-bold text-gold shrink-0">
                <Tag className="size-2 sm:size-2.5 text-gold" />
                <span>{currentSlide.code}</span>
              </div>
            )}
          </div>

          <h3 className="font-serif text-[10px] xs:text-[11px] sm:text-base md:text-lg lg:text-xl font-bold text-white tracking-tight leading-tight truncate">
            {currentSlide.title}
          </h3>

          <p className="hidden sm:block text-[9.5px] xs:text-[10.5px] sm:text-xs text-pearl/80 leading-relaxed font-sans line-clamp-1 sm:line-clamp-2">
            {currentSlide.subtitle}
          </p>
        </div>

        {/* Right: CTA Button */}
        <div className="shrink-0">
          <span className="btn-gold btn-gold-hover px-2.5 xs:px-3 sm:px-4 py-1 sm:py-2 rounded-full text-[8px] xs:text-[9px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-sm group-hover:scale-[1.02] transition-transform shrink-0 cursor-pointer whitespace-nowrap">
            <span>{currentSlide.buttonText}</span>
            <ArrowRight className="size-2 sm:size-3 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>

      {/* Slide Progress Bar (animated countdown to next transition using GPU transform) */}
      {!isHovered && speed > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] sm:h-[2.5px] bg-white/10 overflow-hidden">
          <motion.div
            key={`progress-${safeIndex}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: speed / 1000, ease: "linear" }}
            style={{ transformOrigin: "left" }}
            className="h-full w-full bg-gradient-to-r from-gold via-amber-400 to-gold"
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full group select-none ${props.className || ""}`}
    >
      {/* Animated Transition Wrapper using AnimatePresence with popLayout for real sliding */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl min-h-[44px] xs:min-h-[48px] sm:min-h-[110px]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`slide-${currentSlide.id}-${safeIndex}`}
            custom={direction}
            variants={slideTransitionVariants[transitionEffect] as any}
            initial="enter"
            animate="center"
            exit="exit"
            drag={transitionEffect === "slide" ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => {
              isDraggingRef.current = true;
            }}
            onDragEnd={(_e, { offset, velocity }) => {
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 60);
              if (offset.x < -45 || velocity.x < -300) {
                nextSlide();
              } else if (offset.x > 45 || velocity.x > 300) {
                prevSlide();
              }
            }}
            className={`w-full ${transitionEffect === "slide" ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            {isExternal ? (
              <a
                href={currentSlide.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isDraggingRef.current) e.preventDefault();
                }}
                className="block focus:outline-none"
              >
                {slideContent}
              </a>
            ) : (
              <Link
                to={currentSlide.linkUrl as any}
                onClick={(e) => {
                  if (isDraggingRef.current) e.preventDefault();
                }}
                className="block focus:outline-none"
              >
                {slideContent}
              </Link>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Carousel Arrow Controls (Appear on hover) */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/60 hover:bg-gold hover:text-ink text-pearl border border-gold/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-xs shadow-md cursor-pointer"
              aria-label="Previous promotion"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 size-8 sm:size-9 rounded-full bg-black/60 hover:bg-gold hover:text-ink text-pearl border border-gold/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-xs shadow-md cursor-pointer"
              aria-label="Next promotion"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Mini Slide Dot Indicators & Pause Status */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 pt-0.5 sm:pt-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all rounded-full cursor-pointer ${
                idx === safeIndex
                  ? "w-4 sm:w-6 h-1 sm:h-1.5 bg-gold"
                  : "w-1 sm:w-1.5 h-1 sm:h-1.5 bg-border/80 hover:bg-gold/60"
              }`}
            />
          ))}
          {isHovered && (
            <span className="ml-2 text-[8px] sm:text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
              Paused
            </span>
          )}
        </div>
      )}
    </div>
  );
};
