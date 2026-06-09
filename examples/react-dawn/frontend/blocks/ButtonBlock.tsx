import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  {
    type: "text",
    id: "button_label",
    label: "Button label",
    default: "Button label",
  },
  {
    type: "url",
    id: "button_link",
    label: "Button link",
  },
  {
    type: "checkbox",
    id: "button_style_secondary",
    label: "Use secondary button style",
    default: false,
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Button (React)",
  settings,
} satisfies ShopifyMeta;

export default function ButtonBlock() {
  const [label] = useLiquid<string>("block.settings.button_label");
  const [link] = useLiquid<string>("block.settings.button_link");
  const [secondary] = useLiquid<boolean>("block.settings.button_style_secondary", { type: "boolean" });

  return (
    <a href={link || "#"} className={secondary ? "button button--secondary" : "button button--primary"}>
      {label}
    </a>
  );
}
