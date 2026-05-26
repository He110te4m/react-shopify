import type { ShopifyMeta, SchemaSetting } from "vite-plugin-react-shopify";

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
] satisfies SchemaSetting[];

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

export default function TextBlock({
  text = "Text",
  text_style = "text--title",
  alignment = "left",
}: TextBlockProps) {
  return (
    <div
      className={`text ${text_style}`}
      style={{ textAlign: alignment as React.CSSProperties["textAlign"] }}
    >
      {text}
    </div>
  );
}
