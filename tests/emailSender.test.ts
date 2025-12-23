import { describe, it, expect, vi } from "vitest";
import { EmailSender, renderLowStockEmail } from "../app/services/emailSender";
import type { DispatchJob } from "../app/services/notificationDispatcher";

const baseJob: DispatchJob = {
  channel: "email",
  logId: 1,
  recipients: ["owner@example.com"],
  payload: {
    type: "low-stock",
    alertId: 99,
    shopId: 1,
    shop: "test-shop.myshopify.com",
    inventoryItemId: "inv-1",
    variantId: "var-1",
    productId: "prod-1",
    available: 2,
    threshold: 5,
    occurredAt: new Date("2025-01-01T00:00:00Z"),
  },
};

describe("renderLowStockEmail", () => {
  it("creates a subject and body with key fields", () => {
    const content = renderLowStockEmail(baseJob);
    expect(content.subject).toContain("low stock", { ignoreCase: true });
    expect(content.text).toContain("inv-1");
    expect(content.text).toContain("prod-1");
    expect(content.text).toContain("var-1");
  });
});

describe("EmailSender", () => {
  it("sends via provider and returns sent", async () => {
    const provider = { send: vi.fn().mockResolvedValue({ id: "msg-123" }) };
    const sender = new EmailSender(provider, "from@example.com");
    const result = await sender.send(baseJob);
    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["owner@example.com"],
        subject: expect.stringContaining("Low stock alert"),
      }),
    );
    expect(result.status).toBe("sent");
    expect(result.providerMessageId).toBe("msg-123");
  });

  it("fails when no recipients provided", async () => {
    const provider = { send: vi.fn() };
    const sender = new EmailSender(provider);
    const result = await sender.send({ ...baseJob, recipients: [] });
    expect(result.status).toBe("failed");
    expect(provider.send).not.toHaveBeenCalled();
  });
});
