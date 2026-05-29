import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useBlockSettings } from "vite-plugin-react-shopify/runtime";
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
  const { value: text } = useBlockSettings("text");
  const { value: textStyle } = useBlockSettings("text_style");
  const { value: alignment } = useBlockSettings("alignment");

  return (
    <div
      className={`ssg-text ${textStyle ?? ""}`}
      style={{ "--ssg-text-align": alignment } as React.CSSProperties}
    >
      {text}
    </div>
  );
}
