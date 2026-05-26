import type { ShopifyMeta } from "vite-plugin-react-shopify";

export const shopifyMeta = {
  name: "Group (React)",
  blocks: [{ type: "@theme" }],
  settings: [
    {
      type: "select",
      id: "layout_direction",
      label: "Layout Direction",
      default: "group--vertical",
      options: [
        { value: "group--horizontal", label: "Horizontal" },
        { value: "group--vertical", label: "Vertical" },
      ],
    },
    {
      type: "select",
      id: "alignment",
      label: "Alignment",
      default: "flex-start",
      options: [
        { value: "flex-start", label: "Left" },
        { value: "center", label: "Center" },
        { value: "flex-end", label: "Right" },
      ],
    },
    {
      type: "range",
      id: "padding",
      label: "Padding",
      default: 0,
      min: 0,
      max: 200,
      step: 2,
      unit: "px",
    },
  ],
  presets: [
    {
      name: "Column (React)",
      category: "Layout",
      settings: {
        layout_direction: "group--vertical",
        alignment: "flex-start",
        padding: 0,
      },
    },
    {
      name: "Row (React)",
      category: "Layout",
      settings: {
        layout_direction: "group--horizontal",
        padding: 0,
      },
    },
  ],
} satisfies ShopifyMeta;

interface GroupBlockProps {
  layout_direction?: string;
  alignment?: string;
  padding?: number;
}

export default function GroupBlock({
  layout_direction = "group--vertical",
  alignment = "flex-start",
  padding = 0,
}: GroupBlockProps) {
  return (
    <div
      className={`group ${layout_direction}`}
      style={{
        padding:
          layout_direction === "group--horizontal"
            ? `0 ${padding}px`
            : `${padding}px 0`,
        ...(layout_direction === "group--vertical"
          ? { alignItems: alignment }
          : {}),
      }}
    />
  );
}
