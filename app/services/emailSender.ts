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
  private traceId?: string;

  constructor(provider: EmailProvider, from?: string, traceId?: string) {
    this.provider = provider;
    this.from = from;
    this.traceId = traceId;
  }

  async send(job: DispatchJob) {
    const recipients = job.recipients?.filter(Boolean) ?? [];
    if (recipients.length === 0) {
      return { status: "failed" as const, error: "No recipients configured" };
    }

    const content = renderLowStockEmail(job);
    try {
      console.info("EmailSender: sending", {
        recipients,
        subject: content.subject,
        channel: this.channel,
        from: this.from,
        message: "Sending low stock email.",
        traceId: this.traceId,
      });
      const result = await this.provider.send({
        to: recipients,
        subject: content.subject,
        text: content.text,
        html: content.html,
        from: this.from,
      });
      return { status: "sent" as const, providerMessageId: result.id };
    } catch (error: any) {
      console.error("EmailSender: send failed", {
        error: error?.message || String(error),
        recipients,
        message: "Email send failed.",
        traceId: this.traceId,
      });
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

// Brevo (Sendinblue) provider using transactional email API v3.
export function createBrevoProvider(apiKey: string): EmailProvider {
  return {
    async send(input) {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          sender: input.from ? { email: input.from } : undefined,
          to: input.to.map((email) => ({ email })),
          subject: input.subject,
          textContent: input.text,
          htmlContent: input.html,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo send failed (${response.status}): ${errorBody}`);
      }

      const result = await response.json().catch(() => ({}));
      return { id: result?.messageId || result?.messageId?.[0] || "brevo" };
    },
  };
}
