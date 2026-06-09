import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { ShopifyImage, useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "image_picker", id: "image", label: "Image" },
  { type: "text", id: "caption", label: "Caption", default: "Add a tagline" },
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Row heading" },
  { type: "richtext", id: "text", label: "Text", default: "<p>Pair text with an image to tell a story about your brand.</p>" },
  { type: "text", id: "button_label", label: "Button label", default: "Button label" },
  { type: "url", id: "button_link", label: "Button link" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Row (React)",
  settings,
} satisfies ShopifyMeta;

export default function RowBlock() {
  const [image] = useLiquid<object>("block.settings.image");
  const [caption] = useLiquid<string>("block.settings.caption");
  const [heading] = useLiquid<string>("block.settings.heading");
  const [text] = useLiquid<string>("block.settings.text");
  const [buttonLabel] = useLiquid<string>("block.settings.button_label");
  const [buttonLink] = useLiquid<string>("block.settings.button_link");

  return (
    <>
      {image != null && (
        <ShopifyImage
          image="block.settings.image"
          widths="165, 360, 535, 750, 1070, 1500"
          sizes="(min-width: 750px) calc((100vw - 130px) / 2), calc((100vw - 50px) / 2)"
        />
      )}
      {caption && (
        <p className="image-with-text__text image-with-text__text--caption caption-with-letter-spacing caption-with-letter-spacing--medium">
          {caption}
        </p>
      )}
      {heading && <h2 className="image-with-text__heading">{heading}</h2>}
      {text && <div className="image-with-text__text rte">{text}</div>}
      {buttonLabel && (
        <a
          href={buttonLink || "#"}
          className="button"
        >
          {buttonLabel}
        </a>
      )}
    </>
  );
}
