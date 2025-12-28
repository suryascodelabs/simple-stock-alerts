import db from "../db.server";

type EvaluateInput = {
  shop: string;
  inventoryItemId: string;
  available: number;
  threshold: number;
  previousAvailable: number | null;
  variantId?: string | null;
  productId?: string | null;
};

export function computeAlertTransition({
  available,
  threshold,
  previousAvailable,
}: Pick<EvaluateInput, "available" | "threshold" | "previousAvailable">) {
  // Simplified rule: current value drives action.
  // - If available <= threshold: enqueue (or keep existing ready)
  // - If available > threshold: clear (mark existing ready as cleared)
  if (available <= threshold) return "enqueue";
  return "clear";
}

export async function evaluateLowStockAlert({
  shop,
  inventoryItemId,
  available,
  threshold,
  previousAvailable,
  variantId,
  productId,
}: EvaluateInput) {
  const store = await db.store.upsert({
    where: { shop },
    update: { shop },
    create: { shop },
  });

  const action = computeAlertTransition({ available, threshold, previousAvailable });

  if (action === "clear") {
    await db.lowStockAlert.deleteMany({
      where: {
        shopId: store.id,
        inventoryItemId,
      },
    });
    return null;
  }

  if (action === "enqueue") {
    const existingActive = await db.lowStockAlert.findFirst({
      where: {
        shopId: store.id,
        inventoryItemId,
        status: { in: ["ready", "sent"] },
      },
    });

    if (existingActive) {
      return existingActive;
    }

    const alert = await db.lowStockAlert.create({
      data: {
        shopId: store.id,
        inventoryItemId,
        variantId: variantId ?? undefined,
        productId: productId ?? undefined,
        available,
        threshold,
        status: "ready",
      },
    });

    return alert;
  }

  return null;
}

export async function listReadyAlerts(shop: string) {
  const store = await db.store.findUnique({ where: { shop } });
  if (!store) return [];

  return db.lowStockAlert.findMany({
    where: { shopId: store.id, status: "ready" },
    orderBy: { createdAt: "desc" },
  });
}

export async function listAlerts(shop: string, statuses?: string[], search?: string) {
  const store = await db.store.findUnique({ where: { shop } });
  if (!store) return [];

  const where: any = { shopId: store.id };
  if (statuses && statuses.length > 0) {
    where.status = { in: statuses };
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { inventoryItemId: { contains: term } },
      { productId: { contains: term } },
      { variantId: { contains: term } },
    ];
  }

  return db.lowStockAlert.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function updateAlertStatus(
  shop: string,
  alertId: number,
  status: "ready" | "cleared",
) {
  const store = await db.store.findUnique({ where: { shop } });
  if (!store) return null;

  const alert = await db.lowStockAlert.findFirst({
    where: { id: alertId, shopId: store.id },
  });
  if (!alert) return null;

  return db.lowStockAlert.update({
    where: { id: alertId },
    data: {
      status,
      resolvedAt: status === "cleared" ? new Date() : null,
    },
  });
}

type AlertIntent = "resend" | "cancel" | "clear";

/**
 * Guarded status updates for alert actions.
 * - resend: only from sent -> ready
 * - cancel: only from ready -> cleared
 * - clear: from ready/sent -> cleared
 */
export async function applyAlertIntent(shop: string, alertId: number, intent: AlertIntent) {
  const store = await db.store.findUnique({ where: { shop } });
  if (!store) return null;

  const alert = await db.lowStockAlert.findFirst({
    where: { id: alertId, shopId: store.id },
  });
  if (!alert) return null;

  switch (intent) {
    case "resend":
      if (alert.status !== "sent") return alert;
      return db.lowStockAlert.update({
        where: { id: alert.id },
        data: { status: "ready", resolvedAt: null },
      });
    case "cancel":
      if (alert.status !== "ready") return alert;
      return db.lowStockAlert.update({
        where: { id: alert.id },
        data: { status: "cleared", resolvedAt: new Date() },
      });
    case "clear":
      if (alert.status === "cleared") return alert;
      return db.lowStockAlert.update({
        where: { id: alert.id },
        data: { status: "cleared", resolvedAt: new Date() },
      });
    default:
      return alert;
  }
}
