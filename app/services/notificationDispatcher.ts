import db from "../db.server";
import { ensureStore } from "./store";

export type NotificationChannel = "email" | "slack" | "sms" | "whatsapp";
export type NotificationType = "low-stock";

export type NotificationPayload = {
  type: NotificationType;
  alertId: number;
  shopId: number;
  shop: string;
  inventoryItemId: string;
  variantId?: string | null;
  productId?: string | null;
  available: number;
  threshold: number;
  occurredAt: Date;
};

export type DispatchJob = {
  payload: NotificationPayload;
  channel: NotificationChannel;
  logId: number;
};

// Interfaces to keep transport/channel swappable (DB-backed today; Kafka/others later).
export interface ChannelSender {
  channel: NotificationChannel;
  send: (job: DispatchJob) => Promise<{ status: "sent" | "failed"; providerMessageId?: string; error?: string }>;
}

export interface NotificationDispatcher {
  enqueueForShop: (shop: string, channels?: NotificationChannel[]) => Promise<DispatchJob[]>;
  markStatus: (
    logId: number,
    status: "queued" | "sent" | "failed",
    options?: { providerMessageId?: string; error?: string },
  ) => Promise<void>;
}

/**
 * Prepares dispatch jobs for all ready alerts for a shop and records them as queued.
 * This is intentionally channel-agnostic: callers choose which channels to fan out to.
 */
export async function prepareDispatchJobs(
  shop: string,
  channels: NotificationChannel[] = ["email"],
): Promise<DispatchJob[]> {
  const store = await ensureStore(shop);

  const alerts = await db.lowStockAlert.findMany({
    where: { shopId: store.id, status: "ready" },
    orderBy: { createdAt: "asc" },
  });

  const jobs: DispatchJob[] = [];

  for (const alert of alerts) {
    for (const channel of channels) {
      const log = await db.notificationLog.create({
        data: {
          shopId: store.id,
          alertId: alert.id,
          channel,
          status: "queued",
          attempts: 0,
        },
      });

      jobs.push({
        channel,
        logId: log.id,
        payload: {
          type: "low-stock",
          alertId: alert.id,
          shopId: store.id,
          shop,
          inventoryItemId: alert.inventoryItemId,
          variantId: alert.variantId,
          productId: alert.productId,
          available: alert.available,
          threshold: alert.threshold,
          occurredAt: alert.updatedAt,
        },
      });
    }
  }

  return jobs;
}

export async function updateNotificationLogStatus(
  logId: number,
  status: "queued" | "sent" | "failed",
  options?: { providerMessageId?: string; error?: string },
) {
  return db.notificationLog.update({
    where: { id: logId },
    data: {
      status,
      providerMessageId: options?.providerMessageId,
      error: options?.error,
      attempts: { increment: status === "queued" ? 0 : 1 },
    },
  });
}
