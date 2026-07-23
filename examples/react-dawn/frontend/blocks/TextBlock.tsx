import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { LiquidHtml, useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./TextBlock.css";

export default function TextBlock() {
  const [textStyle] = useLiquid<string>("block.settings.text_style");

  return (
    <LiquidHtml
      as="div"
      className={clsx("banner__text", "rte", textStyle)}
      expression="block.settings.text"
    />
  );
}

export const shopifyMeta = {
  name: "t:sections.image-banner.blocks.text.name",
  class: "banner__block banner__block--text",
  settings: [
    {
      type: "inline_richtext",
      id: "text",
      default: "t:sections.image-banner.blocks.text.settings.text.default",
      label: "t:sections.image-banner.blocks.text.settings.text.label",
    },
    {
      type: "select",
      id: "text_style",
      options: [
        {
          value: "body",
          label: "t:sections.image-banner.blocks.text.settings.text_style.options__1.label",
        },
        {
          value: "subtitle",
          label: "t:sections.image-banner.blocks.text.settings.text_style.options__2.label",
        },
        {
          value: "caption-with-letter-spacing",
          label: "t:sections.image-banner.blocks.text.settings.text_style.options__3.label",
        },
      ],
      default: "body",
      label: "t:sections.image-banner.blocks.text.settings.text_style.label",
    },
  ],
} satisfies ShopifyMeta;
