import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — M.shaies Fragrances" },
      { name: "description", content: "Get in touch with M.shaies Maison. Send us an inquiry or reach our concierge helpline." }
    ]
  }),
  component: Contact,
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Thank you for your message. The Maison will get back to you shortly.");
      setForm({ name: "", email: "", message: "" });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="pt-20 pb-12 sm:pt-24 sm:pb-20 bg-background overflow-hidden">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mt-4 sm:mt-8 mb-8 sm:mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-deep mb-4">Maison Support</p>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl tracking-tight text-ink">
            Contact the <em className="not-italic gold-gradient-text">Maison</em>
          </h1>
          <div className="hairline-gold w-24 mx-auto mt-6 opacity-70" />
        </div>

        {/* Contact Layout */}
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-start">
          {/* Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div>
              <h2 className="font-serif text-xl sm:text-3xl text-ink">Get in Touch</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Whether you have an inquiry about custom formulations, stock availability, or orders, we are here to assist.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="size-11 rounded-full border border-gold/30 bg-pearl grid place-items-center shrink-0">
                  <Mail className="size-4 text-gold-deep" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-semibold">Email Us</p>
                  <a href="mailto:info@mshaies.com" className="text-sm text-ink hover:text-gold-deep transition-colors mt-1 block">
                    info@mshaies.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="size-11 rounded-full border border-emerald-500/40 bg-emerald-500/10 grid place-items-center shrink-0 text-emerald-600">
                  <Phone className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 font-bold">Official WhatsApp & Call</p>
                  <div className="flex flex-wrap items-center gap-2 gap-y-1.5 mt-1">
                    <a href="tel:+923390001829" className="text-sm font-semibold text-ink hover:text-gold-deep transition-colors">
                      +92 339 0001829
                    </a>
                    <a
                      href="https://wa.me/923390001829"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/25 transition-colors"
                    >
                      Chat Now ↗
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="size-11 rounded-full border border-gold/30 bg-pearl grid place-items-center shrink-0">
                  <MapPin className="size-4 text-gold-deep" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-semibold">Customer Concierge</p>
                  <p className="text-sm text-ink leading-relaxed mt-1">
                    Delivering Nationwide Across Pakistan · 100% In Stock
                  </p>
                </div>
              </div>

              {/* Official Social Media Channels */}
              <div className="pt-4 border-t border-border/80">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold-deep font-bold mb-3">
                  Official Social Channels
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="https://www.instagram.com/m.shaiesfragrances"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl border border-border/80 hover:border-gold hover:bg-gold/5 bg-card flex items-center gap-2.5 transition-all group"
                  >
                    <div className="size-8 rounded-full bg-pink-500/10 text-pink-600 grid place-items-center shrink-0">
                      <svg className="size-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-ink truncate">Instagram</p>
                      <p className="text-[10px] text-muted-foreground truncate">@m.shaiesfragrances</p>
                    </div>
                  </a>

                  <a
                    href="https://www.facebook.com/profile.php?id=61575714252560"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl border border-border/80 hover:border-gold hover:bg-gold/5 bg-card flex items-center gap-2.5 transition-all group"
                  >
                    <div className="size-8 rounded-full bg-blue-600/10 text-blue-600 grid place-items-center shrink-0">
                      <svg className="size-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-ink truncate">Facebook</p>
                      <p className="text-[10px] text-muted-foreground truncate">M.shaies Page</p>
                    </div>
                  </a>

                  <a
                    href="https://www.tiktok.com/@mshaiesfragrances"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl border border-border/80 hover:border-gold hover:bg-gold/5 bg-card flex items-center gap-2.5 transition-all group"
                  >
                    <div className="size-8 rounded-full bg-zinc-800/10 text-ink grid place-items-center shrink-0">
                      <svg className="size-4 fill-current" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.86-4.48V8.75a8.28 8.28 0 0 0 4.84 1.57V6.87a4.85 4.85 0 0 1-.93-.18Z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-ink truncate">TikTok</p>
                      <p className="text-[10px] text-muted-foreground truncate">@mshaiesfragrances</p>
                    </div>
                  </a>

                  <a
                    href="https://wa.me/923390001829"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 flex items-center gap-2.5 transition-all group"
                  >
                    <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-600 grid place-items-center shrink-0">
                      <svg className="size-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.03 2.6.13.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.17-.48-.29" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-ink truncate">WhatsApp</p>
                      <p className="text-[10px] text-emerald-600 font-medium truncate">+92 339 0001829</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="rounded-3xl border border-gold/30 bg-pearl/40 p-4 sm:p-8 lg:p-10 shadow-[var(--shadow-soft)]"
          >
            <h3 className="font-serif text-2xl text-ink mb-6">Send an Inquiry</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-xs uppercase tracking-[0.2em] text-ink mb-2">Your Name</label>
                <input
                  type="text"
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-ink placeholder-muted-foreground focus:border-gold focus:outline-none text-sm transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-[0.2em] text-ink mb-2">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-ink placeholder-muted-foreground focus:border-gold focus:outline-none text-sm transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-xs uppercase tracking-[0.2em] text-ink mb-2">Message</label>
                <textarea
                  id="message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-ink placeholder-muted-foreground focus:border-gold focus:outline-none text-sm transition-colors resize-none"
                  placeholder="How can the Maison assist you?"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-gold via-gold-deep to-gold text-ink font-medium text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
              >
                {loading ? "Sending..." : (
                  <>
                    Send Message
                    <Send className="size-3.5" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
