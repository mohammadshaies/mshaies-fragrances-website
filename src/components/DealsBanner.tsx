import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Tag, Truck, Gift, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useProductsStore } from "@/lib/products-store";
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
  const [isVisible, setIsVisible] = useState(true);

  // Dynamic list of active store offers and policies
  const deals = [
    ...(settings.announcementActive ? [{
      icon: Tag,
      badge: "Active Offer",
      text: settings.announcementText,
      code: settings.announcementCode,
      linkText: "Shop Deal",
      linkTo: "/shop",
    }] : []),
    {
      icon: Truck,
      badge: "Nationwide Express",
      text: `Free Delivery across Pakistan on all orders over ${formatPKR(settings.freeShippingThreshold)}`,
      code: "AUTOMATIC",
      linkText: "Explore",
      linkTo: "/shop",
    },
    {
      icon: Sparkles,
      badge: "Artisanal Luxury",
      text: "100% Pure Alcohol-Free Attars & High-Concentration Extrait Parfums",
      code: "AUTHENTIC",
      linkText: "Shop Collection",
      linkTo: "/shop",
    },
  ];

  // Auto-rotate deals every 5 seconds
  useEffect(() => {
    if (!isVisible || deals.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % deals.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isVisible, deals.length]);

  if (!isVisible || deals.length === 0) return null;

  const safeIndex = currentIndex % deals.length;
  const currentDeal = deals[safeIndex];
  const Icon = currentDeal.icon;

  return (
    <div className="relative z-50 bg-[#16120b] text-white border-b border-gold/40 py-1.5 sm:py-2.5 px-2.5 sm:px-4 select-none shadow-md overflow-hidden">
      {/* High-visibility golden ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.22),transparent_70%)] pointer-events-none" />

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
              {/* Desktop Badge Tag */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold text-[#16120b] font-bold text-[10px] uppercase tracking-wider shadow-sm shrink-0">
                <Icon className="size-3" />
                <span>{currentDeal.badge}</span>
              </span>

              {/* Mobile Icon */}
              <span className="sm:hidden text-gold shrink-0">
                <Icon className="size-3" />
              </span>

              {/* Deal Description Text */}
              <span className="text-white/90 font-medium text-[10.5px] xs:text-[11.5px] sm:text-sm leading-tight truncate max-w-[190px] xs:max-w-[250px] sm:max-w-none">
                {currentDeal.text}
              </span>

              {/* Promo Code Chip */}
              {currentDeal.code && (
                <span className="shrink-0 border border-gold/60 text-gold px-1.5 py-0.2 rounded text-[9px] sm:text-[11px] font-mono font-bold tracking-wider bg-gold/10">
                  {currentDeal.code}
                </span>
              )}

              {/* Direct Shop Link */}
              <Link
                to={currentDeal.linkTo}
                className="shrink-0 inline-flex items-center gap-0.5 text-gold hover:text-white underline underline-offset-2 font-semibold text-[10.5px] sm:text-xs transition-colors"
              >
                <span>{currentDeal.linkText}</span>
                <ArrowRight className="size-2.5 sm:size-3" />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dismiss / Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="size-5 sm:size-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="size-3 sm:size-3.5" />
        </button>
      </div>
    </div>
  );
}
