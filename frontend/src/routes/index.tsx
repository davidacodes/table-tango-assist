import { createFileRoute } from "@tanstack/react-router";
import { HostStand } from "@/components/HostStand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Host Stand — NextTable Waitlist & Tables" },
      {
        name: "description",
        content:
          "Manage the restaurant waitlist and table status from one tablet screen: add parties, notify guests, and seat them at the best-fitting table.",
      },
      { property: "og:title", content: "Host Stand — NextTable Waitlist & Tables" },
      {
        property: "og:description",
        content:
          "Add parties, track estimated waits, notify guests, and seat them at the best-fitting table.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HostStand,
});
