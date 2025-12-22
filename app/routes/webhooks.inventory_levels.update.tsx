import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { upsertInventoryLevel } from "../services/inventory";
import { getShopSettings } from "../services/settings";
import { evaluateLowStockAlert } from "../services/alerts";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const level = payload?.inventory_level ?? payload;
  const inventoryItemId = String(level.inventory_item_id || level.inventoryItemId || "");
  const locationId = String(level.location_id || level.locationId || "");
  const available = level.available;
  const updatedAt = level.updated_at || level.updatedAt || new Date().toISOString();

  if (!inventoryItemId || !locationId || available === undefined) {
    console.warn(`Invalid ${topic} webhook for ${shop}`, { payload });
    return new Response();
  }

  console.log(`Received ${topic} for ${shop}`, {
    inventoryItemId,
    locationId,
    available,
    updatedAt,
  });

  const { record, previousAvailable } = await upsertInventoryLevel({
    shop,
    inventoryItemId,
    locationId,
    available: Number(available),
    updatedAt: new Date(updatedAt),
    source: "webhook",
  });

  const settings = await getShopSettings(shop);
  await evaluateLowStockAlert({
    shop,
    inventoryItemId,
    available: record.available,
    threshold: settings.globalThreshold,
    previousAvailable,
    variantId: record.variantId,
    productId: record.productId,
  });

  return new Response();
};
