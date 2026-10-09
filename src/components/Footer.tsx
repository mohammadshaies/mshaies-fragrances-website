import { Truck, Instagram, Facebook, Mail, ShieldCheck, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer id="contact" className="bg-background pt-8 sm:pt-14 pb-6 sm:pb-8 border-t border-border/30">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        
        {/* Streamlined Trust Banner */}
        <div className="rounded-2xl border border-gold/40 bg-pearl/60 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mb-8 sm:mb-12 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="size-10 rounded-full bg-gold/15 grid place-items-center border border-gold/40 shrink-0">
              <Truck className="size-4 text-gold-deep" />
            </div>
            <p className="font-serif text-sm sm:text-base text-ink">
              Free Nationwide Shipping across Pakistan on all orders over{" "}
              <span className="gold-gradient-text font-bold">₨ 5,000</span>.
            </p>
          </div>
          <Link
            to="/shop"
            className="text-xs uppercase tracking-widest font-bold text-gold-deep hover:underline shrink-0"
          >
            Order Now →
          </Link>
        </div>

        {/* Clean 4-Column Grid with Center Alignment on Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12 text-center sm:text-left">
          
          {/* Brand Info */}
          <div className="sm:col-span-2 md:col-span-1 space-y-3 flex flex-col items-center sm:items-start">
            <img 
              src="/logo-wordmark.png" 
              alt="M.shaies Fragrances" 
              className="h-10 w-auto object-contain mx-auto sm:mx-0" 
            />
            <p className="text-xs text-muted-foreground leading-relaxed pt-1 max-w-sm mx-auto sm:mx-0">
              Maison of signature pure attars, extrait perfumes, and luxury timepieces hand-poured in Pakistan and delivered nationwide.
            </p>
          </div>

          {/* Column 1: Collections */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink font-bold mb-3.5">
              Collections
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/shop" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/attars" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  Pure Attar Oils
                </Link>
              </li>
              <li>
                <Link to="/perfumes" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  Luxury Perfumes (EDP)
                </Link>
              </li>
              <li>
                <Link to="/watches" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  Maison Watches
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Maison Heritage & Careers */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink font-bold mb-3.5">
              Maison & Careers
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  About Us & Story
                </Link>
              </li>
              <li>
                <Link to="/journey" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  The Scent Journey
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-gold-deep hover:underline font-semibold transition-colors inline-flex items-center gap-1 justify-center sm:justify-start">
                  Careers (We're Hiring) ✨
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-ink font-bold mb-3.5">
              Customer Support
            </p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/support" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  Help & FAQs
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="text-muted-foreground hover:text-gold-deep transition-colors">
                  Secure Checkout
                </Link>
              </li>
              <li>
                <a 
                  href="https://wa.me/923390001826" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-600 hover:underline font-medium inline-flex items-center gap-1.5"
                >
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  WhatsApp (+92 339 0001826)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="hairline-gold my-5 sm:my-8 opacity-40" />

        {/* Bottom Copyright, Social Links & Staff Portal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground text-center sm:text-left">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} M.shaies Fragrances. Pakistan. Delivering Nationwide.
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-5">
            {/* Official Social Media Channels */}
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/m.shaiesfragrances"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full border border-border/80 hover:border-gold hover:text-gold-deep hover:bg-gold/10 grid place-items-center text-ink/80 transition-all shadow-xs"
                title="Follow M.shaies on Instagram"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61575714252560"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full border border-border/80 hover:border-gold hover:text-gold-deep hover:bg-gold/10 grid place-items-center text-ink/80 transition-all shadow-xs"
                title="Follow M.shaies on Facebook"
                aria-label="Facebook"
              >
                <Facebook className="size-4" />
              </a>
              <a
                href="https://www.tiktok.com/@mshaiesfragrances"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full border border-border/80 hover:border-gold hover:text-gold-deep hover:bg-gold/10 grid place-items-center text-ink/80 transition-all shadow-xs"
                title="Follow M.shaies on TikTok"
                aria-label="TikTok"
              >
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.86-4.48V8.75a8.28 8.28 0 0 0 4.84 1.57V6.87a4.85 4.85 0 0 1-.93-.18Z" />
                </svg>
              </a>
              <a
                href="https://wa.me/923390001826"
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-full border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 grid place-items-center transition-all shadow-xs"
                title="Chat on WhatsApp (+92 339 0001826)"
                aria-label="WhatsApp"
              >
                <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.03 2.6.13.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.29" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
