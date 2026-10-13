import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Plus, AlertCircle, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart, formatPKR } from "@/lib/cart-context";
import type { Product } from "@/lib/products-store";
import { toast } from "sonner";

interface ProductCard3DProps {
  product: Product;
  index?: number;
}

export function ProductCard3D({ product, index = 0 }: ProductCard3DProps) {
  const { add } = useCart();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect whether device has a pointer/mouse (PC desktop/laptop) vs touchscreen (mobile)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Normalized Cursor Coordinates (-0.5 to +0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Silky Smooth Luxury Spring Physics for PC
  const springX = useSpring(mouseX, { stiffness: 220, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 220, damping: 28 });

  // 1. REFINED WHOLE CARD 3D TILT (PC only)
  const cardRotateX = useTransform(springY, [-0.5, 0.5], ["9deg", "-9deg"]);
  const cardRotateY = useTransform(springX, [-0.5, 0.5], ["-9deg", "9deg"]);
  const cardScale = useTransform(springX, [-0.5, 0, 0.5], [1.02, 1.03, 1.02]);
  const cardTranslateY = useTransform(springY, [-0.5, 0.5], [-6, -2]);

  // 2. GENTLE 3D BOTTLE DRIFT (PC only)
  const imageRepelX = useTransform(springX, [-0.5, 0.5], [10, -10]);
  const imageRepelY = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const imageScale = useTransform(springX, [-0.5, 0, 0.5], [1.06, 1.08, 1.06]);

  // 3. SUBTLE BADGE PARALLAX (PC only)
  const badgeShiftX = useTransform(springX, [-0.5, 0.5], [-5, 5]);
  const badgeShiftY = useTransform(springY, [-0.5, 0.5], [-5, 5]);

  // 4. SOFT SPECULAR GOLD GLARE (PC only)
  const glareX = useTransform(springX, [-0.5, 0.5], ["10%", "90%"]);
  const glareY = useTransform(springY, [-0.5, 0.5], ["10%", "90%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDesktop || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => {
    if (isDesktop) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isDesktop) {
      setIsHovered(false);
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    add({ id: product.id, name: product.name, price: product.price });
    toast.success(`Added ${product.name} to shopping bag!`);
  };

  return (
    <div className="perspective-1000 w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={isDesktop ? handleMouseMove : undefined}
        onMouseEnter={isDesktop ? handleMouseEnter : undefined}
        onMouseLeave={isDesktop ? handleMouseLeave : undefined}
        style={{
          transformStyle: isDesktop ? "preserve-3d" : "flat",
          rotateX: isDesktop && isHovered ? cardRotateX : 0,
          rotateY: isDesktop && isHovered ? cardRotateY : 0,
          scale: isDesktop && isHovered ? cardScale : 1,
          y: isDesktop && isHovered ? cardTranslateY : 0,
          transition: isDesktop && isHovered ? "none" : "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
        className="group relative rounded-2xl sm:rounded-3xl bg-card border border-border/80 hover:border-gold/60 transition-colors duration-200 flex flex-col h-full shadow-xs hover:shadow-[0_20px_40px_rgba(212,175,55,0.18)] overflow-hidden"
      >
        {/* Specular Gold Glare on PC Hover */}
        {isDesktop && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-300 rounded-2xl sm:rounded-3xl"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(246, 209, 85, 0.35) 0%, rgba(255,255,255,0.08) 25%, transparent 60%)`,
            }}
          />
        )}

        {/* 
          Native HTML Link Wrapper for the entire top & content area.
          Ensures 1-touch instant navigation on mobile (no zoom hops/delays)
          and direct navigation on PC click.
        */}
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className="flex flex-col flex-1 cursor-pointer no-underline text-inherit"
          aria-label={`View ${product.name}`}
        >
          {/* TOP HALF: Product Image & Badges */}
          <div
            style={isDesktop ? { transform: "translateZ(15px)", transformStyle: "preserve-3d" } : undefined}
            className="relative h-44 xs:h-52 sm:h-72 md:h-80 overflow-hidden rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-pearl/80 via-pearl/40 to-muted/60 flex items-center justify-center p-3 xs:p-4 sm:p-5"
          >
            {/* Ambient Warm Golden Aura */}
            <div className="absolute size-32 xs:size-40 sm:size-52 rounded-full bg-gold/15 blur-xl group-hover:bg-gold/25 transition-all duration-300 pointer-events-none" />

            {/* Floating Badges */}
            <motion.div
              style={isDesktop ? {
                x: isHovered ? badgeShiftX : 0,
                y: isHovered ? badgeShiftY : 0,
                transform: isHovered ? "translateZ(40px)" : "translateZ(0px)",
                transition: isHovered ? "none" : "transform 0.4s ease",
              } : undefined}
              className="absolute top-2 inset-x-2 sm:top-3.5 sm:inset-x-3.5 z-20 flex items-start justify-between gap-1 pointer-events-none"
            >
              <div className="flex flex-col gap-1 min-w-0">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 text-[8.5px] sm:text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-destructive/90 text-white border border-destructive/30 backdrop-blur-md shadow-xs whitespace-nowrap">
                    Sold Out
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[9.5px] uppercase tracking-wider font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full bg-amber-500/90 text-white border border-amber-500/30 backdrop-blur-md shadow-xs whitespace-nowrap">
                    <AlertCircle className="size-2.5 shrink-0" />
                    <span><span className="hidden min-[380px]:inline">Only </span>{product.stock} left</span>
                  </span>
                ) : null}
              </div>

              <span className="text-[8.5px] sm:text-[11px] uppercase tracking-widest text-gold-deep font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-background/95 backdrop-blur-md border border-gold/30 shadow-xs whitespace-nowrap shrink-0">
                {product.category}
              </span>
            </motion.div>

            {/* Product Image — 3D drift on PC, clean static image on mobile */}
            {isDesktop ? (
              <motion.div
                style={{
                  x: isHovered ? imageRepelX : 0,
                  y: isHovered ? imageRepelY : 0,
                  scale: isHovered ? imageScale : 1,
                  transform: isHovered ? "translateZ(35px)" : "translateZ(0px)",
                  transition: isHovered ? "none" : "all 0.45s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
                className="w-full h-full flex items-center justify-center pointer-events-none"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] max-h-[135px] xs:max-h-[165px] sm:max-h-none"
                />
              </motion.div>
            ) : (
              <div className="w-full h-full flex items-center justify-center pointer-events-none">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] max-h-[135px] xs:max-h-[165px] sm:max-h-none"
                />
              </div>
            )}
          </div>

          {/* DETAILS: Name & Price */}
          <div className="p-3 xs:p-3.5 sm:p-5 flex flex-col flex-1 justify-between bg-card">
            <div>
              <h3
                className="font-serif text-sm sm:text-base lg:text-lg text-ink group-hover:text-gold-deep transition-colors truncate block font-bold leading-tight"
                title={product.name}
              >
                {product.name}
              </h3>

              <p className="font-serif text-sm sm:text-base lg:text-lg text-ink font-bold mt-1.5 sm:mt-2">
                {formatPKR(product.price)}
              </p>
            </div>

            {/* Desktop details indicator */}
            <div className="hidden sm:flex text-gold-deep group-hover:underline text-[11px] uppercase tracking-wider font-bold items-center justify-between mt-3 pt-2 border-t border-border/40">
              <span>View Notes & Details</span>
              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
        </Link>

        {/* BOTTOM ACTION: Add to Cart Button (Completely outside the link for clean event separation) */}
        <div className="p-3 pt-0 xs:px-3.5 xs:pb-3.5 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full btn-gold btn-gold-hover py-2 px-3 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 cursor-pointer min-h-[36px] sm:min-h-[40px] whitespace-nowrap active:scale-95"
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus className="size-3.5 shrink-0" />
            <span>{isOutOfStock ? "Sold Out" : "Add to Cart"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
