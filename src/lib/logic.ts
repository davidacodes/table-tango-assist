import type { Party, PartyStatus, RestaurantTable } from "./types";

export const ACTIVE_STATUSES: PartyStatus[] = ["waiting", "notified"];

export function isActive(status: PartyStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** Estimated wait = parties ahead × seating interval. */
export function estimateWait(partiesAhead: number, seatingIntervalMinutes: number): number {
  const ahead = Math.max(0, Math.floor(partiesAhead));
  const interval = Math.max(0, seatingIntervalMinutes);
  return ahead * interval;
}

export function activeParties(parties: Party[]): Party[] {
  return parties
    .filter((p) => isActive(p.status))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Allowed status transitions. */
const TRANSITIONS: Record<PartyStatus, PartyStatus[]> = {
  waiting: ["notified", "seated", "left", "no-show"],
  notified: ["seated", "left", "no-show"],
  seated: [],
  left: [],
  "no-show": [],
};

export function canTransition(from: PartyStatus, to: PartyStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Tables that are free and can fit the party. */
export function availableTablesFor(tables: RestaurantTable[], partySize: number): RestaurantTable[] {
  return tables
    .filter((t) => !t.occupiedBy && t.capacity >= partySize)
    .sort((a, b) => a.capacity - b.capacity || a.number.localeCompare(b.number, undefined, { numeric: true }));
}

/** Smallest available table that fits the party, or null. */
export function recommendTable(
  tables: RestaurantTable[],
  partySize: number,
): RestaurantTable | null {
  return availableTablesFor(tables, partySize)[0] ?? null;
}

/** Returning guests: existing parties matching a phone number (most recent first). */
export function findReturningGuests(parties: Party[], phone: string): Party[] {
  const digits = normalizePhone(phone);
  if (digits.length < 7) return [];
  const seen = new Set<string>();
  return parties
    .filter((p) => normalizePhone(p.phone) === digits)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((p) => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatWait(minutes: number): string {
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function tableLabel(t: RestaurantTable): string {
  const base = `Table ${t.number} • ${t.capacity} seats`;
  return t.occupiedBy
    ? `${base} • Occupied • ${t.occupiedBy.name} (${t.occupiedBy.partySize})`
    : `${base} • Available`;
}
