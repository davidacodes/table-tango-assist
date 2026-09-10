import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useTheme } from "@/hooks/useTheme";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

function SettingsPage() {
  const { settings, saveSettings, tables, addTable, updateTable, removeTable } = useRestaurant();
  const [interval, setIntervalMinutes] = useState(String(settings.seatingIntervalMinutes));
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const { isDark, setTheme } = useTheme();

  useEffect(() => {
    setIntervalMinutes(String(settings.seatingIntervalMinutes));
  }, [settings.seatingIntervalMinutes]);

  const sorted = [...tables].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true }),
  );

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="font-display text-4xl tracking-tight text-foreground">Settings</h1>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="font-display text-2xl tracking-tight text-foreground">Appearance</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isDark ? "Dark theme — easier on the eyes at night." : "Light theme."} Saved on this
                tablet.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Sun className="size-5 text-muted-foreground" />
              <Switch
                id="dark-mode"
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                aria-label="Dark mode"
                className="h-7 w-12"
              />
              <Moon className="size-5 text-muted-foreground" />
            </div>
          </div>
        </section>


        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-2xl tracking-tight text-foreground">Seating interval</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Used for wait estimates: parties ahead × interval.
          </p>
          <div className="mt-4 flex items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="interval">Minutes per party</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setIntervalMinutes(e.target.value)}
                className="h-12 w-32 text-base"
              />
            </div>
            <Button
              className="h-12"
              onClick={async () => {
                const value = Math.max(1, Number(interval) || 1);
                await saveSettings({ seatingIntervalMinutes: value });
                toast.success("Seating interval saved");
              }}
            >
              Save
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-2xl tracking-tight text-foreground">Tables</h2>

          <div className="mt-4 space-y-3">
            {sorted.map((t) => (
              <div key={t.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor={`num-${t.id}`}>Table number</Label>
                  <Input
                    id={`num-${t.id}`}
                    defaultValue={t.number}
                    onBlur={(e) => updateTable(t.id, { number: e.target.value })}
                    className="h-12 w-28 text-base"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`cap-${t.id}`}>Capacity</Label>
                  <Input
                    id={`cap-${t.id}`}
                    type="number"
                    min={1}
                    defaultValue={t.capacity}
                    onBlur={(e) => updateTable(t.id, { capacity: Number(e.target.value) || 1 })}
                    className="h-12 w-24 text-base"
                  />
                </div>
                <span className="pb-3 text-sm text-muted-foreground">
                  {t.occupiedBy ? `Occupied • ${t.occupiedBy.name}` : "Available"}
                </span>
                <Button
                  variant="outline"
                  className="ml-auto h-12"
                  onClick={async () => {
                    await removeTable(t.id);
                    toast.success(`Table ${t.number} removed`);
                  }}
                >
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-5">
            <div className="space-y-1">
              <Label htmlFor="new-number">New table number</Label>
              <Input
                id="new-number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="h-12 w-32 text-base"
                placeholder="7"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-capacity">Capacity</Label>
              <Input
                id="new-capacity"
                type="number"
                min={1}
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="h-12 w-24 text-base"
              />
            </div>
            <Button
              className="h-12"
              disabled={!newNumber.trim()}
              onClick={async () => {
                await addTable({ number: newNumber, capacity: Number(newCapacity) || 1 });
                setNewNumber("");
                setNewCapacity("4");
                toast.success("Table added");
              }}
            >
              Add table
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
