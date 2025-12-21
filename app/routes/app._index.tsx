import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  TextField,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  Divider,
  List,
  Link,
  Banner,
} from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import {
  getShopSettings,
  saveShopSettings,
  validateSettings,
} from "../services/settings";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);
  return { shop: session.shop, settings };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const validation = validateSettings(
    formData.get("globalThreshold"),
    formData.get("alertEmails"),
  );

  const values = {
    globalThreshold:
      typeof formData.get("globalThreshold") === "string"
        ? formData.get("globalThreshold")!
        : "",
    alertEmails:
      typeof formData.get("alertEmails") === "string"
        ? formData.get("alertEmails")!
        : "",
  };

  if (!validation.parsed) {
    return { ok: false, errors: validation.errors, values };
  }

  await saveShopSettings(session.shop, validation.parsed);
  return { ok: true, settings: validation.parsed };
};

export default function AppIndex() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [threshold, setThreshold] = useState(settings.globalThreshold.toString());
  const [emails, setEmails] = useState(settings.alertEmails.join(", "));

  useEffect(() => {
    if (actionData?.ok && actionData.settings) {
      setThreshold(actionData.settings.globalThreshold.toString());
      setEmails(actionData.settings.alertEmails.join(", "));
    }
  }, [actionData]);

  const submitting = useMemo(
    () => navigation.state === "submitting",
    [navigation.state],
  );

  const onThresholdChange = useCallback((value: string) => {
    setThreshold(value);
  }, []);

  const onEmailsChange = useCallback((value: string) => {
    setEmails(value);
  }, []);

  const onSendTestAlert = useCallback(() => {
    console.log("Send test alert clicked");
  }, []);

  return (
    <Page
      title="Simple Stock Alerts"
      subtitle="Never miss low inventory again. Simple today — powerful features coming soon."
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="300">
            <Card>
              <Box padding="400">
                <Banner title="Reliability you can count on" tone="info">
                  <Text as="p" variant="bodySm" tone="subdued">
                    We monitor your inventory in real time using Shopify webhooks. Alerts are delivered instantly —
                    without duplicates or delays.
                  </Text>
                </Banner>
              </Box>
            </Card>

            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text as="h2" variant="headingLg">
                    Alert Settings
                  </Text>

                  <Form method="post">
                    <BlockStack gap="300">
                      <TextField
                        label="Global low stock threshold"
                        type="number"
                        value={threshold}
                        onChange={onThresholdChange}
                        autoComplete="off"
                        helpText="We’ll alert you when any product variant’s available quantity is at or below this number."
                        name="globalThreshold"
                        error={actionData?.errors?.globalThreshold}
                      />

                      <TextField
                        label="Alert email(s)"
                        value={emails}
                        onChange={onEmailsChange}
                        autoComplete="off"
                        placeholder="you@store.com, warehouse@store.com"
                        helpText="Comma-separated emails. We’ll send low stock alerts to these addresses."
                        name="alertEmails"
                        error={actionData?.errors?.alertEmails}
                      />

                      <InlineStack align="start" gap="200">
                        <Button variant="secondary" onClick={onSendTestAlert}>
                          Send test alert
                        </Button>
                        <Button variant="primary" submit loading={submitting}>
                          Save settings
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Form>

                  <Divider />

                  <BlockStack gap="200">
                    <Text as="h2" variant="headingLg">
                      Status
                    </Text>

                    <InlineStack gap="100" align="start" blockAlign="center">
                      <Box as="span" style={{ display: "inline-flex", margin: 0 }}>
                        <Icon source={CheckCircleIcon} tone="success" />
                      </Box>
                      <BlockStack gap="050">
                        <Text as="span" fontWeight="semibold" variant="bodyMd">
                          Active
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Webhook connection healthy. Alerts will be sent automatically.
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </BlockStack>

                <Divider />

                  <BlockStack gap="200">
                    <Text as="h2" variant="headingLg">
                      Coming Soon
                    </Text>

                    <InlineStack gap="800" align="start" wrap>
                      <Box minWidth="220px">
                        <List type="bullet">
                          <List.Item>Slack alerts</List.Item>
                          <List.Item>Daily summary email</List.Item>
                        </List>
                      </Box>
                      <Box minWidth="220px">
                        <List type="bullet">
                          <List.Item>Inventory insights</List.Item>
                        </List>
                      </Box>
                    </InlineStack>
                  </BlockStack>

                  <Divider />

                  <BlockStack gap="100">
                    <InlineStack gap="200" wrap>
                      <Text as="span" variant="bodySm" fontWeight="semibold">
                        Support
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Need help? Contact{" "}
                        <Link url="mailto:support@simplecodelabs.com">
                          support@simplecodelabs.com
                        </Link>
                      </Text>
                    </InlineStack>

                    <Text as="p" variant="bodySm" tone="subdued">
                      Built by Simple Code Labs
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
