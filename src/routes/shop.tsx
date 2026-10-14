import { createFileRoute } from "@tanstack/react-router";
import { FeaturedFragrances } from "@/components/FeaturedFragrances";
import { PromotionalBanner } from "@/components/PromotionalBanner";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop All Fragrances — M.shaies Luxury Perfumes Pakistan" },
      {
        name: "description",
        content:
          "Browse all hand-poured pure attar oils, luxury ouds, and concentrated perfumes. Free shipping nationwide in Pakistan on orders over ₨ 5,000.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { settings } = useProductsStore();
  const hasSlides = settings.promotionalSlides === undefined || (Array.isArray(settings.promotionalSlides) && settings.promotionalSlides.length > 0);
  const showBanner = settings.heroBannerActive !== false && hasSlides;

  return (
    <div className="pt-20 xs:pt-24 sm:pt-28 bg-background min-h-screen">
      {showBanner && (
        <div className="mx-auto max-w-7xl px-3 sm:px-8 pt-1 sm:pt-4 pb-1 sm:pb-2">
          <PromotionalBanner />
        </div>
      )}
      <FeaturedFragrances showAll={true} />
    </div>
  );
}
