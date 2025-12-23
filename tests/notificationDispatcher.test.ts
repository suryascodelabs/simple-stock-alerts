import { beforeEach, describe, expect, it, vi } from "vitest";
import db from "../app/db.server";
import { dispatchAndSendReadyAlerts } from "../app/services/notificationDispatcher";
import { EmailSender } from "../app/services/emailSender";

vi.mock("../app/db.server");

describe("dispatchAndSendReadyAlerts", () => {
  const provider = { send: vi.fn() };
  const sender = new EmailSender(provider, "from@example.com");

  beforeEach(() => {
    vi.resetAllMocks();
    provider.send.mockResolvedValue({ id: "msg-1" });
    (db.store.upsert as any).mockResolvedValue({ id: 1, shop: "shop" });
    (db.lowStockAlert.findMany as any).mockResolvedValue([
      {
        id: 10,
        shopId: 1,
        inventoryItemId: "inv-1",
        variantId: "var-1",
        productId: "prod-1",
        available: 2,
        threshold: 5,
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ]);
    (db.notificationLog.create as any).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 55, ...data, createdAt: new Date(), updatedAt: new Date() }),
    );
    (db.notificationLog.update as any).mockResolvedValue({});
    (db.notificationLog.findFirst as any).mockResolvedValue(null);
    (db.lowStockAlert.update as any).mockResolvedValue({});
  });

  it("queues and sends email, marks log and alert sent", async () => {
    const count = await dispatchAndSendReadyAlerts("shop", ["email"], [sender], {
      emailRecipients: ["owner@example.com"],
    });

    expect(count).toBe(1);
    expect(provider.send).toHaveBeenCalled();
    expect(db.notificationLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 55 },
        data: expect.objectContaining({ status: "sent" }),
      }),
    );
    expect(db.lowStockAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ status: "sent" }),
      }),
    );
  });

  it("does not mark alert sent when channel fails", async () => {
    provider.send.mockRejectedValue(new Error("boom"));

    const count = await dispatchAndSendReadyAlerts("shop", ["email"], [sender], {
      emailRecipients: ["owner@example.com"],
    });

    expect(count).toBe(1);
    expect(db.notificationLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 55 },
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
    expect(db.lowStockAlert.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({ status: "sent" }),
      }),
    );
  });

  it("skips when attempts exceed maxAttempts", async () => {
    (db.notificationLog.findFirst as any).mockResolvedValue({
      id: 99,
      status: "failed",
      attempts: 3,
    });

    const count = await dispatchAndSendReadyAlerts("shop", ["email"], [sender], {
      emailRecipients: ["owner@example.com"],
      maxAttempts: 3,
    });

    expect(count).toBe(0);
    expect(provider.send).not.toHaveBeenCalled();
  });
});
