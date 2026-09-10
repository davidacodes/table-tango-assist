import { beforeEach, describe, expect, it } from "vitest";
import { MockRestaurantService, SHARED_PASSCODE } from "./mock-restaurant-service";

function svc() {
  return new MockRestaurantService(null);
}

describe("shared login", () => {
  it("accepts the shared passcode only", async () => {
    const s = svc();
    expect(await s.login("0000")).toBe(false);
    expect(await s.login(SHARED_PASSCODE)).toBe(true);
  });
});

describe("waitlist flow", () => {
  let s: MockRestaurantService;
  const arrival = "2026-01-01T18:00:00.000Z";

  beforeEach(async () => {
    s = svc();
    await s.updateSettings({ seatingIntervalMinutes: 20 });
  });

  it("locks the wait estimate at the number of parties ahead", async () => {
    const a = await s.addParty({ name: "A", phone: "1", partySize: 2, arrivalTime: arrival });
    const b = await s.addParty({ name: "B", phone: "2", partySize: 2, arrivalTime: arrival });
    const c = await s.addParty({ name: "C", phone: "3", partySize: 2, arrivalTime: arrival });
    expect([a, b, c].map((p) => p.estimatedWaitMinutes)).toEqual([0, 20, 40]);
  });

  it("does not change the wait estimate when party size is edited", async () => {
    const p = await s.addParty({ name: "A", phone: "1", partySize: 2, arrivalTime: arrival });
    await s.addParty({ name: "B", phone: "2", partySize: 2, arrivalTime: arrival });
    const updated = await s.updatePartySize(p.id, 6);
    expect(updated.partySize).toBe(6);
    expect(updated.estimatedWaitMinutes).toBe(p.estimatedWaitMinutes);
  });

  it("records the notification time and blocks double notify", async () => {
    const p = await s.addParty({ name: "A", phone: "1", partySize: 2, arrivalTime: arrival });
    const notified = await s.notifyParty(p.id);
    expect(notified.status).toBe("notified");
    expect(notified.notifiedAt).toBeTruthy();
    await expect(s.notifyParty(p.id)).rejects.toThrow();
  });

  it("removes left and no-show parties from the active list", async () => {
    const a = await s.addParty({ name: "A", phone: "1", partySize: 2, arrivalTime: arrival });
    const b = await s.addParty({ name: "B", phone: "2", partySize: 2, arrivalTime: arrival });
    await s.setPartyStatus(a.id, "left");
    await s.setPartyStatus(b.id, "no-show");
    const active = (await s.listParties()).filter(
      (p) => p.status === "waiting" || p.status === "notified",
    );
    expect(active).toHaveLength(0);
  });

  it("later parties are estimated against only the active queue", async () => {
    const a = await s.addParty({ name: "A", phone: "1", partySize: 2, arrivalTime: arrival });
    await s.setPartyStatus(a.id, "left");
    const b = await s.addParty({ name: "B", phone: "2", partySize: 2, arrivalTime: arrival });
    expect(b.estimatedWaitMinutes).toBe(0);
  });
});

describe("seating and tables", () => {
  it("occupies the table, closes the party, then releases", async () => {
    const s = svc();
    const tables = await s.listTables();
    const four = tables.find((t) => t.capacity === 4)!;
    const p = await s.addParty({
      name: "Smith",
      phone: "1",
      partySize: 3,
      arrivalTime: "2026-01-01T18:00:00.000Z",
    });

    const { party, table } = await s.seatParty(p.id, four.id);
    expect(party.status).toBe("seated");
    expect(party.tableId).toBe(four.id);
    expect(table.occupiedBy).toMatchObject({ name: "Smith", partySize: 3 });

    await expect(s.seatParty(p.id, four.id)).rejects.toThrow();

    const released = await s.releaseTable(four.id);
    expect(released.occupiedBy).toBeUndefined();
  });

  it("refuses a table that is too small", async () => {
    const s = svc();
    const two = (await s.listTables()).find((t) => t.capacity === 2)!;
    const p = await s.addParty({
      name: "Big",
      phone: "1",
      partySize: 5,
      arrivalTime: "2026-01-01T18:00:00.000Z",
    });
    await expect(s.seatParty(p.id, two.id)).rejects.toThrow(/too small/i);
  });

  it("adds, edits and removes tables", async () => {
    const s = svc();
    const t = await s.addTable({ number: "12", capacity: 6 });
    expect((await s.listTables()).some((x) => x.id === t.id)).toBe(true);
    const edited = await s.updateTable(t.id, { capacity: 10, number: "12A" });
    expect(edited).toMatchObject({ capacity: 10, number: "12A" });
    await s.removeTable(t.id);
    expect((await s.listTables()).some((x) => x.id === t.id)).toBe(false);
  });
});
