import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";

const settings = [
  { type: "text", id: "caption", label: "Caption", default: "Add a tagline" },
  {
    type: "select", id: "text_style",
    options: [
      { value: "subtitle", label: "Subtitle" },
      { value: "caption-with-letter-spacing", label: "Caption with letter spacing" },
    ],
    default: "caption-with-letter-spacing", label: "Text style",
  },
  {
    type: "select", id: "text_size",
    options: [
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
    default: "medium", label: "Text size",
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Caption (React)",
  settings,
} satisfies ShopifyMeta;

export default function CaptionBlock() {
  const [caption] = useLiquid<string>("block.settings.caption");
  const [textStyle] = useLiquid<string>("block.settings.text_style");
  const [textSize] = useLiquid<string>("block.settings.text_size");

  return (
    <p className={clsx("image-with-text__text", "image-with-text__text--caption", textStyle, `${textStyle}--${textSize}`, textStyle)}>
      {caption}
    </p>
  );
}
