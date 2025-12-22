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
  if (available > threshold) {
    return "clear";
  }

  if (
    previousAvailable !== null &&
    previousAvailable !== undefined &&
    previousAvailable > threshold &&
    available <= threshold
  ) {
    return "enqueue";
  }

  return "noop";
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
    await db.lowStockAlert.updateMany({
      where: {
        shopId: store.id,
        inventoryItemId,
        status: "ready",
      },
      data: { status: "cleared", resolvedAt: new Date() },
    });
    return null;
  }

  if (action === "enqueue") {
    const existingReady = await db.lowStockAlert.findFirst({
      where: {
        shopId: store.id,
        inventoryItemId,
        status: "ready",
      },
    });

    if (existingReady) {
      return existingReady;
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
