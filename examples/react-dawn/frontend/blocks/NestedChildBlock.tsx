import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  {
    type: "text",
    id: "title",
    label: "Title",
    default: "Nested Child",
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Nested Child (React)",
  type: "block",
  settings,
} satisfies ShopifyMeta;

export default function NestedChildBlock() {
  const [title] = useLiquid<string>("block.settings.title");

  return (
    <div style={{ padding: "1rem", border: "1px dashed #ccc", margin: "0.5rem 0" }}>
      <p>Child: {title}</p>
    </div>
  );
}
