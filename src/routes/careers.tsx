import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Briefcase, Send, Sparkles, CheckCircle2, MapPin, Clock, ArrowRight, DollarSign, Award } from "lucide-react";
import { toast } from "sonner";
import { useProductsStore } from "@/lib/products-store";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers at the Maison — M.shaies Fragrances" },
      {
        name: "description",
        content:
          "Join the artisanal team at M.shaies Fragrances. Explore career opportunities in perfumery, retail concierge, and luxury commerce across Pakistan.",
      },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const { jobs } = useProductsStore();
  const activeJobs = jobs.filter((j) => j.status === "Open");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: activeJobs[0]?.title || "Artisanal Perfume Blender & Quality Specialist",
    experience: "1-3 Years",
    cvLink: "",
    coverNote: "",
  });

  const [loading, setLoading] = useState(false);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) {
      toast.error("Please fill in your name, email, and WhatsApp phone number.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      toast.success("Application received! The Maison HR team will review your profile and contact you via WhatsApp/Email.");
      setForm({
        name: "",
        email: "",
        phone: "",
        position: activeJobs[0]?.title || "Artisanal Perfume Blender & Quality Specialist",
        experience: "1-3 Years",
        cvLink: "",
        coverNote: "",
      });
      setLoading(false);
    }, 1400);
  };

  return (
    <div className="pt-20 sm:pt-28 pb-14 sm:pb-20 bg-background min-h-screen">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-deep mb-3 font-semibold flex items-center justify-center gap-1.5">
            <Sparkles className="size-3.5" />
            Join the Artisans
          </p>
          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl tracking-tight text-ink">
            Careers at <em className="not-italic gold-gradient-text">M.shaies</em>
          </h1>
          <p className="mt-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We are always seeking passionate fragrance lovers, distillers, and luxury brand ambassadors to join our team across Pakistan.
          </p>
          <div className="hairline-gold w-24 mx-auto mt-5 opacity-70" />
        </div>

        {/* Current Openings */}
        <div className="space-y-6 mb-10 sm:mb-16">
          <h2 className="font-serif text-2xl text-ink flex items-center gap-2">
            <Briefcase className="size-5 text-gold-deep" />
            Active Maison Openings
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {activeJobs.length === 0 ? (
              <div className="p-8 rounded-3xl border border-border/80 bg-card text-center space-y-2">
                <Briefcase className="size-8 text-gold-deep mx-auto opacity-60" />
                <h3 className="font-serif text-lg text-ink font-semibold">No Active Openings Right Now</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  We are not actively hiring for specific roles at this moment, but we always welcome speculative portfolios from artisanal perfumers, blenders, and luxury brand specialists below.
                </p>
              </div>
            ) : (
              activeJobs.map((pos) => (
                <div
                  key={pos.id}
                  className="p-6 rounded-3xl border border-border/80 bg-card hover:border-gold/50 transition-all shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gold-deep px-2.5 py-0.5 rounded-full bg-pearl border border-gold/30">
                        {pos.department}
                      </span>
                      {pos.salaryRange && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                          {pos.salaryRange}
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl text-ink font-semibold mt-1">{pos.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{pos.description}</p>
                    
                    {pos.requirements && pos.requirements.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-ink mb-1">Key Qualities:</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                          {pos.requirements.slice(0, 3).map((req, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <CheckCircle2 className="size-3 text-gold-deep shrink-0 mt-0.5" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-2">
                      <span className="flex items-center gap-1"><MapPin className="size-3 text-gold-deep" /> {pos.location}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3 text-gold-deep" /> {pos.type}</span>
                      <span className="flex items-center gap-1"><Award className="size-3 text-gold-deep" /> {pos.experience}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setForm((f) => ({ ...f, position: pos.title }));
                      document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-gold/60 bg-pearl/60 hover:bg-gold hover:text-ink text-xs uppercase tracking-wider font-bold transition-colors shrink-0 cursor-pointer shadow-xs"
                  >
                    Apply Now
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Application Form */}
        <div id="apply-form" className="rounded-3xl border border-gold/30 bg-pearl/40 p-5 sm:p-8 lg:p-10 shadow-[var(--shadow-soft)]">
          <h2 className="font-serif text-2xl sm:text-3xl text-ink mb-2">Submit Your Application</h2>
          <p className="text-xs text-muted-foreground mb-6">
            Fill in the details below and attach a link to your CV or portfolio.
          </p>

          <form onSubmit={handleApply} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayesha Tariq"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
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
                <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                  Position Applying For
                </label>
                <select
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                >
                  {activeJobs.map((p) => (
                    <option key={p.id} value={p.title}>{p.title} — {p.department}</option>
                  ))}
                  <option value="General Open Application">General Speculative Application</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                  CV / Resume Link (Google Drive / LinkedIn / Dropbox)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or LinkedIn URL"
                  value={form.cvLink}
                  onChange={(e) => setForm({ ...form, cvLink: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wider text-ink font-bold mb-1">
                  Cover Note / Why do you want to join M.shaies?
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your background, experience with luxury fragrances, or why you'd be a great fit."
                  value={form.coverNote}
                  onChange={(e) => setForm({ ...form, coverNote: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-ink focus:border-gold focus:outline-none resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold btn-gold-hover py-3.5 rounded-full text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? "Submitting Application..." : (
                <>
                  <Send className="size-3.5" />
                  Submit Application
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
