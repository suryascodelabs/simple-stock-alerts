import { describe, expect, it, vi } from "vitest";

import { fetchProductDiagnostics } from "../app/services/productDiagnostics";

const mockAdmin = (payload: unknown) => ({
  graphql: vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue(payload),
  }),
});

describe("fetchProductDiagnostics", () => {
  it("returns counts and titles when data is present", async () => {
    const admin = mockAdmin({
      data: {
        productsCount: { count: 2 },
        products: {
          edges: [
            {
              node: {
                title: "Board",
                variants: { edges: [{ node: { title: "Board - Small" } }] },
              },
            },
          ],
        },
      },
    });

    const result = await fetchProductDiagnostics(admin);

    expect(result).toEqual({
      productCount: 2,
      firstProductTitle: "Board",
      firstVariantTitle: "Board - Small",
    });
    expect(admin.graphql).toHaveBeenCalledTimes(1);
  });

  it("handles empty product lists", async () => {
    const admin = mockAdmin({
      data: {
        productsCount: { count: 0 },
        products: { edges: [] },
      },
    });

    const result = await fetchProductDiagnostics(admin);

    expect(result).toEqual({
      productCount: 0,
      firstProductTitle: undefined,
      firstVariantTitle: undefined,
    });
  });

  it("throws on Shopify errors", async () => {
    const admin = mockAdmin({
      errors: [{ message: "Something went wrong" }],
    });

    await expect(fetchProductDiagnostics(admin)).rejects.toThrow(
      "Something went wrong",
    );
  });
});
