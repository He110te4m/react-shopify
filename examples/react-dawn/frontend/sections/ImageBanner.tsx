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
  const [image] = useLiquid<object>("section.settings.image");
  const [image2] = useLiquid<object>("section.settings.image_2");
  const [overlayOpacity] = useLiquid<number>("section.settings.image_overlay_opacity", { type: "number" });
  const [imageHeight] = useLiquid<string>("section.settings.image_height");
  const [imageBehavior] = useLiquid<string>("section.settings.image_behavior");
  const [contentPosition] = useLiquid<string>("section.settings.desktop_content_position");
  const [contentAlignment] = useLiquid<string>("section.settings.desktop_content_alignment");
  const [showTextBox] = useLiquid<boolean>("section.settings.show_text_box", { type: "boolean" });
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [stackOnMobile] = useLiquid<boolean>("section.settings.stack_images_on_mobile", { type: "boolean" });
  const [mobileContentAlign] = useLiquid<string>("section.settings.mobile_content_alignment");
  const [showTextBelow] = useLiquid<boolean>("section.settings.show_text_below", { type: "boolean" });
  const [sectionIndex] = useLiquid<number>("section.index", { type: "number" });

  const hasImage = image != null;
  const hasImage2 = image2 != null;
  const isAdapt = imageHeight === "adapt" && hasImage;
  const behavior = imageBehavior !== "none" ? imageBehavior : null;
  const fetchPriority = sectionIndex === 1 ? "high" : "auto";
  const stackImages = hasImage && hasImage2 && stackOnMobile;
  const showBox = showTextBox;

  useLiquidCode(
    `{%- style -%}
  #Banner-{{ section.id }}::after {
    opacity: {{ section.settings.image_overlay_opacity | divided_by: 100.0 }};
  }
{%- endstyle -%}`,
    ["section.settings.image_overlay_opacity"],
  );

    const bannerClasses = clsx(
      "banner",
      `banner--content-align-${contentAlignment}`,
      `banner--content-align-mobile-${mobileContentAlign}`,
      `banner--${imageHeight}`,
      {
        "banner--stacked": stackImages,
        "banner--adapt": isAdapt,
        "banner--mobile-bottom": showTextBelow,
        "banner--desktop-transparent": !showBox,
      },
      fadeClass,
    );

  return (
    <div id={`Banner-${sectionId}`} className={bannerClasses}>
      {hasImage && (
        <div
            className={clsx("banner__media media", {
              "banner__media-half": hasImage2,
              [`animate--${behavior}`]: behavior,
            }, fadeClass)}
        >
          <ShopifyImage
            image="section.settings.image"
            widths="375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840"
            sizes={hasImage2 ? "(min-width: 750px) 50vw, 100vw" : "100vw"}
            className={hasImage2 ? "banner__media-image-half" : undefined}
            fetchPriority={fetchPriority}
          />
        </div>
      )}

      {!hasImage && !hasImage2 && (
        <div className={clsx("banner__media media placeholder", { [`animate--${behavior}`]: behavior })}>
          {`{{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}`}
        </div>
      )}

      {hasImage2 && (
        <div
            className={clsx("banner__media media", {
              "banner__media-half": hasImage,
              [`animate--${behavior}`]: behavior,
            }, fadeClass)}
        >
          <ShopifyImage
            image="section.settings.image_2"
            widths="375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840"
            sizes={hasImage ? "(min-width: 750px) 50vw, 100vw" : "100vw"}
            className={hasImage ? "banner__media-image-half" : undefined}
            fetchPriority={fetchPriority}
          />
        </div>
      )}

      <div
        className={clsx(
          "banner__content",
          `banner__content--${contentPosition}`,
            "page-width",
            slideClass,
          )}
      >
        {showBox ? (
          <div className={`banner__box content-container content-container--full-width-mobile color-${colorScheme} gradient`}>
            <BlockSlot />
          </div>
        ) : (
          <BlockSlot />
        )}
      </div>
    </div>
  );
}
