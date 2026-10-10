import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { 
  Truck, 
  HelpCircle, 
  RotateCcw, 
  ShieldCheck, 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Send,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Customer Support & FAQs — M.shaies Fragrances" },
      {
        name: "description",
        content:
          "Need help with an order, delivery tracking, or fragrance recommendation? Contact our customer concierge team or browse frequently asked questions.",
      },
    ],
  }),
  component: SupportPage,
});

const FAQS = [
  {
    q: "How long does nationwide delivery take in Pakistan?",
    a: "Orders are dispatched immediately and delivered across all major cities and towns in Pakistan within 2 to 4 business days via express courier."
  },
  {
    q: "Do you deliver to all cities in Pakistan?",
    a: "Yes, M.shaies Fragrances delivers nationwide across all provinces and cities of Pakistan with full door-to-door tracking."
  },
  {
    q: "Do you offer Cash on Delivery (COD)?",
    a: "Yes! Cash on Delivery is available nationwide across Pakistan without any hidden surcharges. Free delivery applies automatically to all orders over ₨ 5,000."
  },
  {
    q: "How do I pay with JazzCash, Easypaisa, or NayaPay?",
    a: "Select your preferred payment method on the checkout page, follow the account transfer details shown on screen, and enter your Transaction ID (TID) to generate an instant confirmed invoice."
  },
  {
    q: "Are the attars 100% pure and alcohol-free?",
    a: "Yes, our Pure Attar Oils are 100% alcohol-free, concentrated botanical and resin distillates hand-poured in Pakistan for lasting projection."
  },
  {
    q: "What is your return & exchange policy?",
    a: "We offer a 7-day hassle-free exchange on sealed, undamaged bottles if you wish to try another fragrance in the collection."
  }
];

function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [form, setForm] = useState({ name: "", phone: "", orderNumber: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.message) {
      toast.error("Please fill in your name, phone number, and message.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Support ticket submitted! A Maison representative will WhatsApp you shortly.");
      setForm({ name: "", phone: "", orderNumber: "", message: "" });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="pt-20 sm:pt-28 pb-14 sm:pb-20 bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-deep mb-3 font-semibold">
            Maison Concierge
          </p>
          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl tracking-tight text-ink">
            Customer Support & FAQs
          </h1>
          <div className="hairline-gold w-24 mx-auto mt-4 opacity-70" />
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
          <a
            href="https://wa.me/923390001829"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-center flex flex-col items-center group"
          >
            <div className="size-14 rounded-full bg-emerald-500/20 grid place-items-center mb-4 group-hover:scale-110 transition-transform">
              <MessageCircle className="size-6 text-emerald-600" />
            </div>
            <h3 className="font-serif text-xl text-ink">WhatsApp Concierge</h3>
            <p className="text-xs text-muted-foreground mt-1">Instant order assistance & advice</p>
            <span className="text-xs text-emerald-600 font-semibold mt-3 flex items-center gap-1">
              Chat on WhatsApp (+92 339 0001829) →
            </span>
          </a>

          <div className="p-6 rounded-3xl border border-gold/30 bg-pearl/40 text-center flex flex-col items-center">
            <div className="size-14 rounded-full bg-gold/20 grid place-items-center mb-4">
              <Truck className="size-6 text-gold-deep" />
            </div>
            <h3 className="font-serif text-xl text-ink">Nationwide Shipping</h3>
            <p className="text-xs text-muted-foreground mt-1">Express dispatch via TCS & Leopards</p>
            <span className="text-xs text-gold-deep font-semibold mt-3">
              Free over ₨ 5,000 (2-4 Days All Pakistan)
            </span>
          </div>

          <div className="p-6 rounded-3xl border border-border bg-card text-center flex flex-col items-center">
            <div className="size-14 rounded-full bg-muted grid place-items-center mb-4">
              <MapPin className="size-6 text-ink/70" />
            </div>
            <h3 className="font-serif text-xl text-ink">Delivering Across Pakistan</h3>
            <p className="text-xs text-muted-foreground mt-1">All Cities & Towns Nationwide</p>
            <span className="text-xs text-muted-foreground font-medium mt-3">
              Support: Mon–Sat 11:00 AM – 9:00 PM
            </span>
          </div>
        </div>

        {/* FAQs and Support Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start">
          
          {/* FAQs Accordion */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-serif text-2xl text-ink mb-6 flex items-center gap-2">
              <HelpCircle className="size-5 text-gold-deep" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border/80 bg-card overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4"
                    >
                      <span className="font-serif text-base text-ink font-medium">{faq.q}</span>
                      <ChevronDown
                        className={`size-4 text-gold-deep transition-transform duration-300 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Support Ticket / Inquiry Form */}
          <div className="lg:col-span-5 rounded-3xl border border-gold/30 bg-pearl/40 p-6 sm:p-8 shadow-[var(--shadow-soft)]">
            <h2 className="font-serif text-2xl text-ink mb-2">Submit an Inquiry</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Have a fragrance query or question about your delivery?
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                  WhatsApp Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0300 1234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                  Order Reference (If applicable)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MSH-2026-8941"
                  value={form.orderNumber}
                  onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink font-medium mb-1">
                  Message *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can our concierge assist you?"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gold btn-gold-hover py-3.5 rounded-full text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2"
              >
                {loading ? "Sending Ticket..." : (
                  <>
                    <Send className="size-3.5" />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
