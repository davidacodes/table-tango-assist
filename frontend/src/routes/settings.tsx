import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/SettingsPage";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NextTable Seating Interval & Tables" },
      {
        name: "description",
        content:
          "Configure the default seating interval used for wait estimates and manage the restaurant's tables and seat capacities.",
      },
      { property: "og:title", content: "Settings — NextTable Seating Interval & Tables" },
      {
        property: "og:description",
        content: "Set the seating interval and add, edit, or remove tables and capacities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});
