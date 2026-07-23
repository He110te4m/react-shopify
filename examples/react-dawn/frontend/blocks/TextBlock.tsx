import type { ShopifyMeta } from "vite-plugin-react-shopify";
import {
  LiquidHtml,
  createInlineRichTextSetting,
  createSelectSetting,
  defineSettings,
} from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./TextBlock.css";

const textSettings = defineSettings("block", {
  text: createInlineRichTextSetting({
    default: "t:sections.image-banner.blocks.text.settings.text.default",
    label: "t:sections.image-banner.blocks.text.settings.text.label",
  }),
  text_style: createSelectSetting({
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
  }),
});

export default function TextBlock() {
  const { text_style: textStyle } = textSettings.useProps();
  return (
    <LiquidHtml
      as="div"
      className={clsx("banner__text", "rte", textStyle)}
      expression={textSettings.refs.text}
    />
  );
}

export const shopifyMeta = {
  name: "t:sections.image-banner.blocks.text.name",
  class: "banner__block banner__block--text",
  settings: textSettings.schema,
} satisfies ShopifyMeta;
