import { QuickEntryForm } from "@/components/QuickEntryForm";
import { TablesPanel } from "@/components/TablesPanel";
import { WaitlistPanel } from "@/components/WaitlistPanel";

export function HostStand() {
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
