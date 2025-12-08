export type InventoryLevelInput = {
  shop: string;
  inventoryItemId: string;
  locationId: string;
  available: number;
  updatedAt: Date;
  variantId?: string;
  productId?: string;
  source?: string;
};

export type InventoryLevelRecord = InventoryLevelInput & {
  id: number;
  shopId: number;
  createdAt: Date;
  lastSyncedAt: Date;
};
