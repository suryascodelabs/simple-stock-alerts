import db from "../db.server";
import type { InventoryLevelInput, InventoryLevelRecord } from "../types/inventory";
import { ensureStore } from "./store";

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

export const shouldUpdateInventory = (
  existingUpdatedAt: Date | null | undefined,
  incomingUpdatedAt: Date,
) => {
  if (!existingUpdatedAt) return true;
  return incomingUpdatedAt.getTime() > existingUpdatedAt.getTime();
};

export async function upsertInventoryLevel(
  input: InventoryLevelInput,
): Promise<InventoryLevelRecord> {
  const store = await ensureStore(input.shop);
  const incomingUpdatedAt = toDate(input.updatedAt);

  const existing = await db.productVariantInventory.findUnique({
    where: {
      shopId_inventoryItemId_locationId: {
        shopId: store.id,
        inventoryItemId: input.inventoryItemId,
        locationId: input.locationId,
      },
    },
  });

  if (existing && !shouldUpdateInventory(existing.updatedAt, incomingUpdatedAt)) {
    return existing as unknown as InventoryLevelRecord;
  }

  const record = await db.productVariantInventory.upsert({
    where: {
      shopId_inventoryItemId_locationId: {
        shopId: store.id,
        inventoryItemId: input.inventoryItemId,
        locationId: input.locationId,
      },
    },
    update: {
      available: input.available,
      updatedAt: incomingUpdatedAt,
      variantId: input.variantId ?? existing?.variantId,
      productId: input.productId ?? existing?.productId,
      source: input.source ?? existing?.source,
    },
    create: {
      shopId: store.id,
      inventoryItemId: input.inventoryItemId,
      locationId: input.locationId,
      available: input.available,
      updatedAt: incomingUpdatedAt,
      variantId: input.variantId,
      productId: input.productId,
      source: input.source,
    },
  });

  return record as unknown as InventoryLevelRecord;
}
