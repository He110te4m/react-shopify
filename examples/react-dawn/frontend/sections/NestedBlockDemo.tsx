import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid } from "vite-plugin-react-shopify/runtime";
import "../styles/shared.css";

export const shopifyMeta = {
  name: "Nested Block Demo (React)",
  tag: "section",
  class: "section",
  blocks: [{ type: "nested-child-block" }],
  presets: [{ name: "Nested Block Demo" }],
} satisfies ShopifyMeta;

export default function NestedBlockDemo() {
  return (
    <div className="page-width" style={{ padding: "4rem 0" }}>
      <h2>Nested Block Demo</h2>
      <BlockSlot />
    </div>
  );
}
