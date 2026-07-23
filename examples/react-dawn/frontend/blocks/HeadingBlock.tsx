import type { ShopifyMeta } from "vite-plugin-react-shopify";
import {
  LiquidHtml,
  createInlineRichTextSetting,
  createSelectSetting,
  defineSettings,
} from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./HeadingBlock.css";

const headingSettings = defineSettings("block", {
  heading: createInlineRichTextSetting({
    default: "t:sections.image-banner.blocks.heading.settings.heading.default",
    label: "t:sections.image-banner.blocks.heading.settings.heading.label",
  }),
  heading_size: createSelectSetting({
    options: [
      { value: "h2", label: "t:sections.all.heading_size.options__1.label" },
      { value: "h1", label: "t:sections.all.heading_size.options__2.label" },
      { value: "h0", label: "t:sections.all.heading_size.options__3.label" },
      { value: "hxl", label: "t:sections.all.heading_size.options__4.label" },
      { value: "hxxl", label: "t:sections.all.heading_size.options__5.label" },
    ],
    default: "h1",
    label: "t:sections.all.heading_size.label",
  }),
});

export default function HeadingBlock() {
  const { heading_size: headingSize } = headingSettings.useProps();
  return (
    <LiquidHtml
      as="h2"
      className={clsx("banner__heading", "inline-richtext", headingSize)}
      expression={headingSettings.refs.heading}
    />
  );
}

export const shopifyMeta = {
  name: "t:sections.image-banner.blocks.heading.name",
  class: "banner__block banner__block--heading",
  settings: headingSettings.schema,
} satisfies ShopifyMeta;
