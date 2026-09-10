import type { NewPartyInput, Party, PartyStatus, RestaurantTable, Settings } from "@/lib/types";
import type { RestaurantService } from "./restaurant-service";

const TOKEN_KEY = "nexttable.accessToken";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api";

type Fetcher = typeof fetch;
type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

interface LoginResponse {
  authenticated: boolean;
  accessToken: string | null;
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

function tokenStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Fall through to the generic status message.
  }
  return response.statusText || `Request failed with status ${response.status}`;
}

export class BackendRestaurantService implements RestaurantService {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly storage: Storage | null;

  constructor(options: { baseUrl?: string; fetcher?: Fetcher; storage?: Storage | null } = {}) {
    this.baseUrl = (options.baseUrl ?? apiBaseUrl()).replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch.bind(globalThis);
    this.storage = options.storage ?? tokenStorage();
  }

  async login(passcode: string): Promise<boolean> {
    const body = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { passcode },
      auth: false,
    });
    if (!body.authenticated || !body.accessToken) {
      this.storage?.removeItem(TOKEN_KEY);
      return false;
    }
    this.storage?.setItem(TOKEN_KEY, body.accessToken);
    return true;
  }

  async logout(): Promise<void> {
    try {
      if (this.token()) {
        await this.request<void>("/auth/logout", { method: "POST" });
      }
    } finally {
      this.storage?.removeItem(TOKEN_KEY);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const body = await this.request<{ authenticated: boolean }>("/auth/session", {
      auth: false,
      token: this.token(),
    });
    if (!body.authenticated) this.storage?.removeItem(TOKEN_KEY);
    return body.authenticated;
  }

  getSettings(): Promise<Settings> {
    return this.request<Settings>("/settings");
  }

  updateSettings(patch: Partial<Settings>): Promise<Settings> {
    return this.request<Settings>("/settings", { method: "PATCH", body: patch });
  }

  listParties(): Promise<Party[]> {
    return this.request<Party[]>("/parties");
  }

  addParty(input: NewPartyInput): Promise<Party> {
    return this.request<Party>("/parties", { method: "POST", body: input });
  }

  updatePartySize(partyId: string, partySize: number): Promise<Party> {
    return this.request<Party>(`/parties/${encodeURIComponent(partyId)}/size`, {
      method: "PATCH",
      body: { partySize },
    });
  }

  notifyParty(partyId: string): Promise<Party> {
    return this.request<Party>(`/parties/${encodeURIComponent(partyId)}/notify`, {
      method: "POST",
    });
  }

  setPartyStatus(
    partyId: string,
    status: Extract<PartyStatus, "left" | "no-show">,
  ): Promise<Party> {
    return this.request<Party>(`/parties/${encodeURIComponent(partyId)}/status`, {
      method: "PATCH",
      body: { status },
    });
  }

  seatParty(partyId: string, tableId: string): Promise<{ party: Party; table: RestaurantTable }> {
    return this.request<{ party: Party; table: RestaurantTable }>(
      `/parties/${encodeURIComponent(partyId)}/seat`,
      {
        method: "POST",
        body: { tableId },
      },
    );
  }

  listTables(): Promise<RestaurantTable[]> {
    return this.request<RestaurantTable[]>("/tables");
  }

  addTable(input: { number: string; capacity: number }): Promise<RestaurantTable> {
    return this.request<RestaurantTable>("/tables", { method: "POST", body: input });
  }

  updateTable(id: string, patch: { number?: string; capacity?: number }): Promise<RestaurantTable> {
    return this.request<RestaurantTable>(`/tables/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patch,
    });
  }

  async removeTable(id: string): Promise<void> {
    await this.request<void>(`/tables/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  releaseTable(id: string): Promise<RestaurantTable> {
    return this.request<RestaurantTable>(`/tables/${encodeURIComponent(id)}/release`, {
      method: "POST",
    });
  }

  private token(): string | null {
    return this.storage?.getItem(TOKEN_KEY) ?? null;
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: JsonValue;
      auth?: boolean;
      token?: string | null;
    } = {},
  ): Promise<T> {
    const token = options.token ?? (options.auth === false ? null : this.token());
    const headers = new Headers();
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (token) headers.set("authorization", `Bearer ${token}`);

    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) throw new Error(await errorMessage(response));
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
