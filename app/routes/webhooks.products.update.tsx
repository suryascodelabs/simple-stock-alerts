import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Fallback webhook: reserved for future safety net syncs
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop} (currently no-op)`, {
    productId: payload?.admin_graphql_api_id || payload?.id,
  });

  return new Response();
};
