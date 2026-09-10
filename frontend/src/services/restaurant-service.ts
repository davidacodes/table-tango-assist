import type { NewPartyInput, Party, PartyStatus, RestaurantTable, Settings } from "@/lib/types";

/**
 * Services layer interface. All backend calls in the app go through this.
 * Swap the mock implementation for a real backend without touching the UI.
 */
export interface RestaurantService {
  // Auth (single shared restaurant login)
  login(passcode: string): Promise<boolean>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  // Parties
  listParties(): Promise<Party[]>;
  addParty(input: NewPartyInput): Promise<Party>;
  updatePartySize(partyId: string, partySize: number): Promise<Party>;
  notifyParty(partyId: string): Promise<Party>;
  setPartyStatus(partyId: string, status: Extract<PartyStatus, "left" | "no-show">): Promise<Party>;
  seatParty(partyId: string, tableId: string): Promise<{ party: Party; table: RestaurantTable }>;

  // Tables
  listTables(): Promise<RestaurantTable[]>;
  addTable(input: { number: string; capacity: number }): Promise<RestaurantTable>;
  updateTable(id: string, patch: { number?: string; capacity?: number }): Promise<RestaurantTable>;
  removeTable(id: string): Promise<void>;
  releaseTable(id: string): Promise<RestaurantTable>;
}
