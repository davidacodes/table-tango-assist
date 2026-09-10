import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRestaurant } from "@/hooks/useRestaurant";
import { findReturningGuests } from "@/lib/logic";
import { UserCheck, Plus, Minus } from "lucide-react";

function nowTimeValue(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function QuickEntryForm() {
  const { addParty, parties } = useRestaurant();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [arrival, setArrival] = useState(nowTimeValue);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const matches = useMemo(
    () => findReturningGuests(parties, phone).filter((p) => !dismissed.includes(p.id)),
    [parties, phone, dismissed],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || partySize < 1) return;
    const [h, m] = arrival.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    await addParty({
      name,
      phone,
      partySize,
      arrivalTime: d.toISOString(),
    });
    setName("");
    setPhone("");
    setPartySize(2);
    setArrival(nowTimeValue());
    setDismissed([]);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      aria-label="Quick entry"
    >
      <h2 className="font-display text-2xl tracking-tight text-foreground">Add a party</h2>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="qe-name">Guest name</Label>
          <Input
            id="qe-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-base"
            placeholder="Smith"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qe-phone">Phone number</Label>
          <Input
            id="qe-phone"
            value={phone}
            inputMode="tel"
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 text-base"
            placeholder="(555) 123-4567"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qe-size">Party size</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 shrink-0"
              aria-label="Decrease party size"
              onClick={() => setPartySize((n) => Math.max(1, n - 1))}
            >
              <Minus className="size-5" />
            </Button>
            <Input
              id="qe-size"
              type="number"
              min={1}
              value={partySize}
              onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))}
              className="h-12 text-center text-base"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 shrink-0"
              aria-label="Increase party size"
              onClick={() => setPartySize((n) => n + 1)}
            >
              <Plus className="size-5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="qe-arrival">Arrival time</Label>
          <Input
            id="qe-arrival"
            type="time"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
            className="h-12 text-base"
          />
        </div>
      </div>

      {matches.length > 0 && (
        <div className="mt-4 space-y-2">
          {matches.slice(0, 3).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setName(m.name);
                setDismissed((d) => [...d, m.id]);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
            >
              <UserCheck className="size-5 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {m.name} — returning guest
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Tap to fill name</span>
            </button>
          ))}
        </div>
      )}

      <Button type="submit" size="lg" className="mt-5 h-14 w-full text-lg">
        Add to waitlist
      </Button>
    </form>
  );
}
