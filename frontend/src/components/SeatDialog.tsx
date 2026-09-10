import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { availableTablesFor, recommendTable } from "@/lib/logic";
import type { Party, RestaurantTable } from "@/lib/types";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  party: Party | null;
  tables: RestaurantTable[];
  onClose: () => void;
  onConfirm: (tableId: string) => Promise<void>;
}

export function SeatDialog({ party, tables, onClose, onConfirm }: Props) {
  const options = useMemo(
    () => (party ? availableTablesFor(tables, party.partySize) : []),
    [party, tables],
  );
  const recommended = useMemo(
    () => (party ? recommendTable(tables, party.partySize) : null),
    [party, tables],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = selected ?? recommended?.id ?? null;

  return (
    <Dialog
      open={!!party}
      onOpenChange={(open) => {
        if (!open) {
          setSelected(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            Seat {party?.name} ({party?.partySize})
          </DialogTitle>
          <DialogDescription>
            {options.length > 0
              ? "Available tables that fit this party. The smallest fit is recommended."
              : "No available table fits this party right now."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {options.map((t) => {
            const isRec = t.id === recommended?.id;
            const isSel = t.id === chosen;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition-colors",
                  isSel
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-accent",
                )}
              >
                <span className="font-display text-2xl tracking-tight text-foreground">
                  Table {t.number}
                </span>
                <span className="text-sm text-muted-foreground">{t.capacity} seats</span>
                {isRec && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                    <Star className="size-3" /> Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="h-12 flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="h-12 flex-1"
            disabled={!chosen}
            onClick={async () => {
              if (!chosen) return;
              await onConfirm(chosen);
              setSelected(null);
            }}
          >
            Confirm seating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
