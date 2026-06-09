import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Smoke Test (React)",
  tag: "section",
  class: "section",
  presets: [{ name: "Smoke Test" }],
} satisfies ShopifyMeta;

export default function SmokeTest() {
  const [locale] = useLiquid<string>("request.locale.iso_code");

  return (
    <div className="page-width" style={{ padding: "4rem 0", textAlign: "center" }}>
      <p>React Shopify — locale: {locale}</p>
    </div>
  );
}
