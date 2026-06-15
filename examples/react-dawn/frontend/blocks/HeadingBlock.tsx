import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./HeadingBlock.css";

export default function HeadingBlock() {
  const [heading] = useLiquid<string>("block.settings.heading");
  const [headingSize] = useLiquid<string>("block.settings.heading_size");

  return <h2 className={clsx("banner__heading", "inline-richtext", headingSize)}>{heading}</h2>;
}

export const shopifyMeta = {
  name: "t:sections.image-banner.blocks.heading.name",
  class: "banner__block banner__block--heading",
  settings: [
    {
      type: "inline_richtext",
      id: "heading",
      default: "t:sections.image-banner.blocks.heading.settings.heading.default",
      label: "t:sections.image-banner.blocks.heading.settings.heading.label",
    },
    {
      type: "select",
      id: "heading_size",
      options: [
        {
          value: "h2",
          label: "t:sections.all.heading_size.options__1.label",
        },
        {
          value: "h1",
          label: "t:sections.all.heading_size.options__2.label",
        },
        {
          value: "h0",
          label: "t:sections.all.heading_size.options__3.label",
        },
        {
          value: "hxl",
          label: "t:sections.all.heading_size.options__4.label",
        },
        {
          value: "hxxl",
          label: "t:sections.all.heading_size.options__5.label",
        },
      ],
      default: "h1",
      label: "t:sections.all.heading_size.label",
    },
  ],
} satisfies ShopifyMeta;
