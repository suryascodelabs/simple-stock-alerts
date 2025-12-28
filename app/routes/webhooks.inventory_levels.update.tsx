import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { upsertInventoryLevel } from "../services/inventory";
import { getShopSettings } from "../services/settings";
import { evaluateLowStockAlert } from "../services/alerts";
import { dispatchAndSendReadyAlerts } from "../services/notificationDispatcher";
import { EmailSender, createConsoleEmailProvider, createBrevoProvider } from "../services/emailSender";

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

  console.info("Inventory upserted", {
    shop,
    inventoryItemId,
    previousAvailable,
    currentAvailable: record.available,
  });

  const settings = await getShopSettings(shop);
  const alertResult = await evaluateLowStockAlert({
    shop,
    inventoryItemId,
    available: record.available,
    threshold: settings.globalThreshold,
    previousAvailable,
    variantId: record.variantId,
    productId: record.productId,
  });

  console.info("Alert evaluation", {
    shop,
    inventoryItemId,
    threshold: settings.globalThreshold,
    previousAvailable,
    currentAvailable: record.available,
    result: alertResult ? alertResult.status : "noop",
    alertId: alertResult?.id,
  });

  // Fan out any ready alerts via email (other channels can be added later).
  const emailProvider =
    process.env.BREVO_API_KEY && process.env.EMAIL_FROM
      ? createBrevoProvider(process.env.BREVO_API_KEY)
      : createConsoleEmailProvider();

  const emailSender = new EmailSender(
    emailProvider,
    process.env.EMAIL_FROM || "no-reply@simple-stock-alerts.local",
  );
  console.info("Dispatching alerts", {
    shop,
    provider: process.env.BREVO_API_KEY ? "brevo" : "console",
    recipients: settings.alertEmails,
  });
  await dispatchAndSendReadyAlerts(shop, ["email"], [emailSender], {
    emailRecipients: settings.alertEmails,
  });

  return new Response();
};
