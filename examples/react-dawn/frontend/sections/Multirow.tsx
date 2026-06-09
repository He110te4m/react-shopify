import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  {
    type: "select", id: "image_height",
    options: [
      { value: "adapt", label: "Adapt to image" },
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
    default: "medium", label: "Image height",
  },
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
    type: "select", id: "text_style",
    options: [
      { value: "body", label: "Body" },
      { value: "subtitle", label: "Subtitle" },
    ],
    default: "body", label: "Text style",
  },
  {
    type: "select", id: "button_style",
    options: [
      { value: "primary", label: "Primary" },
      { value: "secondary", label: "Secondary" },
    ],
    default: "secondary", label: "Button style",
  },
  {
    type: "select", id: "desktop_content_position",
    options: [
      { value: "top", label: "Top" },
      { value: "middle", label: "Middle" },
      { value: "bottom", label: "Bottom" },
    ],
    default: "middle", label: "Desktop content position",
  },
  {
    type: "select", id: "desktop_content_alignment",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
    default: "left", label: "Desktop content alignment",
  },
  {
    type: "select", id: "mobile_content_alignment",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
    default: "left", label: "Mobile content alignment",
  },
  { type: "color_scheme", id: "section_color_scheme", label: "Section color scheme", default: "scheme-1" },
  { type: "color_scheme", id: "row_color_scheme", label: "Row color scheme", default: "scheme-1" },
  { type: "header", content: "Section padding" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "Padding top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "Padding bottom", default: 36 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Multirow (React)",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }, { type: "@app" }],
  disabled_on: { groups: ["header", "footer"] },
  presets: [
    {
      name: "Multirow (React)",
      blocks: [
        { type: "react-row-block" },
        { type: "react-row-block" },
        { type: "react-row-block" },
      ],
    },
  ],
} satisfies ShopifyMeta;

export default function Multirow() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [sectionColorScheme] = useLiquid<string>("section.settings.section_color_scheme");
  const [rowColorScheme] = useLiquid<string>("section.settings.row_color_scheme");
  const [imageHeight] = useLiquid<string>("section.settings.image_height");
  const [headingSize] = useLiquid<string>("section.settings.heading_size");
  const [textStyle] = useLiquid<string>("section.settings.text_style");
  const [buttonStyle] = useLiquid<string>("section.settings.button_style");
  const [desktopContentPosition] = useLiquid<string>("section.settings.desktop_content_position");
  const [desktopContentAlignment] = useLiquid<string>("section.settings.desktop_content_alignment");
  const [mobileContentAlignment] = useLiquid<string>("section.settings.mobile_content_alignment");

  const sameColor = sectionColorScheme === rowColorScheme;

  useLiquidCode(`{{ 'component-image-with-text.css' | asset_url | stylesheet_tag }}`, []);

  return (
    <div className={`multirow gradient color-${sectionColorScheme}`} style={paddingStyle}>
      <div className="multirow__inner page-width">
        <BlockSlot />
      </div>
    </div>
  );
}
