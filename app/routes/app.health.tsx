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
      <s-description-list>
        <s-description-list-group>
          <s-text as="h3" variant="headingSm">
            Shop
          </s-text>
          <s-text as="p" variant="bodyMd">
            {data.shop}
          </s-text>
        </s-description-list-group>
        <s-description-list-group>
          <s-text as="h3" variant="headingSm">
            Products found
          </s-text>
          <s-text as="p" variant="bodyMd">
            {data.productCount}
          </s-text>
        </s-description-list-group>
        <s-description-list-group>
          <s-text as="h3" variant="headingSm">
            First product
          </s-text>
          <s-text as="p" variant="bodyMd">
            {data.firstProductTitle || "None"}
          </s-text>
        </s-description-list-group>
        <s-description-list-group>
          <s-text as="h3" variant="headingSm">
            First variant
          </s-text>
          <s-text as="p" variant="bodyMd">
            {data.firstVariantTitle || "None"}
          </s-text>
        </s-description-list-group>
      </s-description-list>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
