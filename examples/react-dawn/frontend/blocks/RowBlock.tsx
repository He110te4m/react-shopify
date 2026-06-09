import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";

const settings = [
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Row heading" },
  { type: "richtext", id: "text", label: "Text", default: "<p>Row text content.</p>" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Row (React)",
  settings,
} satisfies ShopifyMeta;

export default function RowBlock() {
  const [heading] = useLiquid<string>("block.settings.heading");
  const [text] = useLiquid<string>("block.settings.text");

  return (
    <div className="row-block">
      {heading && <h3 className={clsx("row-block__heading", "inline-richtext")}>{heading}</h3>}
      {text && <div className="rte">{text}</div>}
    </div>
  );
}
