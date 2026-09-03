declare module "swagger-ui-dist/swagger-ui-bundle.js" {
  type SwaggerUIBundleOptions = {
    spec?: unknown;
    url?: string;
    domNode: Element | null;
    presets?: unknown[];
    layout?: string;
  };
  type SwaggerUIBundleFn = {
    (options: SwaggerUIBundleOptions): unknown;
    presets: { apis: unknown };
  };
  const SwaggerUIBundle: SwaggerUIBundleFn;
  export default SwaggerUIBundle;
}
