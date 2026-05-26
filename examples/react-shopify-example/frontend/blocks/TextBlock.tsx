import type { ShopifyMeta, SettingSchema, InferSettings } from "vite-plugin-react-shopify";
import { useShopifySettings } from "vite-plugin-react-shopify/runtime/settings";
import "./TextBlock.css";

const settings = [
  {
    type: "text",
    id: "text",
    label: "Text",
    default: "Text",
  },
  {
    type: "select",
    id: "text_style",
    label: "Text Style",
    options: [
      { value: "ssg-text--title", label: "Title" },
      { value: "ssg-text--subtitle", label: "Subtitle" },
      { value: "", label: "Normal" },
    ],
    default: "ssg-text--title",
  },
  {
    type: "text_alignment",
    id: "alignment",
    label: "Alignment",
    default: "left",
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Text (React)",
  settings,
  presets: [{ name: "Text (React)" }],
} satisfies ShopifyMeta;

export default function TextBlock() {
  const s = useShopifySettings<InferSettings<typeof settings>>();
  const text = s.text || "Text";
  const text_style = s.text_style || "ssg-text--title";
  const alignment = s.alignment || "left";

  return (
    <div
      className={`ssg-text ${text_style}`}
      style={{ "--ssg-text-align": alignment } as React.CSSProperties}
    >
      {text}
    </div>
  );
}
