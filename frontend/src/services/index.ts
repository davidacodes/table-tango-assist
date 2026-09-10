import { MockRestaurantService } from "./mock-restaurant-service";
import type { RestaurantService } from "./restaurant-service";

let instance: RestaurantService | null = null;

/** Single entry point the UI uses to reach the backend. */
export function getService(): RestaurantService {
  if (!instance) instance = new MockRestaurantService();
  return instance;
}

export type { RestaurantService };
