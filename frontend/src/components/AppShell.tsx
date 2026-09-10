import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Settings as SettingsIcon, LayoutGrid, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRestaurant } from "@/hooks/useRestaurant";
import { LoginGate } from "@/components/LoginGate";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, authed, logout } = useRestaurant();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!authed) return <LoginGate />;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-6 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-5" />
          </span>
          <span className="font-display text-3xl tracking-tight text-foreground">NextTable</span>
        </Link>

        <nav className="ml-auto flex items-center gap-2">
          <Button asChild variant={pathname === "/" ? "secondary" : "ghost"} className="h-12">
            <Link to="/">
              <LayoutGrid className="size-4" /> Host stand
            </Link>
          </Button>
          <Button asChild variant={pathname === "/settings" ? "secondary" : "ghost"} className="h-12">
            <Link to="/settings">
              <SettingsIcon className="size-4" /> Settings
            </Link>
          </Button>
          <Button variant="ghost" className="h-12" onClick={() => logout()}>
            <LogOut className="size-4" /> Lock
          </Button>
        </nav>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
