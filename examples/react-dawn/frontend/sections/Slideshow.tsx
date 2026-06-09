import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";

const settings = [
  {
    type: "select", id: "layout",
    options: [
      { value: "full_bleed", label: "Full bleed" },
      { value: "grid", label: "Grid" },
    ],
    default: "full_bleed", label: "Layout",
  },
  {
    type: "select", id: "slide_height",
    options: [
      { value: "adapt_image", label: "Adapt to first image" },
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
    default: "medium", label: "Slide height",
  },
  {
    type: "select", id: "slider_visual",
    options: [
      { value: "dots", label: "Dots" },
      { value: "counter", label: "Counter" },
      { value: "numbers", label: "Numbers" },
    ],
    default: "counter", label: "Slider visual",
  },
  { type: "checkbox", id: "auto_rotate", label: "Auto-rotate slides", default: false },
  { type: "range", id: "change_slides_speed", min: 3, max: 9, step: 2, unit: "s", label: "Change slides speed", default: 5 },
  {
    type: "select", id: "image_behavior",
    options: [
      { value: "none", label: "None" },
      { value: "ambient", label: "Ambient" },
    ],
    default: "none", label: "Image behavior",
  },
  { type: "checkbox", id: "show_text_below", label: "Show text below on mobile", default: true },
  { type: "text", id: "accessibility_info", label: "Accessibility info", default: "Slideshow about our brand" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Slideshow (React)",
  tag: "section",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }, { type: "@app" }],
  disabled_on: { groups: ["header", "footer"] },
  presets: [
    {
      name: "Slideshow (React)",
      blocks: [{ type: "react-slide-block" }, { type: "react-slide-block" }],
    },
  ],
} satisfies ShopifyMeta;

export default function Slideshow() {
  const [sectionId] = useLiquid<string>("section.id");
  const [layout] = useLiquid<string>("section.settings.layout");
  const [slideHeight] = useLiquid<string>("section.settings.slide_height");
  const [autoRotate] = useLiquid<boolean>("section.settings.auto_rotate", { type: "boolean" });
  const [changeSlidesSpeed] = useLiquid<number>("section.settings.change_slides_speed", { type: "number" });
  const [imageBehavior] = useLiquid<string>("section.settings.image_behavior");
  const [showTextBelow] = useLiquid<boolean>("section.settings.show_text_below", { type: "boolean" });
  const [accessibilityInfo] = useLiquid<string>("section.settings.accessibility_info");

  useLiquidCode(`{{ 'section-image-banner.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-slider.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-slideshow.css' | asset_url | stylesheet_tag }}`, []);

  useLiquidCode(
    `{%- if section.settings.slide_height == 'adapt_image' and section.blocks.first.settings.image != blank -%}
  {%- style -%}
    @media screen and (max-width: 749px) {
      #Slider-{{ section.id }}::before,
      #Slider-{{ section.id }} .media::before,
      #Slider-{{ section.id }}:not(.banner--mobile-bottom) .banner__content::before {
        padding-bottom: {{ 1 | divided_by: section.blocks.first.settings.image.aspect_ratio | times: 100 }}%;
        content: '';
        display: block;
      }
    }
    @media screen and (min-width: 750px) {
      #Slider-{{ section.id }}::before,
      #Slider-{{ section.id }} .media::before {
        padding-bottom: {{ 1 | divided_by: section.blocks.first.settings.image.aspect_ratio | times: 100 }}%;
        content: '';
        display: block;
      }
    }
  {%- endstyle -%}
{%- endif -%}`,
    ["section.settings.slide_height"],
  );

  const isGrid = layout === "grid";
  const behavior = imageBehavior !== "none" ? imageBehavior : null;

  return (
    <>
      <div
        className={clsx("slider-mobile-gutter", "slideshow", { "page-width": isGrid, "mobile-text-below": showTextBelow })}
        role="region"
        aria-roledescription={`{{ 'sections.slideshow.carousel' | t }}`}
        aria-label={accessibilityInfo}
      >
        {autoRotate && (
          <div className={clsx("slideshow__controls slideshow__controls--top slider-buttons", { "slideshow__controls--border-radius-mobile": showTextBelow })}>
            <button type="button" className="slider-button slider-button--prev" name="previous" aria-label={`{{ 'sections.slideshow.previous_slideshow' | t }}`} aria-controls={`Slider-${sectionId}`}>
              <span className="svg-wrapper">{`{{- 'icon-caret.svg' | inline_asset_content -}}`}</span>
            </button>
            <div className="slider-counter slider-counter--dots caption">
              <div className="slideshow__control-wrapper">
                {`{%- for block in section.blocks -%}
                  <button class="slider-counter__link slider-counter__link--dots link" aria-label="{{ 'sections.slideshow.load_slide' | t }} {{ forloop.index }} {{ 'general.slider.of' | t }} {{ forloop.length }}" aria-controls="Slider-{{ section.id }}">
                    <span class="dot"></span>
                  </button>
                {%- endfor -%}`}
              </div>
            </div>
            <button type="button" className="slider-button slider-button--next" name="next" aria-label={`{{ 'sections.slideshow.next_slideshow' | t }}`} aria-controls={`Slider-${sectionId}`}>
              <span className="svg-wrapper">{`{{- 'icon-caret.svg' | inline_asset_content -}}`}</span>
            </button>
            {autoRotate && (
              <button type="button" className="slideshow__autoplay slider-button" aria-label={`{{ 'sections.slideshow.pause_slideshow' | t }}`}>
                <span className="svg-wrapper">{`{{- 'icon-pause.svg' | inline_asset_content -}}`}</span>
                <span className="svg-wrapper">{`{{- 'icon-play.svg' | inline_asset_content -}}`}</span>
              </button>
            )}
          </div>
        )}

        <div
          className={clsx(
            "slideshow",
            "banner",
            `banner--${slideHeight}`,
            "grid grid--1-col slider slider--everywhere",
            { "banner--mobile-bottom": showTextBelow },
          )}
          id={`Slider-${sectionId}`}
          aria-live="polite"
          aria-atomic="true"
          data-autoplay={autoRotate ? "true" : "false"}
          data-speed={changeSlidesSpeed}
        >
          <BlockSlot />
        </div>

        {!autoRotate && (
          <div className={clsx("slideshow__controls slider-buttons", { "slideshow__controls--border-radius-mobile": showTextBelow })}>
            <button type="button" className="slider-button slider-button--prev" name="previous" aria-label={`{{ 'sections.slideshow.previous_slideshow' | t }}`} aria-controls={`Slider-${sectionId}`}>
              <span className="svg-wrapper">{`{{- 'icon-caret.svg' | inline_asset_content -}}`}</span>
            </button>
            <div className="slider-counter slider-counter--dots caption">
              <div className="slideshow__control-wrapper">
                {`{%- for block in section.blocks -%}
                  <button class="slider-counter__link slider-counter__link--dots link" aria-label="{{ 'sections.slideshow.load_slide' | t }} {{ forloop.index }} {{ 'general.slider.of' | t }} {{ forloop.length }}" aria-controls="Slider-{{ section.id }}">
                    <span class="dot"></span>
                  </button>
                {%- endfor -%}`}
              </div>
            </div>
            <button type="button" className="slider-button slider-button--next" name="next" aria-label={`{{ 'sections.slideshow.next_slideshow' | t }}`} aria-controls={`Slider-${sectionId}`}>
              <span className="svg-wrapper">{`{{- 'icon-caret.svg' | inline_asset_content -}}`}</span>
            </button>
          </div>
        )}
      </div>
      {`{%- if request.design_mode -%}
        <script src="{{ 'theme-editor.js' | asset_url }}" defer="defer"></script>
      {%- endif -%}`}
    </>
  );
}
