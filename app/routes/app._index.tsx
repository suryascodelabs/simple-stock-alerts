import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
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

  const [threshold, setThreshold] = useState("");
  const [emails, setEmails] = useState("");

  useEffect(() => {
    if (actionData?.ok) {
      setThreshold("");
      setEmails("");
    } else if (actionData?.values) {
      setThreshold(actionData.values.globalThreshold ?? "");
      setEmails(actionData.values.alertEmails ?? "");
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
    <s-page size="base">
      <s-section
        heading="Simple Stock Alerts"
        description="Never miss low inventory again. Simple today — powerful features coming soon."
      >
        <s-section>
          <s-banner tone="info" heading="Reliability you can count on">
            We monitor your inventory in real time using Shopify webhooks. Alerts are delivered
            instantly — without duplicates or delays.
          </s-banner>
        </s-section>

        <s-section heading="Alert Settings">
          <Form method="post">
            <s-stack gap="base">
              <s-text-field
                label="Global low stock threshold"
                type="number"
                name="globalThreshold"
                placeholder={settings.globalThreshold?.toString() ?? "5"}
                value={threshold}
                onInput={(e: any) => onThresholdChange(e.currentTarget.value)}
                helptext="We’ll alert you when any product variant’s available quantity is at or below this number."
                error={actionData?.errors?.globalThreshold}
              />

              <s-text-field
                label="Alert email(s)"
                name="alertEmails"
                value={emails}
                onInput={(e: any) => onEmailsChange(e.currentTarget.value)}
                placeholder="you@store.com, warehouse@store.com"
                helptext="Comma-separated emails. We’ll send low stock alerts to these addresses."
                error={actionData?.errors?.alertEmails}
              />

              <div
                style={{
                  display: "flex",
                  gap: "var(--p-space-200, 0.5rem)",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <s-button variant="secondary" type="button" onClick={onSendTestAlert}>
                  Send test alert
                </s-button>
                <s-button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save settings"}
                </s-button>
              </div>
            </s-stack>
          </Form>
        </s-section>

        <s-section>
          <s-banner tone="success" heading="Webhook connection healthy" size="slim">
            Alerts will be sent automatically.
          </s-banner>
        </s-section>

        <s-section heading="Coming Soon">
          <s-stack gap="small" direction="vertical">
            <s-text>Slack alerts</s-text>
            <s-text>Daily summary email</s-text>
            <s-text>Inventory insights</s-text>
          </s-stack>
        </s-section>

        <s-section heading="Support">
          <s-text tone="subdued">
            Need help? Contact{" "}
            <s-link href="mailto:support@simplecodelabs.com" target="auto">
              support@simplecodelabs.com
            </s-link>
          </s-text>
          <s-text tone="subdued">Built by Simple Code Labs</s-text>
        </s-section>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
