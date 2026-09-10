import { useState } from "react";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UtensilsCrossed } from "lucide-react";

export function LoginGate() {
  const { login } = useRestaurant();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await login(passcode);
    setBusy(false);
    if (!ok) {
      setError(true);
      setPasscode("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-10 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-4xl tracking-tight text-foreground">NextTable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Waitlist &amp; table management for the host stand.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passcode" className="text-base">
              Restaurant passcode
            </Label>
            <Input
              id="passcode"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              className="h-14 text-center text-2xl tracking-[0.4em]"
              placeholder="••••"
            />
            {error && <p className="text-sm text-destructive">That passcode didn’t work.</p>}
          </div>
          <Button type="submit" size="lg" className="h-14 w-full text-lg" disabled={busy || !passcode}>
            Unlock host stand
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Shared login used by all staff on this tablet.
          </p>
        </form>
      </div>
    </main>
  );
}
