import { describe, expect, it } from "vitest";
import {
  activeParties,
  availableTablesFor,
  canTransition,
  estimateWait,
  findReturningGuests,
  formatWait,
  isActive,
  recommendTable,
  tableLabel,
} from "./logic";
import type { Party, RestaurantTable } from "./types";

function party(overrides: Partial<Party> = {}): Party {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Guest",
    phone: "5551234567",
    partySize: 2,
    arrivalTime: "2026-01-01T18:00:00.000Z",
    estimatedWaitMinutes: 0,
    status: "waiting",
    createdAt: "2026-01-01T18:00:00.000Z",
    ...overrides,
  };
}

function table(number: string, capacity: number, occupied = false): RestaurantTable {
  const base: RestaurantTable = { id: `t${number}`, number, capacity };
  if (!occupied) return base;
  return {
    ...base,
    occupiedBy: { partyId: "p", name: "Smith", partySize: 3, seatedAt: "2026-01-01T18:00:00.000Z" },
  };
}

describe("estimateWait", () => {
  it("multiplies parties ahead by the seating interval", () => {
    expect(estimateWait(0, 15)).toBe(0);
    expect(estimateWait(3, 15)).toBe(45);
    expect(estimateWait(2, 20)).toBe(40);
  });

  it("clamps negative input", () => {
    expect(estimateWait(-4, 15)).toBe(0);
    expect(estimateWait(2, -15)).toBe(0);
  });
});

describe("formatWait", () => {
  it("formats minutes and hours", () => {
    expect(formatWait(0)).toBe("Now");
    expect(formatWait(45)).toBe("45 min");
    expect(formatWait(60)).toBe("1 hr");
    expect(formatWait(95)).toBe("1 hr 35 min");
  });
});

describe("active list", () => {
  it("only includes waiting and notified, ordered by creation", () => {
    const list = [
      party({ status: "seated", createdAt: "2026-01-01T18:00:00.000Z" }),
      party({ status: "notified", createdAt: "2026-01-01T18:02:00.000Z" }),
      party({ status: "waiting", createdAt: "2026-01-01T18:01:00.000Z" }),
      party({ status: "left" }),
      party({ status: "no-show" }),
    ];
    const result = activeParties(list);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe("waiting");
    expect(result[1].status).toBe("notified");
  });

  it("treats closed statuses as inactive", () => {
    expect(isActive("waiting")).toBe(true);
    expect(isActive("notified")).toBe(true);
    expect(isActive("seated")).toBe(false);
    expect(isActive("left")).toBe(false);
    expect(isActive("no-show")).toBe(false);
  });
});

describe("state transitions", () => {
  it("allows the documented workflow", () => {
    expect(canTransition("waiting", "notified")).toBe(true);
    expect(canTransition("waiting", "seated")).toBe(true);
    expect(canTransition("notified", "seated")).toBe(true);
    expect(canTransition("notified", "left")).toBe(true);
    expect(canTransition("notified", "no-show")).toBe(true);
  });

  it("blocks moves out of terminal states and backwards", () => {
    expect(canTransition("notified", "waiting")).toBe(false);
    expect(canTransition("seated", "waiting")).toBe(false);
    expect(canTransition("left", "seated")).toBe(false);
    expect(canTransition("no-show", "notified")).toBe(false);
  });
});

describe("table recommendation", () => {
  const tables = [table("1", 2), table("3", 4), table("4", 4, true), table("6", 8), table("5", 6)];

  it("lists only free tables that fit, smallest first", () => {
    expect(availableTablesFor(tables, 3).map((t) => t.number)).toEqual(["3", "5", "6"]);
    expect(availableTablesFor(tables, 2).map((t) => t.number)).toEqual(["1", "3", "5", "6"]);
  });

  it("recommends the smallest available table that fits", () => {
    expect(recommendTable(tables, 1)?.number).toBe("1");
    expect(recommendTable(tables, 3)?.number).toBe("3");
    expect(recommendTable(tables, 5)?.number).toBe("5");
  });

  it("returns null when nothing fits", () => {
    expect(recommendTable(tables, 12)).toBeNull();
    expect(recommendTable([table("4", 4, true)], 2)).toBeNull();
  });

  it("labels tables for display", () => {
    expect(tableLabel(table("4", 4, true))).toBe("Table 4 • 4 seats • Occupied • Smith (3)");
    expect(tableLabel(table("2", 2))).toBe("Table 2 • 2 seats • Available");
  });
});

describe("returning guest detection", () => {
  const history = [
    party({ name: "John Smith", phone: "(555) 123-4567", createdAt: "2026-01-01T10:00:00.000Z" }),
    party({ name: "John Smith", phone: "555-123-4567", createdAt: "2026-01-01T12:00:00.000Z" }),
    party({ name: "Ana Diaz", phone: "5559999999" }),
  ];

  it("matches on digits only and de-duplicates by name", () => {
    const matches = findReturningGuests(history, "5551234567");
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe("John Smith");
  });

  it("ignores short or unknown numbers", () => {
    expect(findReturningGuests(history, "555")).toEqual([]);
    expect(findReturningGuests(history, "5550000000")).toEqual([]);
  });
});
