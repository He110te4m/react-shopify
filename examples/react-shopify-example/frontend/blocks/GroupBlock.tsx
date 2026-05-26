import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useShopifySettings } from "vite-plugin-react-shopify/runtime/settings";
import "./GroupBlock.css";

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

const DIR_MAP: Record<string, string> = {
  "group--horizontal": "ssg-group--horizontal",
  "group--vertical": "ssg-group--vertical",
};

export default function GroupBlock() {
  const s = useShopifySettings();
  const layout_direction = (s.layout_direction as string) || "group--vertical";
  const alignment = (s.alignment as string) || "flex-start";
  const padding = Number(s.padding ?? 0);

  return (
    <div
      className={`ssg-group ${DIR_MAP[layout_direction] ?? ""}`}
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
