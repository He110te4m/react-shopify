import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import "./TextBlock.css";

const settings = [
  { type: "text", id: "text", label: "Text", default: "Text" },
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
  { type: "text_alignment", id: "alignment", label: "Alignment", default: "left" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Text (React)",
  settings,
  presets: [{ name: "Text (React)" }],
} satisfies ShopifyMeta;

export default function TextBlock() {
  const [text] = useLiquid<string>("block.settings.text");
  const [textStyle] = useLiquid<string>("block.settings.text_style");
  const [alignment] = useLiquid<string>("block.settings.alignment");

  return (
    <div
      className={`ssg-text ${textStyle ?? ""}`}
      style={{ "--ssg-text-align": alignment } as React.CSSProperties}
    >
      {text}
    </div>
  );
}
