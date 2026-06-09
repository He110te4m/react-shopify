import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Multimedia collage" },
  {
    type: "select", id: "heading_size",
    options: [
      { value: "h2", label: "Small" },
      { value: "h1", label: "Medium" },
      { value: "h0", label: "Large" },
      { value: "hxl", label: "Extra large" },
      { value: "hxxl", label: "Extra extra large" },
    ],
    default: "h1", label: "Heading size",
  },
  {
    type: "select", id: "desktop_layout",
    options: [
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
    ],
    default: "left", label: "Desktop layout",
  },
  {
    type: "select", id: "mobile_layout",
    options: [
      { value: "collage", label: "Collage" },
      { value: "column", label: "Column" },
    ],
    default: "column", label: "Mobile layout",
  },
  {
    type: "select", id: "card_styles",
    options: [
      { value: "none", label: "None" },
      { value: "product-card-wrapper", label: "Product card wrapper" },
    ],
    default: "product-card-wrapper", label: "Card styles",
  },
  { type: "color_scheme", id: "color_scheme", label: "Color scheme", default: "scheme-1" },
  { type: "header", content: "Section padding" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "Padding top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "Padding bottom", default: 36 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Collage (React)",
  tag: "section",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }, { type: "@app" }],
  max_blocks: 3,
  disabled_on: { groups: ["header", "footer"] },
  presets: [
    {
      name: "Collage (React)",
      blocks: [
        { type: "react-image-block" },
        { type: "react-image-block" },
        { type: "react-image-block" },
      ],
    },
  ],
} satisfies ShopifyMeta;

export default function Collage() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [heading] = useLiquid<string>("section.settings.heading");
  const [headingSize] = useLiquid<string>("section.settings.heading_size");
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [mobileLayout] = useLiquid<string>("section.settings.mobile_layout");

  useLiquidCode(`{{ 'collage.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-card.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-price.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-modal-video.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-deferred-media.css' | asset_url | stylesheet_tag }}`, []);

  return (
    <div className={`color-${colorScheme} gradient isolate`}>
      <div className="page-width" style={paddingStyle}>
        {heading && (
          <h2 className={clsx("collage-wrapper-title inline-richtext", headingSize, animClass)}>
            {heading}
          </h2>
        )}
        <div className={clsx("collage", { "collage--mobile": mobileLayout === "collage" })}>
          <BlockSlot />
        </div>
      </div>
    </div>
  );
}
