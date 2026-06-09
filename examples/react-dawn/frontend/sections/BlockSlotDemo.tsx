import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid } from "vite-plugin-react-shopify/runtime";
import "../styles/shared.css";

export const shopifyMeta = {
  name: "BlockSlot Demo (React)",
  tag: "section",
  class: "section",
  blocks: [{ type: "@theme" }],
  presets: [{ name: "BlockSlot Demo" }],
} satisfies ShopifyMeta;

export default function BlockSlotDemo() {
  return (
    <div className="page-width" style={{ padding: "4rem 0" }}>
      <BlockSlot />
    </div>
  );
}
