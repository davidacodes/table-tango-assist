import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRestaurant } from "@/hooks/useRestaurant";
import { formatClock, formatWait } from "@/lib/logic";
import type { Party } from "@/lib/types";
import { SeatDialog } from "@/components/SeatDialog";
import { Bell, Minus, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export function WaitlistPanel() {
  const { active, tables, notifyParty, closeParty, seatParty, updatePartySize } = useRestaurant();
  const [seating, setSeating] = useState<Party | null>(null);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="font-display text-3xl tracking-tight text-foreground">Waitlist</h2>
        <span className="text-sm text-muted-foreground">
          {active.length} {active.length === 1 ? "party" : "parties"} waiting
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {active.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
            No parties waiting. Add one above.
          </p>
        )}

        {active.map((p, i) => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {i + 1}
              </span>
              <h3 className="font-display text-2xl tracking-tight text-foreground">{p.name}</h3>
              <span
                className={
                  p.status === "notified"
                    ? "rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
                    : "rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground"
                }
              >
                {p.status === "notified" ? `Notified ${formatClock(p.notifiedAt!)}` : "Waiting"}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Party size</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    aria-label={`Decrease party size for ${p.name}`}
                    onClick={() => updatePartySize(p.id, p.partySize - 1)}
                    disabled={p.partySize <= 1}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Users className="size-4" /> {p.partySize}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9"
                    aria-label={`Increase party size for ${p.name}`}
                    onClick={() => updatePartySize(p.id, p.partySize + 1)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Arrived</dt>
                <dd className="mt-1 font-semibold text-foreground">{formatClock(p.arrivalTime)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estimated wait</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {formatWait(p.estimatedWaitMinutes)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-12 flex-1"
                disabled={p.status === "notified"}
                onClick={async () => {
                  await notifyParty(p.id);
                  toast.success(`${p.name} notified`);
                }}
              >
                <Bell className="size-4" /> Notify
              </Button>
              <Button className="h-12 flex-1" onClick={() => setSeating(p)}>
                Seat
              </Button>
              <Button
                variant="outline"
                className="h-12 flex-1"
                onClick={() => closeParty(p.id, "left")}
              >
                Left
              </Button>
              <Button
                variant="outline"
                className="h-12 flex-1"
                onClick={() => closeParty(p.id, "no-show")}
              >
                No-show
              </Button>
            </div>
          </article>
        ))}
      </div>

      <SeatDialog
        party={seating}
        tables={tables}
        onClose={() => setSeating(null)}
        onConfirm={async (tableId) => {
          const party = seating;
          setSeating(null);
          if (!party) return;
          try {
            await seatParty(party.id, tableId);
            toast.success(`${party.name} seated`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not seat party");
          }
        }}
      />
    </section>
  );
}
