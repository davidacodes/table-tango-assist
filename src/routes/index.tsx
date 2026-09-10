import { createFileRoute } from "@tanstack/react-router";
import { QuickEntryForm } from "@/components/QuickEntryForm";
import { WaitlistPanel } from "@/components/WaitlistPanel";
import { TablesPanel } from "@/components/TablesPanel";

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

function HostStand() {
  return (
    <div className="grid h-full grid-cols-1 gap-5 p-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="flex min-h-0 flex-col gap-5">
        <QuickEntryForm />
        <WaitlistPanel />
      </div>
      <TablesPanel />
    </div>
  );
}
