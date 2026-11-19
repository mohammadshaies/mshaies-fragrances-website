import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { useProductsStore } from "@/lib/products-store";

export const Route = createFileRoute("/watches")({
  head: () => ({
    meta: [
      { title: "Luxury Watches & Horology in Pakistan — M.shaies Maison" },
      {
        name: "description",
        content:
          "Shop curated luxury watches, automatic skeleton timepieces, and 18K gold-finished chronographs in Pakistan with Cash on Delivery and express nationwide shipping.",
      },
      {
        name: "keywords",
        content:
          "luxury watches Pakistan, mens watches online Pakistan, chronograph watches Karachi Lahore Islamabad, M.shaies watches, automatic watches Pakistan",
      },
      { property: "og:title", content: "Luxury Watches & Horology — M.shaies Pakistan" },
      { property: "og:url", content: "https://www.mshaiesfragrances.com/watches" },
    ],
    links: [{ rel: "canonical", href: "https://www.mshaiesfragrances.com/watches" }],
  }),
  component: WatchesPage,
});

function WatchesPage() {
  const { settings } = useProductsStore();
  const hasSlides = settings.promotionalSlides === undefined || (Array.isArray(settings.promotionalSlides) && settings.promotionalSlides.length > 0);
  const showBanner = settings.heroBannerActive !== false && hasSlides;

  return (
    <div className="pt-20 xs:pt-24 sm:pt-28 bg-background min-h-screen">
      {showBanner && (
        <div className="mx-auto max-w-7xl px-3 sm:px-8 pt-1 sm:pt-4 pb-1 sm:pb-3">
          <PromotionalBanner />
        </div>
      )}
      <FeaturedFragrances 
        showAll={true} 
        initialCategory="Watches" 
        title="Maison Horology & Timepieces"
        subtitle="Sapphire Crystal & Automatic Calibres"
      />
    </div>
  );
}
