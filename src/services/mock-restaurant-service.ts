import { activeParties, canTransition, estimateWait } from "@/lib/logic";
import type { NewPartyInput, Party, PartyStatus, RestaurantTable, Settings } from "@/lib/types";
import type { RestaurantService } from "./restaurant-service";

/** Shared restaurant passcode for the mock backend. */
export const SHARED_PASSCODE = "1234";

const STORAGE_KEY = "nexttable.state.v1";
const AUTH_KEY = "nexttable.session.v1";

interface State {
  parties: Party[];
  tables: RestaurantTable[];
  settings: Settings;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function seed(): State {
  return {
    parties: [],
    settings: { seatingIntervalMinutes: 15 },
    tables: [
      { id: uid(), number: "1", capacity: 2 },
      { id: uid(), number: "2", capacity: 2 },
      { id: uid(), number: "3", capacity: 4 },
      { id: uid(), number: "4", capacity: 4 },
      { id: uid(), number: "5", capacity: 6 },
      { id: uid(), number: "6", capacity: 8 },
    ],
  };
}

/**
 * In-memory implementation with optional localStorage persistence.
 * Fully functional with no external backend.
 */
export class MockRestaurantService implements RestaurantService {
  private state: State;
  private storage: Storage | null;

  constructor(storage: Storage | null = typeof window !== "undefined" ? window.localStorage : null) {
    this.storage = storage;
    const raw = this.storage?.getItem(STORAGE_KEY);
    this.state = raw ? (JSON.parse(raw) as State) : seed();
    if (!raw) this.persist();
  }

  private persist() {
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  private party(id: string): Party {
    const p = this.state.parties.find((x) => x.id === id);
    if (!p) throw new Error("Party not found");
    return p;
  }

  private table(id: string): RestaurantTable {
    const t = this.state.tables.find((x) => x.id === id);
    if (!t) throw new Error("Table not found");
    return t;
  }

  // Auth
  async login(passcode: string) {
    const ok = passcode.trim() === SHARED_PASSCODE;
    if (ok) this.storage?.setItem(AUTH_KEY, "1");
    return ok;
  }
  async logout() {
    this.storage?.removeItem(AUTH_KEY);
  }
  async isAuthenticated() {
    return this.storage?.getItem(AUTH_KEY) === "1";
  }

  // Settings
  async getSettings() {
    return { ...this.state.settings };
  }
  async updateSettings(patch: Partial<Settings>) {
    this.state.settings = { ...this.state.settings, ...patch };
    this.persist();
    return { ...this.state.settings };
  }

  // Parties
  async listParties() {
    return this.state.parties.map((p) => ({ ...p }));
  }

  async addParty(input: NewPartyInput) {
    const ahead = activeParties(this.state.parties).length;
    const party: Party = {
      id: uid(),
      name: input.name.trim(),
      phone: input.phone.trim(),
      partySize: input.partySize,
      arrivalTime: input.arrivalTime,
      estimatedWaitMinutes: estimateWait(ahead, this.state.settings.seatingIntervalMinutes),
      status: "waiting",
      createdAt: new Date().toISOString(),
    };
    this.state.parties.push(party);
    this.persist();
    return { ...party };
  }

  async updatePartySize(partyId: string, partySize: number) {
    const p = this.party(partyId);
    // Wait estimate is intentionally left untouched.
    p.partySize = Math.max(1, Math.floor(partySize));
    this.persist();
    return { ...p };
  }

  async notifyParty(partyId: string) {
    const p = this.party(partyId);
    if (!canTransition(p.status, "notified")) throw new Error("Cannot notify this party");
    p.status = "notified";
    p.notifiedAt = new Date().toISOString();
    this.persist();
    return { ...p };
  }

  async setPartyStatus(partyId: string, status: Extract<PartyStatus, "left" | "no-show">) {
    const p = this.party(partyId);
    if (!canTransition(p.status, status)) throw new Error("Invalid status change");
    p.status = status;
    p.closedAt = new Date().toISOString();
    this.persist();
    return { ...p };
  }

  async seatParty(partyId: string, tableId: string) {
    const p = this.party(partyId);
    const t = this.table(tableId);
    if (!canTransition(p.status, "seated")) throw new Error("Invalid status change");
    if (t.occupiedBy) throw new Error("Table is already occupied");
    if (t.capacity < p.partySize) throw new Error("Table is too small for this party");
    const now = new Date().toISOString();
    p.status = "seated";
    p.seatedAt = now;
    p.closedAt = now;
    p.tableId = t.id;
    t.occupiedBy = { partyId: p.id, name: p.name, partySize: p.partySize, seatedAt: now };
    this.persist();
    return { party: { ...p }, table: { ...t } };
  }

  // Tables
  async listTables() {
    return this.state.tables.map((t) => ({ ...t }));
  }

  async addTable(input: { number: string; capacity: number }) {
    const t: RestaurantTable = {
      id: uid(),
      number: input.number.trim(),
      capacity: Math.max(1, Math.floor(input.capacity)),
    };
    this.state.tables.push(t);
    this.persist();
    return { ...t };
  }

  async updateTable(id: string, patch: { number?: string; capacity?: number }) {
    const t = this.table(id);
    if (patch.number !== undefined) t.number = patch.number.trim();
    if (patch.capacity !== undefined) t.capacity = Math.max(1, Math.floor(patch.capacity));
    this.persist();
    return { ...t };
  }

  async removeTable(id: string) {
    this.state.tables = this.state.tables.filter((t) => t.id !== id);
    this.persist();
  }

  async releaseTable(id: string) {
    const t = this.table(id);
    delete t.occupiedBy;
    this.persist();
    return { ...t };
  }
}
