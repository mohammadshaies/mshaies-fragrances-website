import { createFileRoute } from "@tanstack/react-router";
import { ScentJourney } from "@/components/ScentJourney";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "The Scent Journey — M.shaies Fragrances" },
      { name: "description", content: "Explore how our perfumes unfold. From first breath to the lasting trail of aged Cambodian oud and warm amber." }
    ]
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
