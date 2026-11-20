import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  Tag,
  ChevronLeft,
  ChevronRight,
  Truck,
  Flame,
  Watch,
  Gift,
  ShieldCheck,
  Gem,
} from "lucide-react";
import {
  useProductsStore,
  DEFAULT_PROMOTIONAL_SLIDES,
  PromotionalSlide,
  StoreSettings,
  hasCustomHeroBannerGraphic,
  shouldShowPromotionalBanner,
} from "@/lib/products-store";

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
  page?: "home" | "shop" | "attars" | "perfumes" | "watches" | "product";
  previewSettings?: Partial<StoreSettings>;
  forceVisible?: boolean;
}

export const PromotionalBanner: React.FC<Props> = (props) => {
  const { settings: storeSettings } = useProductsStore();
  const settings: StoreSettings = useMemo(
    () => ({
      ...storeSettings,
      ...(props.previewSettings || {}),
    }),
    [storeSettings, props.previewSettings]
  );

  // Resolve transition style
  const rawAnimation =
    props.animationType || settings.heroBannerTransitionEffect || settings.heroBannerAnimation || "slide";
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

  const speed =
    props.autoPlayInterval !== undefined
      ? props.autoPlayInterval
      : settings.heroBannerTransitionSpeed !== undefined
      ? Number(settings.heroBannerTransitionSpeed)
      : 4500;
  const showShimmer = settings.heroBannerShimmer !== false;

  // Custom primary offer configured in admin
  const primaryTitle =
    props.title ||
    settings.heroBannerTitle ||
    "Free Express Delivery Across Pakistan On Orders Over ₨ 5,000";
  const primaryTag =
    props.tag || settings.heroBannerTag || "Maison Exclusive · Limited Festive Release";
  const primarySubtitle =
    props.subtitle ||
    settings.heroBannerSubtitle ||
    "100% Alcohol-Free Pure Attar Oils & 35% Extrait Parfums. Use Code LUXE15 for Flat 15% OFF.";
  const primaryButtonText =
    props.buttonText || settings.heroBannerButtonText || "Claim Exclusive Offer →";
  const primaryCode = settings.heroBannerCode !== undefined ? settings.heroBannerCode : "LUXE15";
  const primaryLink = props.linkUrl || settings.heroBannerLink || "/shop";
  const customImage = props.imageUrl !== undefined ? props.imageUrl : settings.heroBannerImage;
  const hasCustomGraphic = hasCustomHeroBannerGraphic(customImage);

  // Display mode:
  // - "auto": if a custom graphic is uploaded, display it as a graphic banner; otherwise show slides
  // - "image": display uploaded picture banner only (no text clutter)
  // - "overlay": display uploaded picture with luxury text & button overlay
  // - "slides": display multi-slide promotional carousel
  const rawDisplayMode = settings.heroBannerDisplayMode || "auto";
  const effectiveDisplayMode: "image" | "overlay" | "slides" =
    rawDisplayMode === "image"
      ? "image"
      : rawDisplayMode === "overlay"
      ? "overlay"
      : rawDisplayMode === "slides"
      ? "slides"
      : hasCustomGraphic
      ? "image"
      : "slides";

  // Visual Customization Settings
  const bannerHeight = settings.heroBannerHeight || "auto";
  const imageFit = settings.heroBannerImageFit || "cover";
  const borderRadius = settings.heroBannerBorderRadius || "rounded";
  const borderStyle = settings.heroBannerBorderStyle || "gold";
  const overlayOpacity =
    settings.heroBannerOverlayOpacity !== undefined ? Number(settings.heroBannerOverlayOpacity) : 50;
  const textAlign = settings.heroBannerTextAlign || "left";
  const bannerTheme = settings.heroBannerTheme || "obsidian-gold";

  // User-configurable slides from store settings
  const configuredSlides: PromotionalSlide[] =
    settings.promotionalSlides !== undefined && settings.promotionalSlides !== null
      ? settings.promotionalSlides
      : DEFAULT_PROMOTIONAL_SLIDES;

  const slides: BannerSlide[] = useMemo(() => {
    // If mode is "image" or "overlay" and we have a custom graphic, create the primary graphic slide
    // plus any additional enabled slides if the user wants a multi-image carousel
    if ((effectiveDisplayMode === "image" || effectiveDisplayMode === "overlay") && hasCustomGraphic) {
      return [
        {
          id: "primary-uploaded-banner",
          tag: primaryTag,
          title: primaryTitle,
          subtitle: primarySubtitle,
          code: primaryCode,
          buttonText: primaryButtonText,
          linkUrl: primaryLink,
          icon: "sparkles",
          imageUrl: customImage,
        },
      ];
    }

    const enabledSlides = configuredSlides
      .filter((s) => s.isEnabled !== false)
      .map((s, idx) => {
        if (s.id === "slide-primary" || idx === 0) {
          return {
            id: s.id,
            tag: s.tag || primaryTag,
            title: s.title || primaryTitle,
            subtitle: s.subtitle || primarySubtitle,
            code: s.code !== undefined ? s.code : primaryCode,
            buttonText: s.buttonText || primaryButtonText,
            linkUrl: s.linkUrl || primaryLink,
            icon: s.icon || "sparkles",
            imageUrl:
              s.imageUrl ||
              (effectiveDisplayMode !== "slides" && hasCustomGraphic ? customImage : undefined),
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

    // Fallback: if all slides were deleted in "slides" or "overlay" mode, synthesize primary slide
    // so an enabled banner never disappears!
    if (enabledSlides.length === 0) {
      return [
        {
          id: "fallback-primary-slide",
          tag: primaryTag,
          title: primaryTitle,
          subtitle: primarySubtitle,
          code: primaryCode,
          buttonText: primaryButtonText,
          linkUrl: primaryLink,
          icon: "sparkles",
          imageUrl: hasCustomGraphic ? customImage : undefined,
        },
      ];
    }

    return enabledSlides;
  }, [
    configuredSlides,
    effectiveDisplayMode,
    hasCustomGraphic,
    customImage,
    primaryTag,
    primaryTitle,
    primarySubtitle,
    primaryCode,
    primaryButtonText,
    primaryLink,
  ]);

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

  // Visibility check (after all hooks)
  if (!props.forceVisible && !shouldShowPromotionalBanner(settings, props.page)) {
    return null;
  }

  if (slides.length === 0) return null;

  const safeIndex = currentIndex >= slides.length ? 0 : currentIndex;
  const currentSlide = slides[safeIndex] || slides[0];
  if (!currentSlide) return null;
  const isExternal = Boolean(
    currentSlide.linkUrl &&
      (currentSlide.linkUrl.startsWith("http://") || currentSlide.linkUrl.startsWith("https://"))
  );

  // Style helpers
  const radiusClass =
    borderRadius === "none"
      ? "rounded-none"
      : borderRadius === "pill"
      ? "rounded-2xl sm:rounded-3xl"
      : "rounded-xl sm:rounded-2xl";

  const borderClass =
    borderStyle === "glow"
      ? "border-2 border-gold shadow-[0_0_28px_rgba(212,175,55,0.32)]"
      : borderStyle === "minimal"
      ? "border border-border/70 shadow-xs"
      : borderStyle === "none"
      ? "border-0 shadow-none"
      : "border border-gold/50 shadow-md";

  const heightContainerClass =
    bannerHeight === "slim"
      ? "h-[90px] xs:h-[105px] sm:h-[140px] md:h-[160px]"
      : bannerHeight === "medium"
      ? "h-[125px] xs:h-[145px] sm:h-[200px] md:h-[235px]"
      : bannerHeight === "tall"
      ? "h-[165px] xs:h-[190px] sm:h-[270px] md:h-[320px]"
      : bannerHeight === "hero"
      ? "h-[210px] xs:h-[250px] sm:h-[360px] md:h-[430px]"
      : "h-auto";

  const objectFitClass =
    imageFit === "contain"
      ? "object-contain bg-[#16120b]"
      : imageFit === "fill"
      ? "object-fill"
      : "object-cover";

  const isLightTheme = bannerTheme === "pearl-light";
  const themeBgClass =
    bannerTheme === "emerald-royal"
      ? "bg-gradient-to-r from-[#061e17] via-[#0c3529] to-[#061e17] text-pearl"
      : bannerTheme === "crimson-velvet"
      ? "bg-gradient-to-r from-[#26080d] via-[#3d0e17] to-[#26080d] text-pearl"
      : bannerTheme === "midnight-noir"
      ? "bg-gradient-to-r from-[#09090b] via-[#18181b] to-[#09090b] text-pearl"
      : bannerTheme === "pearl-light"
      ? "bg-gradient-to-r from-[#faf6ef] via-[#f0e5d2] to-[#faf6ef] text-[#17130e]"
      : "bg-gradient-to-r from-[#17130e] via-[#241c13] to-[#17130e] text-pearl";

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

  // Continuous Infinite Sliding Ribbon Mode (Marquee) — only when in "slides" mode with marquee selected
  if (transitionEffect === "marquee" && effectiveDisplayMode === "slides") {
    return (
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative w-full overflow-hidden ${radiusClass} ${borderClass} ${themeBgClass} py-3.5 px-4 group select-none ${
          props.className || ""
        }`}
      >
        <div className="pointer-events-none absolute -top-8 -left-8 size-32 rounded-full bg-gold/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-0 size-32 rounded-full bg-amber-500/10 blur-2xl" />

        {showShimmer && (
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", repeatDelay: 1.5 }}
            className="pointer-events-none absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-10 will-change-transform"
          />
        )}

        <div className="flex overflow-hidden">
          <motion.div
            animate={isHovered ? {} : { x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 28 }}
            className="flex items-center gap-6 shrink-0 whitespace-nowrap will-change-transform"
          >
            {[...slides, ...slides].map((s, idx) => {
              const isExt = s.linkUrl.startsWith("http://") || s.linkUrl.startsWith("https://");
              const chip = (
                <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-gold/15 border border-gold/25 hover:border-gold/60 transition-all text-xs cursor-pointer group/item">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-bold uppercase tracking-wider">
                    {renderIcon(s.icon)}
                    <span>{s.tag}</span>
                  </span>
                  <span
                    className={`font-semibold tracking-tight text-xs sm:text-sm ${
                      isLightTheme ? "text-[#17130e]" : "text-white"
                    }`}
                  >
                    {s.title}
                  </span>
                  {s.code && (
                    <span className="px-2 py-0.5 rounded-md bg-gold/20 text-gold-deep sm:text-gold font-mono font-bold text-[10px] border border-gold/40">
                      CODE: {s.code}
                    </span>
                  )}
                  <span className="text-gold flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider transition-colors ml-1">
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

  // Determine how to render the active slide
  const shouldRenderPureImage =
    effectiveDisplayMode === "image" && Boolean(currentSlide.imageUrl || hasCustomGraphic);
  const shouldRenderImageOverlay =
    effectiveDisplayMode === "overlay" ||
    (effectiveDisplayMode === "slides" && Boolean(currentSlide.imageUrl) && Boolean(currentSlide.title));

  const activeImageUrl = currentSlide.imageUrl || (hasCustomGraphic ? customImage : "/product-box.jpg");

  let slideContent: React.ReactNode;

  if (shouldRenderPureImage) {
    // MODE 1: Uploaded Graphic Picture Banner Only (Crisp, Uncropped or Custom Sized)
    slideContent = (
      <div
        className={`relative w-full overflow-hidden ${radiusClass} ${borderClass} bg-[#16120b] group ${
          bannerHeight === "auto" ? "" : heightContainerClass
        }`}
      >
        <img
          src={activeImageUrl}
          alt={props.alt || settings.heroBannerAlt || currentSlide.title || "M.shaies Promotional Banner"}
          className={
            bannerHeight === "auto"
              ? `w-full h-auto max-h-[540px] ${imageFit === "contain" ? "object-contain" : "object-cover"} block`
              : `w-full h-full ${objectFitClass} block`
          }
        />

        {/* Optional Shimmer Sweep across Graphic Banner */}
        {showShimmer && (
          <motion.div
            animate={{ x: ["-100%", "220%"] }}
            transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", repeatDelay: 1.8 }}
            className="pointer-events-none absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 will-change-transform"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/15 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    );
  } else if (shouldRenderImageOverlay) {
    // MODE 2: Uploaded Picture + Custom Text, Promo Code & Action Button Overlay
    const alignWrapperClass =
      textAlign === "center"
        ? "items-center text-center justify-center"
        : textAlign === "right"
        ? "items-end text-right justify-between flex-row-reverse"
        : "items-center text-left justify-between";

    slideContent = (
      <div
        className={`relative w-full overflow-hidden ${radiusClass} ${borderClass} bg-[#16120b] text-pearl px-3.5 py-3 sm:p-6 md:p-8 flex flex-col justify-center ${
          bannerHeight === "auto" ? "min-h-[130px] sm:min-h-[210px] md:min-h-[250px]" : heightContainerClass
        }`}
      >
        {/* Background Uploaded Graphic */}
        <img
          src={activeImageUrl}
          alt={props.alt || settings.heroBannerAlt || currentSlide.title}
          className={`absolute inset-0 w-full h-full ${objectFitClass} pointer-events-none`}
        />

        {/* Customizable Dark Tint Overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity"
          style={{
            backgroundColor: `rgba(12, 10, 7, ${Math.min(0.92, Math.max(0, overlayOpacity / 100))})`,
          }}
        />

        {/* Shimmer Beam */}
        {showShimmer && (
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", repeatDelay: 1.5 }}
            className="pointer-events-none absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/12 to-transparent skew-x-12 will-change-transform hidden sm:block"
          />
        )}

        {/* Overlay Foreground Content */}
        <div
          className={`relative z-10 flex flex-col sm:flex-row gap-3 sm:gap-5 w-full ${alignWrapperClass}`}
        >
          <div
            className={`space-y-1 sm:space-y-2 max-w-2xl min-w-0 flex-1 ${
              textAlign === "center" ? "mx-auto flex flex-col items-center" : ""
            }`}
          >
            <div
              className={`flex items-center gap-1.5 flex-wrap ${
                textAlign === "center"
                  ? "justify-center"
                  : textAlign === "right"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {currentSlide.tag && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-xs border border-gold/50 text-[8px] xs:text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gold">
                  {renderIcon(currentSlide.icon)}
                  <span>{currentSlide.tag}</span>
                </div>
              )}

              {currentSlide.code && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold text-[#17130e] text-[8px] xs:text-[9px] sm:text-[10px] font-mono font-bold shrink-0 shadow-xs">
                  <Tag className="size-2.5 text-[#17130e]" />
                  <span>CODE: {currentSlide.code}</span>
                </div>
              )}
            </div>

            {currentSlide.title && (
              <h3 className="font-serif text-xs xs:text-sm sm:text-xl md:text-2xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
                {currentSlide.title}
              </h3>
            )}

            {currentSlide.subtitle && (
              <p className="text-[10px] sm:text-xs md:text-sm text-pearl/90 leading-relaxed font-sans line-clamp-2 drop-shadow">
                {currentSlide.subtitle}
              </p>
            )}
          </div>

          {currentSlide.buttonText && (
            <div className="shrink-0">
              <span className="btn-gold btn-gold-hover px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md group-hover:scale-[1.03] transition-transform cursor-pointer whitespace-nowrap">
                <span>{currentSlide.buttonText}</span>
                <ArrowRight className="size-3 sm:size-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    // MODE 3: Luxury Text & Offer Card / Carousel Slide
    const alignWrapperClass =
      textAlign === "center"
        ? "items-center text-center justify-center flex-col"
        : textAlign === "right"
        ? "items-center text-right justify-between flex-row-reverse"
        : "items-center text-left justify-between flex-row";

    slideContent = (
      <div
        className={`relative overflow-hidden ${radiusClass} ${borderClass} ${themeBgClass} px-3 py-2.5 xs:px-4 xs:py-3 sm:p-5 md:p-6 hover:border-gold transition-all flex flex-col justify-center ${
          bannerHeight === "auto"
            ? "min-h-[60px] xs:min-h-[68px] sm:min-h-[115px]"
            : heightContainerClass
        }`}
      >
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-12 -left-12 size-48 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-0 size-48 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Sweeping Shimmer Light Beam */}
        {showShimmer && (
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", repeatDelay: 1.5 }}
            className="pointer-events-none absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 will-change-transform hidden sm:block"
          />
        )}

        <div className={`relative z-10 flex gap-2.5 sm:gap-4 ${alignWrapperClass}`}>
          <div
            className={`space-y-0.5 sm:space-y-1.5 max-w-2xl min-w-0 flex-1 ${
              textAlign === "center" ? "mx-auto flex flex-col items-center" : ""
            }`}
          >
            <div
              className={`flex items-center gap-1.5 flex-wrap ${
                textAlign === "center"
                  ? "justify-center"
                  : textAlign === "right"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] xs:text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                  isLightTheme
                    ? "bg-[#17130e] text-gold border-[#17130e]/20"
                    : "bg-gold/20 border-gold/40 text-gold"
                }`}
              >
                {renderIcon(currentSlide.icon)}
                <span className="truncate max-w-[160px] sm:max-w-none">{currentSlide.tag}</span>
              </div>

              {currentSlide.code && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[8px] xs:text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
                    isLightTheme
                      ? "bg-gold/25 border-[#17130e]/30 text-[#17130e]"
                      : "bg-gold/15 border-gold/40 text-gold"
                  }`}
                >
                  <Tag className="size-2.5" />
                  <span>{currentSlide.code}</span>
                </div>
              )}
            </div>

            <h3
              className={`font-serif text-[11px] xs:text-xs sm:text-base md:text-lg lg:text-xl font-bold tracking-tight leading-snug ${
                isLightTheme ? "text-[#17130e]" : "text-white"
              }`}
            >
              {currentSlide.title}
            </h3>

            <p
              className={`hidden sm:block text-[10px] sm:text-xs leading-relaxed font-sans line-clamp-1 sm:line-clamp-2 ${
                isLightTheme ? "text-[#17130e]/75" : "text-pearl/80"
              }`}
            >
              {currentSlide.subtitle}
            </p>
          </div>

          <div className="shrink-0">
            <span className="btn-gold btn-gold-hover px-2.5 xs:px-3.5 sm:px-4 py-1 sm:py-2 rounded-full text-[8px] xs:text-[9px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 shadow-sm group-hover:scale-[1.02] transition-transform shrink-0 cursor-pointer whitespace-nowrap">
              <span>{currentSlide.buttonText}</span>
              <ArrowRight className="size-2.5 sm:size-3 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>

        {/* Slide Progress Bar */}
        {!isHovered && speed > 0 && slides.length > 1 && (
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
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full group select-none ${props.className || ""}`}
    >
      <div className={`relative overflow-hidden ${radiusClass}`}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`slide-${currentSlide.id}-${safeIndex}-${effectiveDisplayMode}`}
            custom={direction}
            variants={slideTransitionVariants[transitionEffect === "marquee" ? "slide" : transitionEffect] as any}
            initial="enter"
            animate="center"
            exit="exit"
            drag={transitionEffect === "slide" && slides.length > 1 ? "x" : false}
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
            className={`w-full ${
              transitionEffect === "slide" && slides.length > 1 ? "cursor-grab active:cursor-grabbing" : ""
            }`}
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
                to={(currentSlide.linkUrl || "/shop") as any}
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

        {/* Carousel Arrow Controls (Appear on hover when multiple slides) */}
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
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 pt-1 sm:pt-1.5">
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
