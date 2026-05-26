import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import styles from "./TextBlock.module.css";

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

interface TextBlockProps {
  text?: string;
  text_style?: string;
  alignment?: string;
}

const STYLE_MAP: Record<string, string> = {
  "text--title": styles["ssg-text--title"],
  "text--subtitle": styles["ssg-text--subtitle"],
  "text--normal": styles["ssg-text--normal"],
};

export default function TextBlock({
  text = "Text",
  text_style = "text--title",
  alignment = "left",
}: TextBlockProps) {
  return (
    <div
      className={`${styles["ssg-text"]} ${STYLE_MAP[text_style] ?? ""}`}
      style={{ "--ssg-text-align": alignment } as React.CSSProperties}
    >
      {text}
    </div>
  );
}
