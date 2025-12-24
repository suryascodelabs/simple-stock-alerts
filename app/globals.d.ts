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
    "s-page": any;
    "s-section": any;
    "s-stack": any;
    "s-text": any;
    "s-text-field": any;
    "s-button": any;
    "s-banner": any;
    "s-icon": any;
    "s-select": any;
    "s-option": any;
    "s-box": any;
    "s-badge": any;
    "s-tooltip": any;
  }
}
