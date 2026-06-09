import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  {
    type: "inline_richtext",
    id: "heading",
    label: "Heading",
    default: "Talk about your brand",
  },
  {
    type: "select",
    id: "heading_size",
    label: "Heading size",
    default: "h1",
    options: [
      { value: "h2", label: "Small" },
      { value: "h1", label: "Medium" },
      { value: "h0", label: "Large" },
      { value: "hxl", label: "Extra large" },
      { value: "hxxl", label: "Extra extra large" },
    ],
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Heading (React)",
  settings,
} satisfies ShopifyMeta;

export default function HeadingBlock() {
  const [text] = useLiquid<string>("block.settings.heading");
  const [size] = useLiquid<string>("block.settings.heading_size");

  return <h2 className={`rich-text__heading ${size}`}>{text}</h2>;
}
