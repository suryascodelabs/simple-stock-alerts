import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { upsertInventoryLevel } from "../services/inventory";

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

  await upsertInventoryLevel({
    shop,
    inventoryItemId,
    locationId,
    available: Number(available),
    updatedAt: new Date(updatedAt),
    source: "webhook",
  });

  return new Response();
};
