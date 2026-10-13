import { useCart } from "@/lib/cart-context";
import { ShoppingBag, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { DealsBanner } from "./DealsBanner";
import { useState } from "react";

// ============================================================================
// TOP NAVIGATION BAR (NAVBAR) COMPONENT
// ============================================================================
// Fixed top header featuring:
// 1. Primary navigation (Home, All Products, Attars, Perfumes, Watches, About Us, Support).
// 2. Animated sales/deals ticker placed directly below the header links.
// 3. Shopping cart counter badge with micro-animation.
// 4. Responsive mobile drawer navigation.
export function Navbar() {
  const { count, setOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core navigation destinations (Careers is retained in footer only as requested)
  const NAV_LINKS = [
    { label: "Home", to: "/" },
    { label: "All Products", to: "/shop" },
    { label: "Attars", to: "/attars" },
    { label: "Perfumes", to: "/perfumes" },
    { label: "Watches", to: "/watches" },
    { label: "About Us", to: "/about" },
    { label: "Support", to: "/support" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-background/98 sm:bg-background/90 sm:backdrop-blur-md border-b border-border/20 shadow-sm">
      {/* =================================================================== */}
      {/* 1. TOP ROW: LOGO, DESKTOP LINKS, CART & MOBILE BUTTON               */}
      {/* =================================================================== */}
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-3 flex items-center justify-between">
        
        {/* Brand Wordmark Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img 
            src="/logo-wordmark.png" 
            alt="M.shaies Fragrances" 
            className="h-8 sm:h-11 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] drop-shadow-sm" 
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-7 text-xs uppercase tracking-wider font-semibold">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="relative text-ink/80 hover:text-gold-deep transition-colors py-1 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-[2px] after:w-0 after:bg-gold after:transition-all hover:after:w-full"
              activeProps={{ className: "text-gold-deep after:w-full font-bold" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Controls (Shopping Bag & Mobile Menu Toggle) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Shopping Cart Button with Animated Item Counter Badge */}
          <button
            onClick={() => setOpen(true)}
            className="relative size-10 sm:size-12 rounded-full grid place-items-center border border-border bg-card/80 hover:border-gold hover:shadow-md transition-all"
            aria-label="Open shopping cart"
          >
            <ShoppingBag className="size-4 sm:size-5 text-ink" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-gold text-[10px] font-bold text-ink grid place-items-center shadow-md"
              >
                {count}
              </motion.span>
            )}
          </button>

          {/* Mobile Menu Hamburger Button (Visible on screens < 1280px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden size-10 sm:size-11 rounded-full border border-border bg-card/80 grid place-items-center text-ink hover:border-gold transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. ANIMATED DEALS BANNER (Placed directly below the header menu)    */}
      {/* =================================================================== */}
      <DealsBanner />

      {/* =================================================================== */}
      {/* 3. MOBILE SLIDE-DOWN DRAWER MENU                                    */}
      {/* =================================================================== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="xl:hidden bg-background/98 backdrop-blur-2xl border-b border-gold/30 px-5 sm:px-6 py-5 shadow-2xl overflow-y-auto max-h-[calc(100dvh-5.5rem)] pb-8"
          >
            <div className="flex flex-col divide-y divide-border/40">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm sm:text-base uppercase tracking-wider text-ink/85 hover:text-gold-deep py-3.5 font-semibold transition-colors flex items-center justify-between min-h-[44px]"
                  activeProps={{ className: "text-gold-deep font-bold" }}
                >
                  <span>{link.label}</span>
                  <span className="text-gold opacity-60">→</span>
                </Link>
              ))}

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setOpen(true);
                  }}
                  className="flex-1 py-3 rounded-full border border-gold/40 bg-pearl text-xs uppercase tracking-wider font-bold text-ink flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
                >
                  <ShoppingBag className="size-4 text-gold-deep" />
                  Bag ({count})
                </button>
                <a
                  href="https://wa.me/923390001829?text=Assalam-o-Alaikum!%20I%20would%20like%20to%20inquire%20about%20M.shaies%20fragrances."
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 rounded-full bg-emerald-600 text-white text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-xs hover:bg-emerald-700 transition-colors min-h-[44px]"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
