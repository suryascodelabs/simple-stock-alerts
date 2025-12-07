import type { AdminGraphqlClient } from "../types/admin";
import { PRODUCT_DIAGNOSTICS_QUERY } from "../queries/admin/productDiagnostics";

export type ProductDiagnosticsResult = {
  productCount: number;
  firstProductTitle?: string;
  firstVariantTitle?: string;
};

export async function fetchProductDiagnostics(
  admin: AdminGraphqlClient,
  { sampleSize = 2 }: { sampleSize?: number } = {},
): Promise<ProductDiagnosticsResult> {
  const response = await admin.graphql(PRODUCT_DIAGNOSTICS_QUERY, {
    variables: { first: sampleSize },
  });
  const json = (await response.json()) as {
    data?: {
      products?: { edges?: Array<{ node?: { title?: string; variants?: { edges?: Array<{ node?: { title?: string } }> } } }> };
      productsCount?: { count?: number };
    };
    errors?: Array<{ message?: string }>;
  };

  if (json.errors?.length) {
    const message = json.errors.map((e) => e.message).filter(Boolean).join("; ");
    throw new Error(message || "Unknown Shopify Admin error");
  }

  const edges = json.data?.products?.edges || [];
  const firstProduct = edges[0]?.node;
  const firstVariant = firstProduct?.variants?.edges?.[0]?.node;

  return {
    productCount: json.data?.productsCount?.count ?? edges.length,
    firstProductTitle: firstProduct?.title,
    firstVariantTitle: firstVariant?.title,
  };
}
