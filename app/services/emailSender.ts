import type { DispatchJob } from "./notificationDispatcher";
import type { ChannelSender } from "./notificationDispatcher";

type EmailProvider = {
  send: (input: {
    to: string[];
    subject: string;
    text: string;
    html: string;
    from?: string;
  }) => Promise<{ id?: string }>;
};

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function renderLowStockEmail(job: DispatchJob): EmailContent {
  const { payload } = job;
  const variantLabel = payload.variantId ?? "Variant";
  const productLabel = payload.productId ?? "Product";
  const subject = `Low stock alert: ${variantLabel} at ${payload.available}`;
  const text = [
    `Shop: ${payload.shop}`,
    `Product: ${productLabel}`,
    `Variant: ${variantLabel}`,
    `Inventory item: ${payload.inventoryItemId}`,
    `Available: ${payload.available}`,
    `Threshold: ${payload.threshold}`,
  ].join("\n");

  const html = `
    <p><strong>Low stock alert</strong></p>
    <p><strong>Shop:</strong> ${payload.shop}</p>
    <p><strong>Product:</strong> ${productLabel}</p>
    <p><strong>Variant:</strong> ${variantLabel}</p>
    <p><strong>Inventory item:</strong> ${payload.inventoryItemId}</p>
    <p><strong>Available:</strong> ${payload.available}</p>
    <p><strong>Threshold:</strong> ${payload.threshold}</p>
  `;

  return { subject, text, html };
}

export class EmailSender implements ChannelSender {
  channel: ChannelSender["channel"] = "email";
  private provider: EmailProvider;
  private from?: string;

  constructor(provider: EmailProvider, from?: string) {
    this.provider = provider;
    this.from = from;
  }

  async send(job: DispatchJob) {
    const recipients = job.recipients?.filter(Boolean) ?? [];
    if (recipients.length === 0) {
      return { status: "failed" as const, error: "No recipients configured" };
    }

    const content = renderLowStockEmail(job);
    try {
      const result = await this.provider.send({
        to: recipients,
        subject: content.subject,
        text: content.text,
        html: content.html,
        from: this.from,
      });
      return { status: "sent" as const, providerMessageId: result.id };
    } catch (error: any) {
      return { status: "failed" as const, error: error?.message ?? "Email send failed" };
    }
  }
}

// Simple console provider for development.
export function createConsoleEmailProvider(): EmailProvider {
  return {
    async send(input) {
      console.info("Sending email (console provider)", input);
      return { id: "console-provider" };
    },
  };
}
