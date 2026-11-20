import { useState, useEffect, useMemo } from "react";
import { Sparkles, ArrowRight, Tag, Truck, Gift, Flame, ShieldCheck, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useProductsStore, DEFAULT_ANNOUNCEMENT_ITEMS, AnnouncementItem } from "@/lib/products-store";
import { formatPKR } from "@/lib/cart-context";

// ============================================================================
// DEALS & ANNOUNCEMENT BANNER COMPONENT
// ============================================================================
// Positioned directly below the top navigation bar.
// Features:
// 1. Auto-rotating offer ticker that slides a new offer every 5 seconds.
// 2. Highlights active store promotions (configured from Admin panel),
//    Nationwide Free Delivery threshold, and complimentary gift offerings.
// 3. One-click dismiss option with smooth Framer Motion exit animation.
export function DealsBanner() {
  const { settings } = useProductsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("mshaies_announcement_dismissed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  // Icon mapping helper
  const resolveIcon = (iconName?: string) => {
    switch (iconName) {
      case "truck":
        return Truck;
      case "gift":
        return Gift;
      case "sparkles":
        return Sparkles;
      case "flame":
        return Flame;
      case "shield":
        return ShieldCheck;
      case "tag":
      default:
        return Tag;
    }
  };

  const configuredItems: AnnouncementItem[] =
    settings.announcementItems !== undefined && settings.announcementItems !== null
      ? settings.announcementItems
      : DEFAULT_ANNOUNCEMENT_ITEMS;

  const deals = useMemo(() => {
    const activeItems = configuredItems
      .filter((item) => item.isEnabled !== false)
      .map((item) => ({
        id: item.id,
        icon: resolveIcon(item.icon),
        badge: item.badge,
        text: item.text,
        code: item.code,
        linkText: item.linkText || "Shop Deal",
        linkTo: item.linkTo || "/shop",
        imageUrl: item.imageUrl,
      }));

    if (activeItems.length === 0 && settings.announcementText) {
      return [
        {
          id: "fallback-primary",
          icon: Sparkles,
          badge: "Maison Offer",
          text: settings.announcementText,
          code: settings.announcementCode,
          linkText: "Shop Now",
          linkTo: "/shop",
          imageUrl: undefined,
        },
      ];
    }
    return activeItems;
  }, [configuredItems, settings.announcementText, settings.announcementCode]);

  const rotationSpeed = settings.announcementSpeed !== undefined ? Number(settings.announcementSpeed) : 5000;
  const isDismissible = settings.announcementDismissible !== false;
  const theme = settings.announcementTheme || "obsidian-gold";

  // Auto-rotate deals
  useEffect(() => {
    if (deals.length <= 1 || rotationSpeed <= 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % deals.length);
    }, rotationSpeed);
    return () => clearInterval(interval);
  }, [deals.length, rotationSpeed]);

  // CRITICAL: All hooks must execute on every render; early returns only happen after hooks
  if (!settings.announcementActive || (isDismissible && isDismissed) || deals.length === 0) {
    return null;
  }

  const safeIndex = currentIndex % deals.length;
  const currentDeal = deals[safeIndex];
  const Icon = currentDeal.icon;

  const themeClasses =
    theme === "gold-solid"
      ? "bg-gradient-to-r from-[#b8923a] via-[#d4af37] to-[#b8923a] text-[#16120b] border-b border-[#16120b]/20"
      : theme === "emerald-royal"
      ? "bg-gradient-to-r from-[#071f18] via-[#0c3126] to-[#071f18] text-white border-b border-emerald-400/40"
      : theme === "crimson-velvet"
      ? "bg-gradient-to-r from-[#28090e] via-[#3f0e17] to-[#28090e] text-white border-b border-rose-400/40"
      : "bg-[#16120b] text-white border-b border-gold/40";

  const isLightTheme = theme === "gold-solid";

  return (
    <div
      className={`relative z-50 ${themeClasses} py-1.5 sm:py-2.5 px-2.5 sm:px-4 select-none shadow-md overflow-hidden bg-cover bg-center`}
      style={settings.announcementBackgroundImage ? { backgroundImage: `url(${settings.announcementBackgroundImage})` } : undefined}
    >
      {/* High-visibility golden ambient glow */}
      {!isLightTheme && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22),transparent_70%)] pointer-events-none" />
      )}

      <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 sm:gap-3 text-xs sm:text-sm font-medium">
        {/* Animated Deal Content Container */}
        <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={safeIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-1.5 sm:gap-3 text-center overflow-hidden"
            >
              {/* Optional Custom Graphic Thumbnail */}
              {currentDeal.imageUrl && (
                <img
                  src={currentDeal.imageUrl}
                  alt={currentDeal.badge}
                  className="size-5 sm:size-6 rounded-md object-cover border border-gold/60 shadow-xs shrink-0"
                />
              )}

              {/* Desktop Badge Tag */}
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider shadow-sm shrink-0 ${
                  isLightTheme ? "bg-[#16120b] text-gold" : "bg-gold text-[#16120b]"
                }`}
              >
                {!currentDeal.imageUrl && <Icon className="size-3" />}
                <span>{currentDeal.badge}</span>
              </span>

              {/* Mobile Icon */}
              {!currentDeal.imageUrl && (
                <span className={`sm:hidden shrink-0 ${isLightTheme ? "text-[#16120b]" : "text-gold"}`}>
                  <Icon className="size-3" />
                </span>
              )}

              {/* Deal Description Text */}
              <span
                className={`font-medium text-[10.5px] xs:text-[11.5px] sm:text-sm leading-tight truncate max-w-[190px] xs:max-w-[250px] sm:max-w-none ${
                  isLightTheme ? "text-[#16120b] font-semibold" : "text-white/90"
                }`}
              >
                {currentDeal.text}
              </span>

              {/* Promo Code Chip */}
              {currentDeal.code && (
                <span
                  className={`shrink-0 px-1.5 py-0.2 rounded text-[9px] sm:text-[11px] font-mono font-bold tracking-wider ${
                    isLightTheme
                      ? "border border-[#16120b]/40 text-[#16120b] bg-[#16120b]/10"
                      : "border border-gold/60 text-gold bg-gold/10"
                  }`}
                >
                  {currentDeal.code}
                </span>
              )}

              {/* Direct Shop Link */}
              <Link
                to={currentDeal.linkTo}
                className={`shrink-0 inline-flex items-center gap-0.5 underline underline-offset-2 font-semibold text-[10.5px] sm:text-xs transition-colors ${
                  isLightTheme ? "text-[#16120b] hover:text-black font-bold" : "text-gold hover:text-white"
                }`}
              >
                <span>{currentDeal.linkText}</span>
                <ArrowRight className="size-2.5 sm:size-3" />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dismiss / Close Button */}
        {isDismissible && (
          <button
            onClick={() => {
              setIsDismissed(true);
              try {
                sessionStorage.setItem("mshaies_announcement_dismissed", "true");
              } catch {
                // ignore
              }
            }}
            className={`size-5 sm:size-6 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              isLightTheme
                ? "hover:bg-black/10 text-[#16120b]/70 hover:text-[#16120b]"
                : "hover:bg-white/10 text-white/50 hover:text-white"
            }`}
            aria-label="Dismiss banner"
          >
            <X className="size-3 sm:size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
