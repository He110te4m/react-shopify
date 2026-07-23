import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { LiquidIf, useLiquid, useShopifyContext } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./ButtonBlock.css";

function useLiquidChoice(key: string, condition: string, truthy: string, falsy: string): string {
  const ctx = useShopifyContext();
  if (ctx.phase === "ssg") {
    ctx.track(key, {
      bridge: `{% if ${condition} %}${JSON.stringify(truthy)}{% else %}${JSON.stringify(falsy)}{% endif %}`,
    });
    return ctx.serialize(`{% if ${condition} %}${truthy}{% else %}${falsy}{% endif %}`);
  }
  return String(ctx.read(key) ?? falsy);
}

function ButtonLink({ index }: { index: 1 | 2 }) {
  const [label] = useLiquid<string>(`block.settings.button_label_${index} | escape`);
  const [link] = useLiquid<string>(`block.settings.button_link_${index}`);
  const buttonStyle = useLiquidChoice(
    `react_button_block_style_${index}`,
    `block.settings.button_style_secondary_${index}`,
    "button--secondary",
    "button--primary",
  );

  return (
    <LiquidIf condition={`block.settings.button_label_${index} != blank`}>
      <LiquidIf condition={`block.settings.button_link_${index} == blank`}>
        <a role="link" aria-disabled="true" className={clsx("button", buttonStyle)}>
          {label}
        </a>
      </LiquidIf>
      <LiquidIf condition={`block.settings.button_link_${index} != blank`}>
        <a href={link} className={clsx("button", buttonStyle)}>
          {label}
        </a>
      </LiquidIf>
    </LiquidIf>
  );
}

export default function ButtonBlock() {
  const multipleClass = useLiquidChoice(
    "react_button_block_multiple",
    "block.settings.button_label_1 != blank and block.settings.button_label_2 != blank",
    "banner__buttons--multiple",
    "",
  );

  return (
    <div className={clsx("banner__buttons", multipleClass)}>
      <ButtonLink index={1} />
      <ButtonLink index={2} />
    </div>
  );
}

export const shopifyMeta = {
  name: "t:sections.image-banner.blocks.buttons.name",
  class: "banner__block banner__block--buttons",
  settings: [
    {
      type: "header",
      content: "t:sections.image-banner.blocks.buttons.settings.header_1.content",
    },
    {
      type: "text",
      id: "button_label_1",
      default: "t:sections.image-banner.blocks.buttons.settings.button_label_1.default",
      label: "t:sections.image-banner.blocks.buttons.settings.button_label_1.label",
      info: "t:sections.image-banner.blocks.buttons.settings.button_label_1.info",
    },
    {
      type: "url",
      id: "button_link_1",
      label: "t:sections.image-banner.blocks.buttons.settings.button_link_1.label",
    },
    {
      type: "checkbox",
      id: "button_style_secondary_1",
      default: false,
      label: "t:sections.image-banner.blocks.buttons.settings.button_style_secondary_1.label",
    },
    {
      type: "header",
      content: "t:sections.image-banner.blocks.buttons.settings.header_2.content",
    },
    {
      type: "text",
      id: "button_label_2",
      default: "t:sections.image-banner.blocks.buttons.settings.button_label_2.default",
      label: "t:sections.image-banner.blocks.buttons.settings.button_label_2.label",
      info: "t:sections.image-banner.blocks.buttons.settings.button_label_2.info",
    },
    {
      type: "url",
      id: "button_link_2",
      label: "t:sections.image-banner.blocks.buttons.settings.button_link_2.label",
    },
    {
      type: "checkbox",
      id: "button_style_secondary_2",
      default: false,
      label: "t:sections.image-banner.blocks.buttons.settings.button_style_secondary_2.label",
    },
  ],
} satisfies ShopifyMeta;
