import { Button } from "@/components/ui/button";
import { useRestaurant } from "@/hooks/useRestaurant";
import { formatClock } from "@/lib/logic";
import { cn } from "@/lib/utils";

export function TablesPanel() {
  const { tables, releaseTable } = useRestaurant();
  const sorted = [...tables].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  const free = sorted.filter((t) => !t.occupiedBy).length;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="font-display text-3xl tracking-tight text-foreground">Tables</h2>
        <span className="text-sm text-muted-foreground">
          {free} of {sorted.length} available
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {sorted.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
            No tables yet. Add them in Settings.
          </p>
        )}

        {sorted.map((t) => (
          <article
            key={t.id}
            className={cn(
              "rounded-2xl border p-4 shadow-sm",
              t.occupiedBy ? "border-primary/40 bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-display text-2xl tracking-tight text-foreground">
                Table {t.number}
              </h3>
              <span className="text-sm text-muted-foreground">• {t.capacity} seats •</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                  t.occupiedBy
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {t.occupiedBy ? "Occupied" : "Available"}
              </span>
              {t.occupiedBy && (
                <span className="text-sm font-medium text-foreground">
                  {t.occupiedBy.name} ({t.occupiedBy.partySize})
                </span>
              )}
            </div>

            {t.occupiedBy && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Seated at {formatClock(t.occupiedBy.seatedAt)}
                </span>
                <Button variant="outline" className="h-11" onClick={() => releaseTable(t.id)}>
                  Mark available
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
