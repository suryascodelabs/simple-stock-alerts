import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  BlockStack,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { listReadyAlerts } from "../services/alerts";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const alerts = await listReadyAlerts(session.shop);

  return { alerts };
};

export default function AlertsPage() {
  const { alerts } = useLoaderData<typeof loader>();

  return (
    <Page title="Alerts queue" subtitle="Ready-to-send low stock alerts">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              {alerts.length === 0 ? (
                <Text as="p" tone="subdued">
                  No alerts are waiting to send.
                </Text>
              ) : (
                alerts.map((alert: any) => (
                  <Card key={alert.id} sectioned>
                    <InlineStack gap="200">
                      <BlockStack gap="050">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          Inventory item: {alert.inventoryItemId}
                        </Text>
                        <Text as="p" tone="subdued">
                          Variant: {alert.variantId || "N/A"} | Product: {alert.productId || "N/A"}
                        </Text>
                        <Text as="p" tone="subdued">
                          Available: {alert.available} | Threshold: {alert.threshold}
                        </Text>
                        <Text as="p" tone="subdued">
                          Status: {alert.status}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </Card>
                ))
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
