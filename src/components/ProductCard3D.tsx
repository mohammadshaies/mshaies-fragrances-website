import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Plus, Eye, AlertCircle, ShoppingBag, ArrowUpRight } from "lucide-react";
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

  // Normalized Cursor Coordinates (-0.5 to +0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Silky Smooth Luxury Spring Physics (High damping for elegant, controlled motion)
  const springX = useSpring(mouseX, { stiffness: 200, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 28 });

  // 1. REFINED & SUBTLE WHOLE CARD 3D TILT (Controlled ±9 degrees for luxury feel)
  const cardRotateX = useTransform(springY, [-0.5, 0.5], ["9deg", "-9deg"]);
  const cardRotateY = useTransform(springX, [-0.5, 0.5], ["-9deg", "9deg"]);
  const cardScale = useTransform(springX, [-0.5, 0, 0.5], [1.015, 1.025, 1.015]);
  const cardTranslateY = useTransform(springY, [-0.5, 0.5], [-6, -2]);

  // 2. GENTLE & ELEGANT 4D BOTTLE DRIFT (Subtle ±10px repulsion)
  const imageRepelX = useTransform(springX, [-0.5, 0.5], [10, -10]);
  const imageRepelY = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const imageScale = useTransform(springX, [-0.5, 0, 0.5], [1.06, 1.08, 1.06]);

  // 3. SUBTLE TEXT & BADGE PARALLAX
  const textShiftX = useTransform(springX, [-0.5, 0.5], [-4, 4]);
  const textShiftY = useTransform(springY, [-0.5, 0.5], [-3, 3]);
  const badgeShiftX = useTransform(springX, [-0.5, 0.5], [-6, 6]);
  const badgeShiftY = useTransform(springY, [-0.5, 0.5], [-6, 6]);

  // 4. SOFT SPECULAR GOLD GLARE
  const glareX = useTransform(springX, [-0.5, 0.5], ["10%", "90%"]);
  const glareY = useTransform(springY, [-0.5, 0.5], ["10%", "90%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  // Mobile Friendly Touch Gestures (Gentle feedback without interfering with scrolling)
  const handleTouchStart = () => setIsHovered(true);
  const handleTouchEnd = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
      className="perspective-1000 w-full"
    >
      {/* WHOLE CARD 3D CONTAINER - Silky Smooth Luxury Physics */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          rotateX: isHovered ? cardRotateX : 0,
          rotateY: isHovered ? cardRotateY : 0,
          scale: isHovered ? cardScale : 1,
          y: isHovered ? cardTranslateY : 0,
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
          transition: isHovered ? "none" : "transform 0.45s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease",
        }}
        className="group relative rounded-2xl sm:rounded-3xl bg-card border border-border/80 hover:border-gold/60 transition-colors duration-300 flex flex-col h-full select-none cursor-pointer shadow-xs hover:shadow-[0_20px_40px_rgba(212,175,55,0.16)]"
      >
        {/* Soft Holographic Specular Glare */}
        <motion.div
          className="pointer-events-none absolute -inset-px z-30 opacity-0 group-hover:opacity-40 transition-opacity duration-400 rounded-2xl sm:rounded-3xl"
          style={{
            background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(246, 209, 85, 0.35) 0%, rgba(255,255,255,0.08) 25%, transparent 60%)`,
          }}
        />

        {/* TOP HALF: 3D Stage & Floating Bottle */}
        <div 
          style={{ transform: "translateZ(15px)", transformStyle: "preserve-3d" }}
          className="relative h-44 xs:h-52 sm:h-72 md:h-80 overflow-hidden rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-pearl/80 via-pearl/40 to-muted/60 flex items-center justify-center p-3 xs:p-4 sm:p-5"
        >
          {/* Ambient Warm Golden Aura */}
          <div className="absolute size-32 xs:size-40 sm:size-52 rounded-full bg-gold/15 blur-xl group-hover:bg-gold/25 transition-all duration-500 pointer-events-none" />

          {/* Floating Parallax Badges Header (Depth: 45px) */}
          <motion.div 
            style={{ 
              x: isHovered ? badgeShiftX : 0,
              y: isHovered ? badgeShiftY : 0,
              transform: isHovered ? "translateZ(45px)" : "translateZ(0px)",
              transition: isHovered ? "none" : "transform 0.4s ease",
            }}
            className="absolute top-2 inset-x-2 sm:top-3.5 sm:inset-x-3.5 z-20 flex items-start justify-between gap-1 pointer-events-none"
          >
            {/* Stock status (Sold Out / Low Stock) */}
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

            {/* Category Tag */}
            <span className="text-[8.5px] sm:text-[11px] uppercase tracking-widest text-gold-deep font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-background/95 backdrop-blur-md border border-gold/30 shadow-xs whitespace-nowrap shrink-0">
              {product.category}
            </span>
          </motion.div>

          {/* Smooth Controlled Bottle Drift (Depth: 35px) */}
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

          {/* Subtle Hover Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />

          {/* Quick Action Buttons (Desktop Hover Only) */}
          <div 
            style={{ 
              transform: isHovered ? "translateZ(50px)" : "translateZ(0px)",
              transition: isHovered ? "transform 0.3s ease" : "none" 
            }}
            className="hidden sm:flex absolute inset-x-4 bottom-4 gap-2 translate-y-[135%] group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(.25,1,.5,1)] z-20"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                add({ id: product.id, name: product.name, price: product.price });
                toast.success(`Added ${product.name} to shopping bag!`);
              }}
              disabled={isOutOfStock}
              className="flex-1 glass-card rounded-full py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-ink font-bold hover:bg-gold hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xl whitespace-nowrap cursor-pointer"
            >
              <Plus className="size-3.5 shrink-0" />
              <span>{isOutOfStock ? "Sold Out" : "Add to Cart"}</span>
            </button>
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              onClick={(e) => e.stopPropagation()}
              className="size-10 rounded-full glass-card flex items-center justify-center text-ink hover:bg-gold transition-colors shadow-xl shrink-0"
              title="View Fragrance Notes"
            >
              <Eye className="size-4" />
            </Link>
          </div>
        </div>

        {/* BOTTOM HALF: Information & Details (Depth: 20px) */}
        <motion.div 
          style={{
            x: isHovered ? textShiftX : 0,
            y: isHovered ? textShiftY : 0,
            transform: isHovered ? "translateZ(20px)" : "translateZ(0px)",
            transformStyle: "preserve-3d",
            transition: isHovered ? "none" : "all 0.45s ease",
          }}
          className="p-3 xs:p-3.5 sm:p-6 flex flex-col flex-1 justify-between bg-card rounded-b-2xl sm:rounded-b-3xl"
        >
          <div>
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              className="font-serif text-sm sm:text-base lg:text-lg text-ink hover:text-gold-deep transition-colors truncate block font-bold leading-tight"
              title={product.name}
            >
              {product.name}
            </Link>

            <p className="font-serif text-sm sm:text-base lg:text-lg text-ink font-bold mt-1.5 sm:mt-2">
              {formatPKR(product.price)}
            </p>
          </div>

          {/* Mobile Full-Width Add to Cart & Desktop Explore Notes Link */}
          <div className="mt-2.5 pt-2 sm:mt-4 sm:pt-3 border-t border-border/40">
            {/* Mobile 1-Tap Add to Cart */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                add({ id: product.id, name: product.name, price: product.price });
                toast.success(`Added ${product.name} to shopping bag!`);
              }}
              disabled={isOutOfStock}
              className="sm:hidden w-full btn-gold btn-gold-hover py-1.5 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition-all disabled:opacity-40 cursor-pointer min-h-[32px] whitespace-nowrap"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="size-3 shrink-0" />
              <span>{isOutOfStock ? "Sold Out" : "Add to Cart"}</span>
            </button>

            {/* View Details Link on Desktop */}
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              className="hidden sm:flex text-gold-deep hover:underline text-[11px] uppercase tracking-wider font-bold items-center justify-between"
            >
              <span>View Details</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
