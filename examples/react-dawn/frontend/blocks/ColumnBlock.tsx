import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { ShopifyImage, useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "image_picker", id: "image", label: "Image" },
  { type: "inline_richtext", id: "title", label: "Title", default: "Column" },
  { type: "richtext", id: "text", label: "Text", default: "<p>Pair text with an image to focus on your chosen product, collection, or blog post.</p>" },
  { type: "text", id: "link_label", label: "Link label" },
  { type: "url", id: "link", label: "Link" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Column (React)",
  settings,
} satisfies ShopifyMeta;

export default function ColumnBlock() {
  const [image] = useLiquid<object>("block.settings.image");
  const [title] = useLiquid<string>("block.settings.title");
  const [text] = useLiquid<string>("block.settings.text");
  const [linkLabel] = useLiquid<string>("block.settings.link_label");
  const [link] = useLiquid<string>("block.settings.link");

  return (
    <div className="multicolumn-card content-container">
      {image != null && (
        <div className="multicolumn-card__image-wrapper multicolumn-card__image-wrapper--full-width">
          <div className="media media--transparent media--square">
            <ShopifyImage
              image="block.settings.image"
              widths="275, 550, 710"
              sizes="(min-width: 990px) 550px, (min-width: 750px) 550px, calc(100vw - 30px)"
            />
          </div>
        </div>
      )}
      <div className="multicolumn-card__info">
        {title && <h3 className="inline-richtext">{title}</h3>}
        {text && <div className="rte">{text}</div>}
        {linkLabel && (
          <a href={link || "#"} className="link animate-arrow">
            {linkLabel}
            <span className="icon-wrap">&nbsp;{`{{- 'icon-arrow.svg' | inline_asset -}}`}</span>
          </a>
        )}
      </div>
    </div>
  );
}
