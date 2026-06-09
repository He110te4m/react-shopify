import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { ShopifyImage, useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "image_picker", id: "image", label: "Image" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Image (React)",
  settings,
} satisfies ShopifyMeta;

export default function ImageBlock() {
  const [image] = useLiquid<object>("block.settings.image");
  if (!image) return null;
  return (
    <ShopifyImage
      image="block.settings.image"
      widths="375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840"
      sizes="(min-width: 750px) 50vw, 100vw"
    />
  );
}
