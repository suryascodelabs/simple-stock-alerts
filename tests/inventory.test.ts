import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

import { shouldUpdateInventory } from "../app/services/inventory";

const mockAdmin = (payload: unknown) => ({
  graphql: vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(payload),
  }),
});

describe("shouldUpdateInventory", () => {
  it("returns true when no existing record", () => {
    expect(shouldUpdateInventory(null, new Date())).toBe(true);
  });

  it("returns true when incoming is newer", () => {
    const existing = new Date("2024-01-01T00:00:00Z");
    const incoming = new Date("2024-01-02T00:00:00Z");
    expect(shouldUpdateInventory(existing, incoming)).toBe(true);
  });

  it("returns false when incoming is older or same", () => {
    const existing = new Date("2024-01-02T00:00:00Z");
    const incoming = new Date("2024-01-01T00:00:00Z");
    expect(shouldUpdateInventory(existing, incoming)).toBe(false);
    expect(shouldUpdateInventory(existing, existing)).toBe(false);
  });
});

// Backfill/resync removed from MVP; tests focus on freshness guard only.
