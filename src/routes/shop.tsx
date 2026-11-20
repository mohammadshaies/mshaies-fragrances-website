import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { useProductsStore, shouldShowPromotionalBanner } from "@/lib/products-store";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop Pure Attars & Luxury Perfumes Online — M.shaies Fragrances Pakistan" },
      {
        name: "description",
        content:
          "Browse all hand-poured 100% alcohol-free pure attar oils, Millionaire Attar, CEO Pure Attar, Lady Million, Cherry Blossom & concentrated EDP perfumes in Pakistan. Nationwide COD & Free Shipping over ₨ 3,000.",
      },
      {
        name: "keywords",
        content:
          "shop attar online Pakistan, buy perfumes online Pakistan, M.shaies catalog, Millionaire Attar price in Pakistan, CEO Pure Attar, Lady Million Attar, Cherry Blossom Attar, pure attar price in Pakistan",
      },
      { property: "og:title", content: "Shop All Fragrances — M.shaies Haute Parfumerie Pakistan" },
      { property: "og:url", content: "https://www.mshaiesfragrances.com/shop" },
    ],
    links: [{ rel: "canonical", href: "https://www.mshaiesfragrances.com/shop" }],
  }),
  component: Shop,
});

function Shop() {
  const { settings } = useProductsStore();
  const showBanner = shouldShowPromotionalBanner(settings, "shop");

  return (
    <div className="pt-20 xs:pt-24 sm:pt-28 bg-background min-h-screen">
      {showBanner && (
        <div className="mx-auto max-w-7xl px-3 sm:px-8 pt-1 sm:pt-4 pb-1 sm:pb-2">
          <PromotionalBanner page="shop" />
        </div>
      )}
      <FeaturedFragrances
        showAll={true}
        title="Pure Attars & Luxury Perfumes Collection"
        subtitle="100% Alcohol-Free Attar Oils & 35% Extrait Perfumes Delivered Across Pakistan"
      />
    </div>
  );
}
