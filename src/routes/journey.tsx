import { createFileRoute } from "@tanstack/react-router";
import { ScentJourney } from "@/components/ScentJourney";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "The Scent Journey & Fragrance Notes — M.shaies Fragrances Pakistan" },
      { name: "description", content: "Explore how M.shaies pure attar oils and extrait perfumes unfold on skin—from bright top notes to warm heart accords and a 16+ hour base trail of oud, amber, and musk." },
      { name: "keywords", content: "fragrance notes pyramid, top heart base notes perfume, oud amber musk notes Pakistan, M.shaies scent journey, how attar unfolds" },
    ],
    links: [{ rel: "canonical", href: "https://www.mshaiesfragrances.com/journey" }],
  }),
  component: Journey,
});

function Journey() {
  return (
    <div className="pt-24 bg-background">
      <ScentJourney />
    </div>
  );
}
