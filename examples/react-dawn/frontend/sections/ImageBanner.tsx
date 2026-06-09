import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, ShopifyImage, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import "./ImageBanner.css";

const settings = [
  { type: "image_picker", id: "image", label: "t:sections.image-banner.settings.image.label" },
  { type: "image_picker", id: "image_2", label: "t:sections.image-banner.settings.image_2.label" },
  { type: "range", id: "image_overlay_opacity", min: 0, max: 100, step: 10, unit: "%", label: "t:sections.image-banner.settings.image_overlay_opacity.label", default: 0 },
  {
    type: "select", id: "image_height",
    options: [
      { value: "adapt", label: "t:sections.image-banner.settings.image_height.options__1.label" },
      { value: "small", label: "t:sections.image-banner.settings.image_height.options__2.label" },
      { value: "medium", label: "t:sections.image-banner.settings.image_height.options__3.label" },
      { value: "large", label: "t:sections.image-banner.settings.image_height.options__4.label" },
    ],
    default: "medium", label: "t:sections.image-banner.settings.image_height.label",
  },
  {
    type: "select", id: "image_behavior",
    options: [
      { value: "none", label: "t:sections.all.animation.image_behavior.options__1.label" },
      { value: "ambient", label: "t:sections.all.animation.image_behavior.options__2.label" },
      { value: "fixed", label: "t:sections.all.animation.image_behavior.options__3.label" },
      { value: "zoom-in", label: "t:sections.all.animation.image_behavior.options__4.label" },
    ],
    default: "none", label: "t:sections.all.animation.image_behavior.label",
  },
  { type: "header", content: "t:sections.image-banner.settings.content.content" },
  {
    type: "select", id: "desktop_content_position",
    options: [
      { value: "top-left", label: "t:sections.image-banner.settings.desktop_content_position.options__1.label" },
      { value: "top-center", label: "t:sections.image-banner.settings.desktop_content_position.options__2.label" },
      { value: "top-right", label: "t:sections.image-banner.settings.desktop_content_position.options__3.label" },
      { value: "middle-left", label: "t:sections.image-banner.settings.desktop_content_position.options__4.label" },
      { value: "middle-center", label: "t:sections.image-banner.settings.desktop_content_position.options__5.label" },
      { value: "middle-right", label: "t:sections.image-banner.settings.desktop_content_position.options__6.label" },
      { value: "bottom-left", label: "t:sections.image-banner.settings.desktop_content_position.options__7.label" },
      { value: "bottom-center", label: "t:sections.image-banner.settings.desktop_content_position.options__8.label" },
      { value: "bottom-right", label: "t:sections.image-banner.settings.desktop_content_position.options__9.label" },
    ],
    default: "middle-center", label: "t:sections.image-banner.settings.desktop_content_position.label",
  },
  {
    type: "select", id: "desktop_content_alignment",
    options: [
      { value: "left", label: "t:sections.image-banner.settings.desktop_content_alignment.options__1.label" },
      { value: "center", label: "t:sections.image-banner.settings.desktop_content_alignment.options__2.label" },
      { value: "right", label: "t:sections.image-banner.settings.desktop_content_alignment.options__3.label" },
    ],
    default: "center", label: "t:sections.image-banner.settings.desktop_content_alignment.label",
  },
  { type: "checkbox", id: "show_text_box", default: true, label: "t:sections.image-banner.settings.show_text_box.label" },
  { type: "color_scheme", id: "color_scheme", label: "t:sections.all.colors.label", default: "scheme-1" },
  { type: "header", content: "t:sections.image-banner.settings.mobile.content" },
  { type: "checkbox", id: "stack_images_on_mobile", default: true, label: "t:sections.image-banner.settings.stack_images_on_mobile.label" },
  {
    type: "select", id: "mobile_content_alignment",
    options: [
      { value: "left", label: "t:sections.image-banner.settings.mobile_content_alignment.options__1.label" },
      { value: "center", label: "t:sections.image-banner.settings.mobile_content_alignment.options__2.label" },
      { value: "right", label: "t:sections.image-banner.settings.mobile_content_alignment.options__3.label" },
    ],
    default: "center", label: "t:sections.image-banner.settings.mobile_content_alignment.label",
  },
  { type: "checkbox", id: "show_text_below", default: true, label: "t:sections.image-banner.settings.show_text_below.label" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Image Banner (React)",
  tag: "section",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }],
  disabled_on: { groups: ["header", "footer"] },
  presets: [{ name: "t:sections.image-banner.presets.name" }],
} satisfies ShopifyMeta;

export default function ImageBanner() {
  const [sectionId] = useLiquid<string>("section.id");
  const fadeClass = useAnimation("fade-in");
  const slideClass = useAnimation("slide-in");
  const [imageHeight] = useLiquid<string>("section.settings.image_height");
  const [imageBehavior] = useLiquid<string>("section.settings.image_behavior");
  const [contentPosition] = useLiquid<string>("section.settings.desktop_content_position");
  const [contentAlignment] = useLiquid<string>("section.settings.desktop_content_alignment");
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [mobileContentAlign] = useLiquid<string>("section.settings.mobile_content_alignment");
  const [sectionIndex] = useLiquid<number>("section.index", { type: "number" });

  const behavior = imageBehavior !== "none" ? imageBehavior : null;
  const fetchPriority = sectionIndex === 1 ? "high" : "auto";

  useLiquidCode(`{%- if section.settings.image_height == 'adapt' and section.settings.image != blank -%}{%- style -%}@media screen and (max-width: 749px) {#Banner-STARTID::before,#Banner-STARTID .banner__media::before,#Banner-STARTID:not(.banner--mobile-bottom) .banner__content::before {padding-bottom: {{ 1 | divided_by: section.settings.image.aspect_ratio | times: 100 }}%;content: '';display: block;}}@media screen and (min-width: 750px) {#Banner-STARTID::before,#Banner-STARTID .banner__media::before {padding-bottom: {{ 1 | divided_by: section.settings.image.aspect_ratio | times: 100 }}%;content: '';display: block;}}{%- endstyle -%}{%- endif -%}`.replace(/STARTID/g, "${section.id}"), ["section.settings.image_height", "section.settings.image"]);

  useLiquidCode(`{%- style -%}#Banner-STARTID::after {opacity: {{ section.settings.image_overlay_opacity | divided_by: 100.0 }};}{%- endstyle -%}`.replace(/STARTID/g, "${section.id}"), ["section.settings.image_overlay_opacity"]);

  return (
    <div
      id={`Banner-${sectionId}`}
      className={clsx(
        "banner",
        `banner--content-align-${contentAlignment}`,
        `banner--content-align-mobile-${mobileContentAlign}`,
        `banner--${imageHeight}`,
        fadeClass,
      )}
    >
      {`{%- liquid
  assign full_width = '100vw'
  assign widths = '375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840'
  if section.settings.image_behavior == 'ambient'
    assign full_width = '120vw'
    assign widths = '450, 660, 900, 1320, 1800, 2136, 2400, 3600, 7680'
  endif
  if section.settings.image != blank
    assign img_height = section.settings.image.width | divided_by: section.settings.image.aspect_ratio
  endif
-%}`}

      <div
        className={clsx("banner__media media", {
          [`animate--${behavior}`]: behavior,
        }, fadeClass)}
      >
        {`{%- if section.settings.image != blank -%}
          {{ section.settings.image | image_url: width: 3840 | image_tag: loading: 'eager', sizes: full_width, widths: widths, fetchpriority: 'high' }}
        {%- else -%}
          {{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}
        {%- endif -%}`}
      </div>

      {`{%- if section.settings.image_2 != blank -%}`}
        <div
          className={clsx("banner__media media", "banner__media-half", {
            [`animate--${behavior}`]: behavior,
          }, fadeClass)}
        >
          {`{{ section.settings.image_2 | image_url: width: 3840 | image_tag: loading: 'lazy', sizes: '(min-width: 750px) 50vw, 100vw', widths: widths, class: 'banner__media-image-half' }}`}
        </div>
      {`{%- endif -%}`}

      <div
        className={clsx(
          "banner__content",
          `banner__content--${contentPosition}`,
          "page-width",
          slideClass,
        )}
      >
        <div className={`banner__box content-container content-container--full-width-mobile color-${colorScheme} gradient`}>
          <BlockSlot />
        </div>
      </div>
    </div>
  );
}
