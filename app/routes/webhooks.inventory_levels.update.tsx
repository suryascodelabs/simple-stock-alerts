import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { upsertInventoryLevel } from "../services/inventory";
import { getShopSettings } from "../services/settings";
import { evaluateLowStockAlert } from "../services/alerts";
import { dispatchAndSendReadyAlerts } from "../services/notificationDispatcher";
import { EmailSender, createConsoleEmailProvider, createBrevoProvider } from "../services/emailSender";
import { checkRateLimit } from "../utils/rateLimit";
import crypto from "crypto";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const traceId = crypto.randomUUID();

  const windowMs =
    Number(process.env.WEBHOOK_RATE_WINDOW_MS) && Number(process.env.WEBHOOK_RATE_WINDOW_MS) > 0
      ? Number(process.env.WEBHOOK_RATE_WINDOW_MS)
      : 30_000;
  const max =
    Number(process.env.WEBHOOK_RATE_MAX) && Number(process.env.WEBHOOK_RATE_MAX) > 0
      ? Number(process.env.WEBHOOK_RATE_MAX)
      : 50;

  const rate = checkRateLimit(`webhook:${shop}`, { windowMs, max });
  if (!rate.allowed) {
    console.warn("Rate limit hit for webhook", { traceId, shop, windowMs, max });
    return new Response("Rate limit", { status: 429 });
  }

  const level = payload?.inventory_level ?? payload;
  const inventoryItemId = String(level.inventory_item_id || level.inventoryItemId || "");
  const locationId = String(level.location_id || level.locationId || "");
  const available = level.available;
  const updatedAt = level.updated_at || level.updatedAt || new Date().toISOString();

  if (!inventoryItemId || !locationId || available === undefined) {
    console.warn(`Invalid ${topic} webhook for ${shop}`, { traceId, payload });
    return new Response();
  }

  console.log(`Received ${topic} for ${shop}`, {
    traceId,
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
    traceId,
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

  const alertDecision =
    record.available > settings.globalThreshold
      ? "Stock above threshold; clearing any active alerts."
      : alertResult
        ? `Alert ready (id: ${alertResult.id}); stock at/below threshold.`
        : "Alert already active or no change; not enqueuing another.";

  console.info("Alert evaluation", {
    traceId,
    shop,
    inventoryItemId,
    threshold: settings.globalThreshold,
    currentAvailable: record.available,
    result: alertResult ? alertResult.status : "noop",
    alertId: alertResult?.id,
    decision: alertDecision,
  });

  // Fan out any ready alerts via email (other channels can be added later).
  const emailProvider =
    process.env.BREVO_API_KEY && process.env.EMAIL_FROM
      ? createBrevoProvider(process.env.BREVO_API_KEY)
      : createConsoleEmailProvider();

  const emailSender = new EmailSender(
    emailProvider,
    process.env.EMAIL_FROM || "no-reply@simple-stock-alerts.local",
    traceId,
  );
  console.info("Dispatching alerts", {
    traceId,
    shop,
    provider: process.env.BREVO_API_KEY ? "brevo" : "console",
    recipients: settings.alertEmails,
  });
  await dispatchAndSendReadyAlerts(
    shop,
    ["email"],
    [emailSender],
    {
      emailRecipients: settings.alertEmails,
      traceId,
    },
  );

  return new Response();
};
