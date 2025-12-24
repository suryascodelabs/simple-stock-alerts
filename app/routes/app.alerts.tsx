import type { LoaderFunctionArgs, HeadersFunction, ActionFunctionArgs } from "react-router";
import { Fragment } from "react";
import { useLoaderData, useRouteError, Form, useNavigation, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { listAlerts, applyAlertIntent } from "../services/alerts";
import { listNotificationLogs } from "../services/notificationLogs";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("q") || undefined;
  const statuses =
    statusFilter === "all" ? undefined : statusFilter.split(",").filter(Boolean);

  const alerts = await listAlerts(session.shop, statuses, search);
  const logs = await listNotificationLogs(session.shop);

  return { alerts, logs, statusFilter };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const alertId = Number(formData.get("alertId"));

  if (!alertId || !intent) {
    return null;
  }

  if (intent === "resend" || intent === "cancel" || intent === "clear") {
    await applyAlertIntent(session.shop, alertId, intent as any);
  }

  return null;
};

const channelLabel = (channel: string) => {
  switch (channel) {
    case "email":
      return "📧 Email";
    case "slack":
      return "💬 Slack";
    case "sms":
      return "📱 SMS";
    case "whatsapp":
      return "🟢 WhatsApp";
    default:
      return channel;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "sent":
      return "✅ Sent";
    case "failed":
      return "⚠️ Failed";
    case "queued":
    case "ready":
      return "⏳ Queued";
    case "cleared":
      return "🧹 Cleared";
    default:
      return status;
  }
};

export default function AlertsPage() {
  const { alerts, logs, statusFilter } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const navigate = useNavigate();

  return (
    <s-page size="base">
      <s-stack gap="large" direction="vertical">
        <s-section>
          <s-stack gap="small" alignment="center" wrap={false} style={{ marginBottom: "var(--p-space-200)" }}>
            <s-text variant="headingMd" font-weight="semibold">Alerts queue</s-text>
            <s-tooltip content="Filter, resend, or clear alerts that are waiting to send." style={{ display: "inline-block" }}>
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <s-icon name="info-24" tone="subdued"></s-icon>
              </span>
            </s-tooltip>
          </s-stack>
          <s-box padding="medium" border="base" borderRadius="base" background="surface" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <s-stack gap="small" alignment="center" wrap={false} style={{ marginBottom: "var(--p-space-300)" }}>
              <s-text tone="subdued" style={{ minWidth: "100px" }}>
                Status
              </s-text>
              <div style={{ width: "180px" }}>
                <s-select
                  label="Status filter"
                  label-visibility="hidden"
                  value={statusFilter}
                  onChange={(e: any) => {
                    const params = new URLSearchParams(window.location.search);
                    params.set("status", e.currentTarget.value);
                    navigate(`?${params.toString()}`);
                  }}
                >
                  <s-option value="ready">Ready</s-option>
                  <s-option value="sent">Sent</s-option>
                  <s-option value="cleared">Cleared</s-option>
                  <s-option value="all">All</s-option>
                </s-select>
              </div>
            </s-stack>

            <s-box padding="none" border="base" borderRadius="base" background="surface">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 0.8fr",
                  padding: "10px 12px",
                  fontWeight: 600,
                  color: "var(--p-text-subdued, #616161)",
                  background: "#f8f9fa",
                }}
              >
                <span>Item</span>
                <span>Details</span>
                <span>Status</span>
              </div>
              {alerts.length === 0 ? (
                <div style={{ padding: "12px 12px", borderTop: "1px solid #e1e3e5" }}>
                  <s-text tone="subdued">No alerts to show.</s-text>
                </div>
              ) : (
                alerts.map((alert: any, index: number) => (
                  <div
                  key={alert.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr 0.8fr",
                    padding: "12px 12px",
                    alignItems: "center",
                    borderTop: "1px solid #e1e3e5",
                    rowGap: "6px",
                  }}
                  >
                    <span>
                      <strong>Inventory:</strong> {alert.inventoryItemId}
                      <br />
                      <s-text tone="subdued" as="span">
                        Available {alert.available} / Threshold {alert.threshold}
                      </s-text>
                    </span>
                    <span>
                      <s-text tone="subdued" as="span">
                        Variant: {alert.variantId || "N/A"} | Product: {alert.productId || "N/A"}
                      </s-text>
                    </span>
                    <span>{statusLabel(alert.status)}</span>
                  </div>
                ))
              )}
            </s-box>
          </s-box>
        </s-section>

        <s-section>
          <s-stack gap="small" alignment="center" wrap={false} style={{ marginBottom: "var(--p-space-200)" }}>
            <s-text variant="headingMd" font-weight="semibold">Send history</s-text>
            <s-tooltip content="Recent delivery attempts across channels." style={{ display: "inline-block" }}>
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <s-icon name="info-24" tone="subdued"></s-icon>
              </span>
            </s-tooltip>
          </s-stack>
          <s-box
            padding="none"
            border="base"
            borderRadius="base"
            background="surface"
            style={{ marginTop: "var(--p-space-300)", boxShadow: "0 0 0 1px #e1e3e5" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 0.6fr 1.2fr",
                padding: "10px 12px",
                fontWeight: 600,
                color: "var(--p-text-subdued, #616161)",
              }}
            >
              <span>Channel</span>
              <span>Status</span>
              <span style={{ textAlign: "center" }}>Attempts</span>
              <span>When</span>
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: "12px 12px", borderTop: "1px solid #e1e3e5" }}>
                <s-text tone="subdued">No delivery attempts yet.</s-text>
              </div>
            ) : (
              logs.map((log: any, index: number) => (
                <div
                  key={log.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 0.6fr 1.2fr",
                    padding: "12px 12px",
                    alignItems: "center",
                    borderTop: "1px solid #e1e3e5",
                  }}
                >
                  <span>{channelLabel(log.channel)}</span>
                  <span>{statusLabel(log.status)}</span>
                  <span style={{ textAlign: "center" }}>{String(log.attempts ?? 0)}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))
            )}
          </s-box>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
