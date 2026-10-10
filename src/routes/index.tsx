import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { useProductsStore } from "@/lib/products-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "M.shaies Fragrances — Luxury Perfumes for Pakistan" },
      {
        name: "description",
        content:
          "Discover signature luxury fragrances crafted for Pakistan. Oud Al-Jamil, Midnight Rose & Desert Gold. Free nationwide shipping over ₨ 5,000.",
      },
      { property: "og:title", content: "M.shaies Fragrances — The Essence of Luxury" },
      {
        property: "og:description",
        content: "Signature scents that define your presence. In Stock & Ready to Dispatch.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { settings } = useProductsStore();
  const showBanner = settings.heroBannerActive !== false;

  return (
    <>
      <Hero />
      {showBanner && (
        <div className="w-full bg-[#f3ece0] px-3 sm:px-8 py-1 sm:py-3">
          <div className="mx-auto max-w-7xl">
            <PromotionalBanner />
          </div>
        </div>
      )}
      <FeaturedFragrances />
    </>
  );
}

