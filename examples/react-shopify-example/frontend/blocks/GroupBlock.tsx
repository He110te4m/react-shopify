import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import "./GroupBlock.css";

const settings = [
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
  { type: "range", id: "padding", label: "Padding", default: 0, min: 0, max: 200, step: 2, unit: "px" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Group (React)",
  blocks: [{ type: "@theme" }],
  settings,
  presets: [
    { name: "Column (React)", category: "Layout", settings: { layout_direction: "group--vertical", alignment: "flex-start", padding: 0 } },
    { name: "Row (React)", category: "Layout", settings: { layout_direction: "group--horizontal", padding: 0 } },
  ],
} satisfies ShopifyMeta;

export default function GroupBlock() {
  const [padding] = useLiquid<string>("block.settings.padding");
  const [alignment] = useLiquid<string>("block.settings.alignment");

  return (
    <div className="ssg-group" style={{ padding: `${padding}px 0`, alignItems: alignment }} />
  );
}
