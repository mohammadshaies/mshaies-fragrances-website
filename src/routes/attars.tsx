import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { useProductsStore } from "@/lib/products-store";

export const Route = createFileRoute("/attars")({
  head: () => ({
    meta: [
      { title: "100% Pure Alcohol-Free Attar Oils in Pakistan — M.shaies Fragrances" },
      {
        name: "description",
        content:
          "Buy 100% alcohol-free pure concentrated attar oils in Pakistan. Shop Millionaire Attar (1 Million inspired), CEO Pure Attar, Lady Million & Cherry Blossom Pure Attar with 16+ hours longevity.",
      },
      {
        name: "keywords",
        content:
          "pure attar oils Pakistan, alcohol free attar Pakistan, best attar for men in Pakistan, best attar for women Pakistan, Millionaire Attar, CEO Pure Attar, Lady Million Attar, Cherry Blossom Attar, Jummah attar oil",
      },
      { property: "og:title", content: "Pure Attar Oils Collection — M.shaies Fragrances Pakistan" },
      { property: "og:url", content: "https://www.mshaiesfragrances.com/attars" },
    ],
    links: [{ rel: "canonical", href: "https://www.mshaiesfragrances.com/attars" }],
  }),
  component: AttarsPage,
});

function AttarsPage() {
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
        initialCategory="Attars" 
        title="Pure Attar Oils"
        subtitle="100% Alcohol-Free Concentrated Flacons"
      />
    </div>
  );
}
