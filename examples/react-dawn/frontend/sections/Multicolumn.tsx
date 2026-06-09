import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  { type: "inline_richtext", id: "title", label: "Title", default: "Multicolumn" },
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
    type: "select", id: "image_width",
    options: [
      { value: "third", label: "One third" },
      { value: "half", label: "Half" },
      { value: "full", label: "Full width" },
    ],
    default: "full", label: "Image width",
  },
  {
    type: "select", id: "image_ratio",
    options: [
      { value: "adapt", label: "Adapt to image" },
      { value: "portrait", label: "Portrait" },
      { value: "square", label: "Square" },
      { value: "circle", label: "Circle" },
    ],
    default: "adapt", label: "Image ratio",
  },
  { type: "text", id: "button_label", label: "Button label", default: "Button label" },
  { type: "url", id: "button_link", label: "Button link" },
  { type: "range", id: "columns_desktop", min: 1, max: 6, step: 1, default: 3, label: "Columns on desktop" },
  {
    type: "select", id: "column_alignment",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
    ],
    default: "left", label: "Column alignment",
  },
  {
    type: "select", id: "background_style",
    options: [
      { value: "none", label: "None" },
      { value: "primary", label: "Primary" },
    ],
    default: "primary", label: "Background style",
  },
  { type: "color_scheme", id: "color_scheme", label: "Color scheme", default: "scheme-1" },
  {
    type: "select", id: "columns_mobile",
    options: [
      { value: "1", label: "1 column" },
      { value: "2", label: "2 columns" },
    ],
    default: "1", label: "Columns on mobile",
  },
  { type: "checkbox", id: "swipe_on_mobile", label: "Swipe on mobile", default: false },
  { type: "header", content: "Section padding" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "Padding top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "Padding bottom", default: 36 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Multicolumn (React)",
  tag: "section",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }, { type: "@app" }],
  disabled_on: { groups: ["header", "footer"] },
  presets: [
    {
      name: "Multicolumn (React)",
      blocks: [
        { type: "react-column-block" },
        { type: "react-column-block" },
        { type: "react-column-block" },
      ],
    },
  ],
} satisfies ShopifyMeta;

export default function Multicolumn() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [sectionId] = useLiquid<string>("section.id");
  const [title] = useLiquid<string>("section.settings.title");
  const [headingSize] = useLiquid<string>("section.settings.heading_size");
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [backgroundStyle] = useLiquid<string>("section.settings.background_style");
  const [buttonLabel] = useLiquid<string>("section.settings.button_label");
  const [buttonLink] = useLiquid<string>("section.settings.button_link");
  const [columnsDesktop] = useLiquid<number>("section.settings.columns_desktop", { type: "number" });
  const [columnAlignment] = useLiquid<string>("section.settings.column_alignment");
  const [columnsMobile] = useLiquid<string>("section.settings.columns_mobile");
  const [swipeOnMobile] = useLiquid<boolean>("section.settings.swipe_on_mobile", { type: "boolean" });

  useLiquidCode(`{{ 'section-multicolumn.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-slider.css' | asset_url | stylesheet_tag }}`, []);

  return (
    <div
      className={clsx(
        "multicolumn",
        `color-${colorScheme}`,
        "gradient",
        { "background-none": backgroundStyle === "none", [`background-${backgroundStyle}`]: backgroundStyle !== "none", "no-heading": !title },
      )}
    >
      <div
        className={clsx("page-width", "isolate", animClass)}
        style={paddingStyle}
      >
        {title && (
          <div className="title-wrapper-with-link title-wrapper--self-padded-mobile title-wrapper--no-top-margin multicolumn__title">
            <h2 className={clsx("title inline-richtext", headingSize)}>{title}</h2>
            {buttonLabel && swipeOnMobile && (
              <a href={buttonLink || "#"} className="link underlined-link large-up-hide">
                {buttonLabel}
              </a>
            )}
          </div>
        )}

        <slider-component className="slider-mobile-gutter">
          <div
            className={clsx(
              "multicolumn-list",
              "contains-content-container",
              "grid",
              `grid--${columnsMobile}-col-tablet-down`,
              `grid--${columnsDesktop}-col-desktop`,
              { "slider slider--tablet grid--peek": swipeOnMobile },
            )}
            id={`Slider-${sectionId}`}
            role="list"
          >
            <BlockSlot />
          </div>

          {swipeOnMobile && (
            <div className="slider-buttons large-up-hide">
              <button type="button" className="slider-button slider-button--prev" name="previous" aria-label={`{{ 'general.slider.previous_slide' | t }}`}>
                <span className="svg-wrapper">{`{{ 'icon-caret.svg' | inline_asset_content }}`}</span>
              </button>
              <div className="slider-counter caption">
                <span className="slider-counter--current">1</span>
                <span aria-hidden="true"> / </span>
                <span className="visually-hidden">{`{{ 'general.slider.of' | t }}`}</span>
                <span className="slider-counter--total">{`{{ section.blocks.size }}`}</span>
              </div>
              <button type="button" className="slider-button slider-button--next" name="next" aria-label={`{{ 'general.slider.next_slide' | t }}`}>
                <span className="svg-wrapper">{`{{ 'icon-caret.svg' | inline_asset_content }}`}</span>
              </button>
            </div>
          )}
        </slider-component>

        {buttonLabel && (
          <div className={clsx("center", { "small-hide medium-hide": swipeOnMobile })}>
            <a
              href={buttonLink || "#"}
              className="button button--primary"
            >
              {buttonLabel}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
