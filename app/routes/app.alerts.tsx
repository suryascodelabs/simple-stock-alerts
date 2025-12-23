import type { LoaderFunctionArgs, HeadersFunction, ActionFunctionArgs } from "react-router";
import { useLoaderData, useRouteError, Form, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  BlockStack,
  Card,
  DataTable,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { listAlerts, updateAlertStatus } from "../services/alerts";
import { listNotificationLogs } from "../services/notificationLogs";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "all";
  const statuses =
    statusFilter === "all" ? undefined : statusFilter.split(",").filter(Boolean);

  const alerts = await listAlerts(session.shop, statuses);
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

  switch (intent) {
    case "resend":
      await updateAlertStatus(session.shop, alertId, "ready");
      break;
    case "cancel":
    case "clear":
      await updateAlertStatus(session.shop, alertId, "cleared");
      break;
    default:
      break;
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

  return (
    <Page title="Alerts" subtitle="Review ready alerts and send history">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="200">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Alert queue
              </Text>
              <Select
                labelHidden
                label="Status filter"
                value={statusFilter}
                options={[
                  { label: "Ready", value: "ready" },
                  { label: "Sent", value: "sent" },
                  { label: "Cleared", value: "cleared" },
                  { label: "All", value: "all" },
                ]}
                onChange={(value) => {
                  const params = new URLSearchParams(window.location.search);
                  params.set("status", value);
                  window.location.search = params.toString();
                }}
              />
            </InlineStack>
            {alerts.length === 0 ? (
              <Text tone="subdued">No alerts to show.</Text>
            ) : (
              <BlockStack gap="200">
                {alerts.map((alert: any) => (
                  <Card key={alert.id} roundedAbove="sm">
                    <BlockStack gap="150">
                      <InlineStack gap="200" align="space-between">
                        <BlockStack gap="050">
                          <Text variant="bodyMd" fontWeight="semibold">
                            Inventory item: {alert.inventoryItemId}
                          </Text>
                          <Text tone="subdued">
                            Variant: {alert.variantId || "N/A"} | Product:{" "}
                            {alert.productId || "N/A"}
                          </Text>
                          <Text tone="subdued">
                            Available: {alert.available} | Threshold: {alert.threshold}
                          </Text>
                          <Text tone="subdued">Status: {alert.status}</Text>
                        </BlockStack>
                        <InlineStack gap="100">
                          {alert.status !== "cleared" && (
                            <Form method="post">
                              <input type="hidden" name="alertId" value={alert.id} />
                              <input type="hidden" name="intent" value="clear" />
                              <button className="Polaris-Button" disabled={isSubmitting} type="submit">
                                <span className="Polaris-Button__Content">
                                  <span className="Polaris-Button__Text">Clear</span>
                                </span>
                              </button>
                            </Form>
                          )}
                          {alert.status === "sent" && (
                            <Form method="post">
                              <input type="hidden" name="alertId" value={alert.id} />
                              <input type="hidden" name="intent" value="resend" />
                              <button className="Polaris-Button" disabled={isSubmitting} type="submit">
                                <span className="Polaris-Button__Content">
                                  <span className="Polaris-Button__Text">Resend</span>
                                </span>
                              </button>
                            </Form>
                          )}
                          {alert.status === "ready" && (
                            <Form method="post">
                              <input type="hidden" name="alertId" value={alert.id} />
                              <input type="hidden" name="intent" value="cancel" />
                              <button className="Polaris-Button" disabled={isSubmitting} type="submit">
                                <span className="Polaris-Button__Content">
                                  <span className="Polaris-Button__Text">Cancel</span>
                                </span>
                              </button>
                            </Form>
                          )}
                        </InlineStack>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Send history
            </Text>
            {logs.length === 0 ? (
              <Text tone="subdued">No delivery attempts yet.</Text>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text"]}
                headings={["Channel", "Status", "Attempts", "When"]}
                rows={logs.map((log: any) => [
                  channelLabel(log.channel),
                  statusLabel(log.status),
                  String(log.attempts ?? 0),
                  new Date(log.createdAt).toLocaleString(),
                ])}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
