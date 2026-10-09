import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Heart, ShieldCheck, Truck, Droplets } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story & Heritage — M.shaies Haute Parfumerie Pakistan" },
      { 
        name: "description", 
        content: "Discover the human journey behind M.shaies Fragrances. Handcrafted pure attars, high-projection extrait perfumes, and horology created for Pakistan with soul, passion, and uncompromising artistry." 
      }
    ]
  }),
  component: About,
});

function About() {
  return (
    <div className="pt-20 pb-14 sm:pt-24 sm:pb-24 bg-background overflow-hidden">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mt-4 sm:mt-8 mb-10 sm:mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-deep mb-3 flex items-center justify-center gap-1.5 font-semibold">
            <Sparkles className="size-3.5" />
            Born Out of Passion
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-tight text-ink">
            A Love Letter to <br />
            <em className="not-italic gold-gradient-text">Artisanal Perfumery</em>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-4 max-w-lg mx-auto leading-relaxed">
            We started M.shaies with a simple belief: a truly extraordinary fragrance shouldn't just be an import from Paris or Milan — it should be crafted right here in Pakistan with pride, patience, and rare botanicals.
          </p>
          <div className="hairline-gold w-24 mx-auto mt-6 opacity-70" />
        </div>

        {/* Story Grid */}
        <div className="grid md:grid-cols-2 gap-10 lg:gap-14 items-center mb-12 sm:mb-20">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-3xl overflow-hidden border border-gold/30 shadow-xl bg-muted aspect-[4/3] relative group"
          >
            <img 
              src="/product-dark.jpg" 
              alt="Maison hand batching flacons" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <span className="text-[10px] uppercase tracking-widest text-gold font-bold">The Alchemy</span>
              <p className="font-serif text-lg font-semibold mt-1">Slow Batching & Hand-Poured Glass</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-5"
          >
            <h2 className="font-serif text-2xl sm:text-3xl text-ink leading-tight">
              Formulated Specifically for the Warmth & Galas of Pakistan
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Standard commercial perfumes are blended for cool European climates, fading away within hours in Karachi's humidity or Lahore's bustling summer evenings.
            </p>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              We took a radically different path: blending aged Cambodian agarwood, dawn-harvested Turkish Rosa Damascena, and golden ambers at an intense <strong>35% oil concentration</strong>. The result is a scent trail that endures through entire wedding ceremonies, executive boardrooms, and intimate evenings.
            </p>
            <div className="pt-2">
              <Link 
                to="/shop" 
                className="btn-gold btn-gold-hover inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs uppercase tracking-widest font-bold shadow-md"
              >
                <span>Discover the Creations</span>
                <Sparkles className="size-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Human Values Pillars */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12 sm:mb-20">
          <div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card shadow-sm hover:border-gold/60 transition-all text-center">
            <div className="size-12 rounded-full bg-gold/15 border border-gold/40 grid place-items-center mx-auto mb-4 text-gold-deep">
              <Droplets className="size-6" />
            </div>
            <h3 className="font-serif text-lg text-ink font-bold mb-2">100% Pure Attars</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Completely alcohol-free concentrated oils hand-poured into crystal flacons with zero synthetic fillers.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card shadow-sm hover:border-gold/60 transition-all text-center">
            <div className="size-12 rounded-full bg-gold/15 border border-gold/40 grid place-items-center mx-auto mb-4 text-gold-deep">
              <Heart className="size-6" />
            </div>
            <h3 className="font-serif text-lg text-ink font-bold mb-2">Gift of Kindness</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every single order is packaged as an exquisite present, including a free 3ml discovery sampler to share with loved ones.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl border border-border/80 bg-card shadow-sm hover:border-gold/60 transition-all text-center">
            <div className="size-12 rounded-full bg-gold/15 border border-gold/40 grid place-items-center mx-auto mb-4 text-gold-deep">
              <Truck className="size-6" />
            </div>
            <h3 className="font-serif text-lg text-ink font-bold mb-2">Nationwide Express</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Speedy delivery via TCS and Leopards across every corner of Pakistan, with 100% free shipping on orders over ₨ 5,000.
            </p>
          </div>
        </div>

        {/* Philosophy Card */}
        <div className="rounded-3xl border border-gold/30 bg-pearl/50 p-5 sm:p-8 lg:p-12 text-center max-w-3xl mx-auto shadow-sm">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-4">Your Signature, In Every Room</h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            "We don't just sell fragrances — we bottle the memories of joy, celebrations with family, and quiet moments of confidence."
          </p>
          <p className="font-serif text-xs uppercase tracking-widest text-gold-deep font-bold mt-4">
            — The M.shaies Artisanal House
          </p>
        </div>

      </div>
    </div>
  );
}
