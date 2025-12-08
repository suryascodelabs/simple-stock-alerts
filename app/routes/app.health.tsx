import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { fetchProductDiagnostics } from "../services/productDiagnostics";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const diagnostics = await fetchProductDiagnostics(admin);

  return {
    shop: session.shop,
    ...diagnostics,
  };
};

export default function HealthPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <s-page heading="Health check">
      <s-stack direction="block" gap="base">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <p style={{ margin: 0 }}>Shop: {data.shop}</p>
        </s-box>
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <p style={{ margin: 0 }}>Products found: {data.productCount}</p>
        </s-box>
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <p style={{ margin: 0 }}>First product: {data.firstProductTitle || "None"}</p>
        </s-box>
        <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
          <p style={{ margin: 0 }}>First variant: {data.firstVariantTitle || "None"}</p>
        </s-box>
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
