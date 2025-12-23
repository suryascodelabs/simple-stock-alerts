import db from "../db.server";
import { ensureStore } from "./store";

export async function listNotificationLogs(shop: string, limit = 50) {
  const store = await ensureStore(shop);
  return db.notificationLog.findMany({
    where: { shopId: store.id },
    include: {
      alert: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
