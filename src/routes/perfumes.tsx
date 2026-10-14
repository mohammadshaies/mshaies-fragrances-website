import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";

export const Route = createFileRoute("/perfumes")({
  head: () => ({
    meta: [
      { title: "Luxury Perfumes (EDP) — M.shaies Fragrances" },
      {
        name: "description",
        content:
          "Experience long-lasting Extrait De Parfum sprays crafted for Pakistan's climate. Desert Gold and Velvet Saffron with exceptional projection.",
      },
    ],
  }),
  component: PerfumesPage,
});

function PerfumesPage() {
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
        initialCategory="Perfumes" 
        title="Eau De Parfum Collection"
        subtitle="35% Oil Concentration Extraits"
      />
    </div>
  );
}
