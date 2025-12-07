export const PRODUCT_DIAGNOSTICS_QUERY = `#graphql
  query productDiagnostics($first: Int!) {
    products(first: $first) {
      edges {
        node {
          title
          variants(first: 1) {
            edges {
              node {
                title
              }
            }
          }
        }
      }
    }
    productsCount {
      count
    }
  }
`;
