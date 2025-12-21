declare module "*.css";

declare module "@shopify/polaris";
declare module "@shopify/polaris/locales/en.json" {
  const content: any;
  export default content;
}

declare namespace JSX {
  interface IntrinsicElements {
    "s-app-nav": any;
    "s-link": any;
  }
}
