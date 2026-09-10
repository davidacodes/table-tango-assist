import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getService } from "@/services";
import type { NewPartyInput, Party, PartyStatus, RestaurantTable, Settings } from "@/lib/types";
import { activeParties } from "@/lib/logic";

interface RestaurantContextValue {
  ready: boolean;
  authed: boolean;
  login: (passcode: string) => Promise<boolean>;
  logout: () => Promise<void>;
  parties: Party[];
  active: Party[];
  tables: RestaurantTable[];
  settings: Settings;
  addParty: (input: NewPartyInput) => Promise<void>;
  updatePartySize: (id: string, size: number) => Promise<void>;
  notifyParty: (id: string) => Promise<void>;
  closeParty: (id: string, status: Extract<PartyStatus, "left" | "no-show">) => Promise<void>;
  seatParty: (partyId: string, tableId: string) => Promise<void>;
  releaseTable: (tableId: string) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  addTable: (input: { number: string; capacity: number }) => Promise<void>;
  updateTable: (id: string, patch: { number?: string; capacity?: number }) => Promise<void>;
  removeTable: (id: string) => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [settings, setSettings] = useState<Settings>({ seatingIntervalMinutes: 15 });

  const refresh = useCallback(async () => {
    const svc = getService();
    const [p, t, s] = await Promise.all([svc.listParties(), svc.listTables(), svc.getSettings()]);
    setParties(p);
    setTables(t);
    setSettings(s);
  }, []);

  useEffect(() => {
    (async () => {
      const svc = getService();
      setAuthed(await svc.isAuthenticated());
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const value = useMemo<RestaurantContextValue>(() => {
    const svc = getService();
    const wrap = <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
      async (...args: A) => {
        await fn(...args);
        await refresh();
      };

    return {
      ready,
      authed,
      parties,
      active: activeParties(parties),
      tables,
      settings,
      login: async (passcode: string) => {
        const ok = await svc.login(passcode);
        if (ok) {
          setAuthed(true);
          await refresh();
        }
        return ok;
      },
      logout: async () => {
        await svc.logout();
        setAuthed(false);
      },
      addParty: wrap((input: NewPartyInput) => svc.addParty(input)),
      updatePartySize: wrap((id: string, size: number) => svc.updatePartySize(id, size)),
      notifyParty: wrap((id: string) => svc.notifyParty(id)),
      closeParty: wrap((id: string, status: Extract<PartyStatus, "left" | "no-show">) =>
        svc.setPartyStatus(id, status),
      ),
      seatParty: wrap((partyId: string, tableId: string) => svc.seatParty(partyId, tableId)),
      releaseTable: wrap((tableId: string) => svc.releaseTable(tableId)),
      saveSettings: wrap((patch: Partial<Settings>) => svc.updateSettings(patch)),
      addTable: wrap((input: { number: string; capacity: number }) => svc.addTable(input)),
      updateTable: wrap((id: string, patch: { number?: string; capacity?: number }) =>
        svc.updateTable(id, patch),
      ),
      removeTable: wrap((id: string) => svc.removeTable(id)),
    };
  }, [ready, authed, parties, tables, settings, refresh]);

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurant(): RestaurantContextValue {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used inside RestaurantProvider");
  return ctx;
}
