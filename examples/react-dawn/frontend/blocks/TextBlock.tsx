import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  {
    type: "richtext",
    id: "text",
    label: "Text",
    default:
      "<p>Share information about your brand with your customers. Describe a product, make announcements, or welcome customers to your store.</p>",
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Text (React)",
  type: "block",
  settings,
} satisfies ShopifyMeta;

export default function TextBlock() {
  const [text] = useLiquid<string>("block.settings.text");

  return <div className="rich-text__text rte">{text}</div>;
}
