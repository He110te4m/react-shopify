import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "../styles/shared.css";

const settings = [
  {
    type: "select",
    id: "desktop_content_position",
    options: [
      { value: "left", label: "t:sections.rich-text.settings.desktop_content_position.options__1.label" },
      { value: "center", label: "t:sections.rich-text.settings.desktop_content_position.options__2.label" },
      { value: "right", label: "t:sections.rich-text.settings.desktop_content_position.options__3.label" },
    ],
    default: "center",
    label: "t:sections.rich-text.settings.desktop_content_position.label",
  },
  {
    type: "select",
    id: "content_alignment",
    options: [
      { value: "left", label: "t:sections.rich-text.settings.content_alignment.options__1.label" },
      { value: "center", label: "t:sections.rich-text.settings.content_alignment.options__2.label" },
      { value: "right", label: "t:sections.rich-text.settings.content_alignment.options__3.label" },
    ],
    default: "center",
    label: "t:sections.rich-text.settings.content_alignment.label",
  },
  {
    type: "color_scheme",
    id: "color_scheme",
    label: "t:sections.all.colors.label",
    default: "scheme-1",
  },
  {
    type: "checkbox",
    id: "full_width",
    default: true,
    label: "t:sections.rich-text.settings.full_width.label",
  },
  {
    type: "header",
    content: "t:sections.all.padding.section_padding_heading",
  },
  {
    type: "range",
    id: "padding_top",
    min: 0,
    max: 100,
    step: 4,
    unit: "px",
    label: "t:sections.all.padding.padding_top",
    default: 40,
  },
  {
    type: "range",
    id: "padding_bottom",
    min: 0,
    max: 100,
    step: 4,
    unit: "px",
    label: "t:sections.all.padding.padding_bottom",
    default: 52,
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "t:sections.rich-text.name",
  tag: "section",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }],
  disabled_on: {
    groups: ["header", "footer"],
  },
  presets: [{ name: "t:sections.rich-text.presets.name", category: "Text" }],
} satisfies ShopifyMeta;

export default function RichText() {
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [fullWidth] = useLiquid<boolean>("section.settings.full_width", { type: "boolean" });
  const [contentPosition] = useLiquid<string>("section.settings.desktop_content_position");
  const [contentAlignment] = useLiquid<string>("section.settings.content_alignment");

  useLiquidCode(`{{ 'section-rich-text.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(
    `{%- style -%}
  .section-{{ section.id }}-padding {
    padding-top: {{ section.settings.padding_top | times: 0.75 | round: 0 }}px;
    padding-bottom: {{ section.settings.padding_bottom | times: 0.75 | round: 0 }}px;
  }

  @media screen and (min-width: 750px) {
    .section-{{ section.id }}-padding {
      padding-top: {{ section.settings.padding_top }}px;
      padding-bottom: {{ section.settings.padding_bottom }}px;
    }
  }
{%- endstyle -%}`,
    ["section.settings.padding_top", "section.settings.padding_bottom"],
  );

  return (
    <div className={clsx("isolate", !fullWidth && "page-width")}>
      <div
        className={clsx(
          "rich-text",
          "content-container",
          `color-${colorScheme}`,
          `section-{{ section.id }}-padding`,
          "gradient",
          {
            "rich-text--full-width content-container--full-width": fullWidth,
          },
        )}
      >
        <div
          className={clsx(
            "rich-text__wrapper",
            `rich-text__wrapper--${contentPosition}`,
            fullWidth && "page-width",
          )}
        >
          <div className={`rich-text__blocks ${contentAlignment}`}>
            <BlockSlot />
          </div>
        </div>
      </div>
    </div>
  );
}
