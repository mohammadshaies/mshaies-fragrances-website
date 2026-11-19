import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { useProductsStore } from "@/lib/products-store";

export const Route = createFileRoute("/perfumes")({
  head: () => ({
    meta: [
      { title: "Long-Lasting Luxury Perfumes (35% Extrait EDP) in Pakistan — M.shaies" },
      {
        name: "description",
        content:
          "Experience long-lasting 35% oil concentration Extrait De Parfum sprays crafted for Pakistan's climate. High-projection luxury perfumes for men and women with nationwide COD delivery.",
      },
      {
        name: "keywords",
        content:
          "long lasting perfumes in Pakistan, best perfumes in Pakistan, 35% extrait de parfum Pakistan, luxury EDP sprays Karachi Lahore Islamabad, mens perfumes Pakistan, womens perfumes Pakistan",
      },
      { property: "og:title", content: "Luxury Perfumes (35% Extrait EDP) — M.shaies Fragrances" },
      { property: "og:url", content: "https://www.mshaiesfragrances.com/perfumes" },
    ],
    links: [{ rel: "canonical", href: "https://www.mshaiesfragrances.com/perfumes" }],
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
