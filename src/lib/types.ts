export type PartyStatus = "waiting" | "notified" | "seated" | "left" | "no-show";

export interface Party {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  /** ISO timestamp of arrival */
  arrivalTime: string;
  /** Locked at creation time. Never recalculated. */
  estimatedWaitMinutes: number;
  status: PartyStatus;
  notifiedAt?: string;
  seatedAt?: string;
  closedAt?: string;
  tableId?: string;
  createdAt: string;
}

export interface RestaurantTable {
  id: string;
  number: string;
  capacity: number;
  /** Present when the table is occupied. */
  occupiedBy?: { partyId: string; name: string; partySize: number; seatedAt: string };
}

export interface Settings {
  seatingIntervalMinutes: number;
}

export interface NewPartyInput {
  name: string;
  phone: string;
  partySize: number;
  arrivalTime: string;
}
