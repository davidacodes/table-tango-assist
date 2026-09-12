import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Settings as SettingsIcon, LayoutGrid, UtensilsCrossed } from "lucide-react";

import { LoginGate } from "@/components/LoginGate";
import { Button } from "@/components/ui/button";
import { HostStand } from "@/components/HostStand";
import { SettingsPage } from "@/components/SettingsPage";
import { RestaurantProvider, useRestaurant } from "@/hooks/useRestaurant";
import { Toaster } from "@/components/ui/sonner";

function currentPath(): string {
  return window.location.pathname === "/settings" ? "/settings" : "/";
}

function usePathname(): string {
  const [pathname, setPathname] = useState(currentPath);

  useEffect(() => {
    const update = () => setPathname(currentPath());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  return pathname;
}

function StaticAppShell({ children }: { children: ReactNode }) {
  const { ready, authed, logout } = useRestaurant();
  const pathname = usePathname();

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!authed) return <LoginGate />;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center gap-4 border-b border-border bg-card px-6 py-3">
        <a href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-5" />
          </span>
          <span className="font-display text-3xl tracking-tight text-foreground">NextTable</span>
        </a>

        <nav className="ml-auto flex items-center gap-2">
          <Button asChild variant={pathname === "/" ? "secondary" : "ghost"} className="h-12">
            <a href="/">
              <LayoutGrid className="size-4" /> Host stand
            </a>
          </Button>
          <Button asChild variant={pathname === "/settings" ? "secondary" : "ghost"} className="h-12">
            <a href="/settings">
              <SettingsIcon className="size-4" /> Settings
            </a>
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

function StaticRoutes() {
  const pathname = usePathname();
  return pathname === "/settings" ? <SettingsPage /> : <HostStand />;
}

export function StaticApp() {
  return (
    <RestaurantProvider>
      <StaticAppShell>
        <StaticRoutes />
      </StaticAppShell>
      <Toaster />
    </RestaurantProvider>
  );
}
