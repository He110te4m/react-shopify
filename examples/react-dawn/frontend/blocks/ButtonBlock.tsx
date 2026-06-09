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
    type: "select",
    id: "button_style",
    label: "Button style",
    default: "button--primary",
    options: [
      { value: "button--primary", label: "Primary" },
      { value: "button--secondary", label: "Secondary" },
    ],
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Button (React)",
  settings,
} satisfies ShopifyMeta;

export default function ButtonBlock() {
  const [label] = useLiquid<string>("block.settings.button_label");
  const [link] = useLiquid<string>("block.settings.button_link");
  const [style] = useLiquid<string>("block.settings.button_style");

  return (
    <a href={link || "#"} className={`button ${style}`}>
      {label}
    </a>
  );
}
