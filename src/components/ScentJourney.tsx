import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const NOTES = [
  {
    label: "Top",
    title: "First Breath",
    desc: "Bergamot from Italian groves opens with crystalline saffron — a moment of stillness before the depth.",
    ingredients: ["Bergamot", "Saffron", "Pink Pepper"],
  },
  {
    label: "Heart",
    title: "The Core",
    desc: "Bulgarian rose unfolds against velvet jasmine. The maison's signature — quiet, opulent, persistent.",
    ingredients: ["Bulgarian Rose", "Jasmine", "Iris"],
  },
  {
    label: "Base",
    title: "The Trail",
    desc: "Aged oud meets warm amber and sandalwood — a slow ember that lingers long into the night.",
    ingredients: ["Cambodian Oud", "Amber", "Sandalwood"],
  },
];

export function ScentJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"]);

  return (
    <section id="journey" ref={ref} className="relative py-16 sm:py-40 bg-pearl/50 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: "radial-gradient(ellipse at center, transparent 0%, var(--pearl) 70%)" }} />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <div className="text-center mb-10 sm:mb-20">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-deep mb-3 sm:mb-4">An Immersive Journey</p>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-tight text-ink">
            The Scent <span className="italic gold-gradient-text">Unfolds.</span>
          </h2>
          <p className="mt-4 sm:mt-5 text-xs sm:text-base text-muted-foreground max-w-xl mx-auto">
            Every fragrance is a composition in three movements. Scroll to follow the arc.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 top-0 bottom-0 w-px bg-border" />
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 top-0 w-px bg-gradient-to-b from-gold via-gold-deep to-gold origin-top"
          />

          <ul className="space-y-14 sm:space-y-32">
            {NOTES.map((n, i) => {
              const isRight = i % 2 === 1;
              return (
                <motion.li
                  key={n.label}
                  initial={{ opacity: 0, y: 60, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-120px" }}
                  transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                  className={`relative grid sm:grid-cols-2 gap-6 sm:gap-12 items-center ${isRight ? "sm:[direction:rtl]" : ""}`}
                >
                  {/* Node */}
                  <div className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 top-6 sm:top-1/2 sm:-translate-y-1/2 z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="size-4 rounded-full bg-gold ring-4 ring-background shadow-[0_0_20px_var(--gold)]"
                    />
                  </div>

                  {/* Card */}
                  <div className={`pl-12 sm:pl-0 ${isRight ? "sm:pl-12 sm:[direction:ltr]" : "sm:pr-12"}`}>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-gold-deep mb-2">
                      {n.label} Note
                    </p>
                    <h3 className="font-serif text-2xl sm:text-4xl text-ink leading-tight">{n.title}</h3>
                    <p className="mt-4 text-muted-foreground leading-relaxed">{n.desc}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {n.ingredients.map((ing) => (
                        <span
                          key={ing}
                          className="text-xs px-3 py-1 rounded-full border border-gold/40 bg-background/60 text-ink/80"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Visual */}
                  <div className={`pl-12 sm:pl-0 ${isRight ? "sm:[direction:ltr]" : ""}`}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.15 }}
                      className="relative aspect-square max-w-xs mx-auto"
                    >
                      <div className="absolute inset-0 rounded-full opacity-60 blur-2xl"
                        style={{ background: "radial-gradient(circle, var(--gold-soft), transparent 70%)" }} />
                      <div className="absolute inset-6 rounded-full border border-gold/30" />
                      <div className="absolute inset-12 rounded-full border border-gold/20" />
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="font-serif text-6xl gold-gradient-text">{i + 1}</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
