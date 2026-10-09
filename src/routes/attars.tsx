import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";

export const Route = createFileRoute("/attars")({
  head: () => ({
    meta: [
      { title: "Pure Attar Oils — M.shaies Fragrances" },
      {
        name: "description",
        content:
          "Discover pure concentrated attar oils hand-poured in Pakistan. Aged Cambodian Oud, Midnight Rose, and Royal Ambergris in luxury flacons delivered nationwide.",
      },
    ],
  }),
  component: AttarsPage,
});

function AttarsPage() {
  return (
    <div className="pt-20 xs:pt-24 sm:pt-28 bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-3 sm:px-8 pt-1 sm:pt-4 pb-1 sm:pb-3">
        <PromotionalBanner />
      </div>
      <FeaturedFragrances 
        showAll={true} 
        initialCategory="Attars" 
        title="Pure Attar Oils"
        subtitle="100% Alcohol-Free Concentrated Flacons"
      />
    </div>
  );
}
