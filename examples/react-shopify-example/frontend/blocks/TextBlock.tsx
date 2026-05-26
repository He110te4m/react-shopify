import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
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
      { value: "text--title", label: "Title" },
      { value: "text--subtitle", label: "Subtitle" },
      { value: "text--normal", label: "Normal" },
    ],
    default: "text--title",
  },
  {
    type: "text_alignment",
    id: "alignment",
    label: "Alignment",
    default: "left",
  },
] satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Text (React)",
  settings,
  presets: [{ name: "Text (React)" }],
} satisfies ShopifyMeta;

const STYLE_MAP: Record<string, string> = {
  "text--title": "ssg-text--title",
  "text--subtitle": "ssg-text--subtitle",
};

export default function TextBlock() {
  const s = useShopifySettings();
  const text = (s.text as string) || "Text";
  const alignment = (s.alignment as string) || "left";

  return (
    <div
      className={`ssg-text`}
      style={{ "--ssg-text-align": alignment } as React.CSSProperties}
    >
      {text}
    </div>
  );
}
