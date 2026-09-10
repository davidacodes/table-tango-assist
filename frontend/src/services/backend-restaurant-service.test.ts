import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendRestaurantService } from "./backend-restaurant-service";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("BackendRestaurantService", () => {
  let storage: MemoryStorage;
  let fetcher: ReturnType<typeof vi.fn>;
  let service: BackendRestaurantService;

  beforeEach(() => {
    storage = new MemoryStorage();
    fetcher = vi.fn();
    service = new BackendRestaurantService({
      baseUrl: "http://api.test/api",
      fetcher,
      storage,
    });
  });

  it("stores bearer tokens after successful login", async () => {
    fetcher.mockResolvedValueOnce(jsonResponse({ authenticated: true, accessToken: "token-1" }));

    await expect(service.login("1234")).resolves.toBe(true);

    expect(storage.getItem("nexttable.accessToken")).toBe("token-1");
    expect(fetcher).toHaveBeenCalledWith(
      "http://api.test/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ passcode: "1234" }),
      }),
    );
  });

  it("clears stale tokens after failed login or session check", async () => {
    storage.setItem("nexttable.accessToken", "old-token");
    fetcher.mockResolvedValueOnce(jsonResponse({ authenticated: false, accessToken: null }));

    await expect(service.login("0000")).resolves.toBe(false);

    expect(storage.getItem("nexttable.accessToken")).toBeNull();

    storage.setItem("nexttable.accessToken", "old-token");
    fetcher.mockResolvedValueOnce(jsonResponse({ authenticated: false }));

    await expect(service.isAuthenticated()).resolves.toBe(false);

    expect(storage.getItem("nexttable.accessToken")).toBeNull();
  });

  it("sends bearer tokens to protected endpoints", async () => {
    storage.setItem("nexttable.accessToken", "token-1");
    fetcher.mockResolvedValueOnce(jsonResponse([]));

    await service.listParties();

    const [, init] = fetcher.mock.calls[0]!;
    expect(init.method).toBe("GET");
    expect((init.headers as Headers).get("authorization")).toBe("Bearer token-1");
  });

  it("maps service methods to the backend routes and request bodies", async () => {
    storage.setItem("nexttable.accessToken", "token-1");
    fetcher.mockResolvedValue(jsonResponse({ id: "1", number: "12", capacity: 4 }));

    await service.updateTable("table 1", { number: "12", capacity: 4 });

    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/tables/table%201");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({ number: "12", capacity: 4 }));
  });

  it("surfaces backend error messages", async () => {
    storage.setItem("nexttable.accessToken", "token-1");
    fetcher.mockResolvedValueOnce(
      jsonResponse({ error: "Table is too small for this party" }, { status: 409 }),
    );

    await expect(service.releaseTable("1")).rejects.toThrow("Table is too small for this party");
  });
});
