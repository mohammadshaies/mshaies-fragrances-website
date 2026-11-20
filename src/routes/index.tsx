import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { useProductsStore, shouldShowPromotionalBanner } from "@/lib/products-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "M.shaies Fragrances — Pure Attars & Luxury Perfumes in Pakistan" },
      {
        name: "description",
        content:
          "Shop M.shaies Fragrances in Pakistan. 100% alcohol-free pure attars (Millionaire Attar, CEO Pure Attar, Lady Million, Cherry Blossom) & 35% Extrait Perfumes. Cash on Delivery & Free Shipping over ₨ 5,000.",
      },
      {
        name: "keywords",
        content:
          "M.shaies Fragrances, best attar in Pakistan, pure attar oils Pakistan, Millionaire Attar, CEO Pure Attar, Lady Million Attar, Cherry Blossom Pure Attar, long lasting perfumes Pakistan, non-alcoholic attar online",
      },
      { property: "og:title", content: "M.shaies Fragrances — Pure Attars & Luxury Perfumes in Pakistan" },
      {
        property: "og:description",
        content: "100% Alcohol-Free Pure Attars & 35% Extrait Perfumes crafted for Pakistan. Starting from ₨ 1,499 with nationwide COD delivery.",
      },
      { property: "og:url", content: "https://www.mshaiesfragrances.com/" },
    ],
    links: [
      { rel: "canonical", href: "https://www.mshaiesfragrances.com/" },
      { rel: "preload", href: "/bottle-poster.webp", as: "image", type: "image/webp" },
    ],
  }),
  component: Index,
});

function Index() {
  const { settings } = useProductsStore();
  const showBanner = shouldShowPromotionalBanner(settings, "home");

  return (
    <>
      <Hero />
      {showBanner && (
        <div className="w-full bg-[#f3ece0] px-3 sm:px-8 py-1.5 sm:py-3">
          <div className="mx-auto max-w-7xl">
            <PromotionalBanner page="home" />
          </div>
        </div>
      )}
      <FeaturedFragrances />
    </>
  );
}

