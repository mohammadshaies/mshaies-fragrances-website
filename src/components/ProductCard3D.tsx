import { Plus, AlertCircle, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart, formatPKR } from "@/lib/cart-context";
import type { Product } from "@/lib/products-store";
import { toast } from "sonner";

interface ProductCard3DProps {
  product: Product;
  index?: number;
}

export function ProductCard3D({ product }: ProductCard3DProps) {
  const { add } = useCart();

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
    <div className="group relative rounded-2xl sm:rounded-3xl bg-card border border-border/80 hover:border-gold/60 transition-colors duration-200 flex flex-col h-full shadow-xs hover:shadow-[0_16px_36px_rgba(212,175,55,0.15)] overflow-hidden">
      {/* 
        Native HTML Link Wrapper for the entire top & content area.
        Ensures 1-touch instant navigation on iOS Safari & Android Chrome
        without being hijacked by CSS hover zoom states.
      */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="flex flex-col flex-1 cursor-pointer no-underline text-inherit"
        aria-label={`View ${product.name}`}
      >
        {/* TOP HALF: Product Image & Badges */}
        <div className="relative h-44 xs:h-52 sm:h-72 md:h-80 overflow-hidden rounded-t-2xl sm:rounded-t-3xl bg-gradient-to-b from-pearl/80 via-pearl/40 to-muted/60 flex items-center justify-center p-3 xs:p-4 sm:p-5">
          {/* Ambient Warm Golden Aura */}
          <div className="absolute size-32 xs:size-40 sm:size-52 rounded-full bg-gold/15 blur-xl group-hover:bg-gold/25 transition-all duration-300 pointer-events-none" />

          {/* Floating Badges */}
          <div className="absolute top-2 inset-x-2 sm:top-3.5 sm:inset-x-3.5 z-20 flex items-start justify-between gap-1 pointer-events-none">
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
          </div>

          {/* Product Image — only subtle scale on desktop mouse hover, NEVER on mobile tap */}
          <div className="w-full h-full flex items-center justify-center pointer-events-none">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] max-h-[135px] xs:max-h-[165px] sm:max-h-none transition-transform duration-300 sm:group-hover:scale-105"
            />
          </div>
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
    </div>
  );
}
