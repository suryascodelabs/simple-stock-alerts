import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/db.server", async () => {
  const mockDb = await import("./__mocks__/db.server");
  return { default: mockDb.default };
});
import db from "../app/db.server";
import { computeAlertTransition, evaluateLowStockAlert } from "../app/services/alerts";

describe("evaluateLowStockAlert", () => {
  const shop = "shop.test";
  const inventoryItemId = "gid://shopify/InventoryItem/1";
  const storeId = 1;

  beforeEach(() => {
    vi.resetAllMocks();
    (db.store.upsert as any).mockResolvedValue({ id: storeId, shop });
    (db.lowStockAlert.updateMany as any).mockResolvedValue({});
    (db.lowStockAlert.findFirst as any).mockResolvedValue(null);
    (db.lowStockAlert.create as any).mockResolvedValue({ id: 99, status: "ready" });
    (db.lowStockAlert.findMany as any).mockResolvedValue([]);
  });

  it("computeAlertTransition basic transitions", () => {
    expect(computeAlertTransition({ available: 4, threshold: 5, previousAvailable: 10 })).toBe(
      "enqueue",
    );
    expect(computeAlertTransition({ available: 2, threshold: 5, previousAvailable: 2 })).toBe(
      "enqueue",
    );
    expect(computeAlertTransition({ available: 6, threshold: 5, previousAvailable: 3 })).toBe(
      "clear",
    );
    expect(computeAlertTransition({ available: 3, threshold: 5, previousAvailable: null })).toBe(
      "enqueue",
    );
  });

  it("queues alert when crossing below threshold", async () => {
    const alert = await evaluateLowStockAlert({
      shop,
      inventoryItemId,
      available: 2,
      threshold: 5,
      previousAvailable: 10,
      variantId: "variant",
      productId: "product",
    });

    expect(alert?.status).toBe("ready");
    expect(db.lowStockAlert.create).toHaveBeenCalled();

    (db.lowStockAlert.findFirst as any).mockResolvedValue(alert);
    const second = await evaluateLowStockAlert({
      shop,
      inventoryItemId,
      available: 1,
      threshold: 5,
      previousAvailable: 2,
      variantId: "variant",
      productId: "product",
    });
    expect(db.lowStockAlert.create).toHaveBeenCalledTimes(1);
    expect(second).toBeNull();
  });

  it("clears ready alerts when stock recovers", async () => {
    await evaluateLowStockAlert({
      shop,
      inventoryItemId,
      available: 8,
      threshold: 5,
      previousAvailable: 2,
    });
    expect(db.lowStockAlert.deleteMany).toHaveBeenCalledWith({
      where: { shopId: storeId, inventoryItemId },
    });
  });
});
