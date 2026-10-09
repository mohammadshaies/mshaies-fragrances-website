import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, formatPKR } from "@/lib/cart-context";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, total, clear } = useCart();
  const freeShipping = total >= 5000;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-background p-0 h-[100dvh] max-h-[100dvh] shadow-2xl">
        <SheetHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b">
          <SheetTitle className="font-serif text-xl sm:text-2xl tracking-tight">Your Cart</SheetTitle>
          <div className="hairline-gold mt-3" />
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-20">
              <div className="size-16 rounded-full grid place-items-center bg-pearl border border-gold/30 shadow-xs">
                <ShoppingBag className="size-7 text-gold-deep" />
              </div>
              <p className="font-serif text-xl font-bold text-ink">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Discover our signature collection.</p>
            </div>
          ) : (
            <ul className="space-y-3.5">
              <AnimatePresence initial={false}>
                {items.map((i) => (
                  <motion.li
                    key={i.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex gap-3.5 p-3 rounded-2xl border border-border/80 bg-card shadow-xs items-center"
                  >
                    <div className="size-16 sm:size-20 shrink-0 rounded-xl bg-gradient-to-br from-pearl to-muted border border-gold/30 grid place-items-center overflow-hidden p-1.5">
                      {i.image ? (
                        <img src={i.image} alt={i.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="size-10 rounded-lg bg-gold/20 grid place-items-center text-gold-deep">
                          <ShoppingBag className="size-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-sm sm:text-base font-bold text-ink truncate">{i.name}</p>
                      {i.volume && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          {i.volume}
                        </span>
                      )}
                      <p className="text-sm font-bold text-gold-deep mt-0.5">{formatPKR(i.price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => setQty(i.id, i.qty - 1)}
                          className="size-10 sm:size-8 rounded-full border border-border grid place-items-center hover:border-gold hover:text-ink text-muted-foreground transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold tabular-nums text-ink">{i.qty}</span>
                        <button
                          onClick={() => setQty(i.id, i.qty + 1)}
                          className="size-10 sm:size-8 rounded-full border border-border grid place-items-center hover:border-gold hover:text-ink text-muted-foreground transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5" />
                        </button>
                        <button
                          onClick={() => remove(i.id)}
                          className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t px-4 sm:px-6 py-4 sm:py-5 space-y-3.5 bg-pearl/50 pb-safe">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-semibold">Subtotal</span>
              <span className="font-serif text-xl sm:text-2xl font-bold text-ink">{formatPKR(total)}</span>
            </div>
            <p className={`text-xs ${freeShipping ? "text-emerald-600 font-semibold" : "text-muted-foreground"}`}>
              {freeShipping
                ? "✓ You qualify for free nationwide shipping."
                : `Add ${formatPKR(5000 - total)} more for free shipping.`}
            </p>
            <Link
              to="/checkout"
              onClick={() => setOpen(false)}
              className="btn-gold btn-gold-hover w-full flex items-center justify-center text-center font-bold text-sm uppercase tracking-wider py-3.5 sm:py-4 shadow-lg"
            >
              Proceed to Checkout
            </Link>
            <button
              onClick={clear}
              className="w-full text-xs uppercase tracking-widest text-muted-foreground hover:text-ink transition-colors cursor-pointer text-center py-1"
            >
              Clear cart
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
