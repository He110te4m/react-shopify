import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import "../styles/shared.css";

export const shopifyMeta = {
  name: "Expression Test (React)",
  tag: "section",
  class: "section",
  presets: [{ name: "Expression Test" }],
} satisfies ShopifyMeta;

export default function ExpressionTest() {
  const [notFoundTitle] = useLiquid<string>("'templates.404.title' | t");
  const [allProductsUrl] = useLiquid<string>("routes.all_products_collection_url");
  const [locale] = useLiquid<string>("request.locale.iso_code");

  return (
    <div className="page-width" style={{ padding: "4rem 0" }}>
      <h2>Expression Test</h2>
      <ul>
        <li>t filter: {notFoundTitle}</li>
        <li>routes.all_products: {allProductsUrl}</li>
        <li>locale: {locale}</li>
      </ul>
    </div>
  );
}
