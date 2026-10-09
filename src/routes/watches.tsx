import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";

export const Route = createFileRoute("/watches")({
  head: () => ({
    meta: [
      { title: "Luxury Watches & Horology — M.shaies" },
      {
        name: "description",
        content:
          "Curated luxury timepieces, automatic skeletons, and 18K gold chronographs designed to complement the M.shaies signature aesthetics.",
      },
    ],
  }),
  component: WatchesPage,
});

function WatchesPage() {
  return (
    <div className="pt-20 xs:pt-24 sm:pt-28 bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-3 sm:px-8 pt-1 sm:pt-4 pb-1 sm:pb-3">
        <PromotionalBanner />
      </div>
      <FeaturedFragrances 
        showAll={true} 
        initialCategory="Watches" 
        title="Maison Horology & Timepieces"
        subtitle="Sapphire Crystal & Automatic Calibres"
      />
    </div>
  );
}
