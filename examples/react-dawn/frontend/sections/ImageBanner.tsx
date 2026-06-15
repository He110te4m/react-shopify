import type { ShopifyMeta } from "vite-plugin-react-shopify";
import {
  BlockSlot,
  Island,
  LiquidIf,
  ShopifyImage,
  liquid,
  liquidChoice,
  liquidIf,
  useLiquid,
  useLiquidClass,
  useLiquidCssVars,
  useLiquidDynamicClass,
} from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./ImageBanner.css";

const defaultWidths = "375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840";
const ambientWidths = "450, 660, 900, 1320, 1800, 2136, 2400, 3600, 7680";

function PlaceholderMedia() {
  return (
    <Island
      as="span"
      expression="{{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}"
      style={{ display: "contents" }}
    />
  );
}

function ImageBannerMedia() {
  const imageBehaviorClass = useLiquidDynamicClass(
    "section.settings.image_behavior != 'none'",
    "section.settings.image_behavior",
    (value: string) => `animate--${value}`,
  );

  const firstMediaClassName = clsx(
    "banner__media media",
    useLiquidClass("section.settings.image_2 != blank", "banner__media-half"),
    imageBehaviorClass,
    useLiquidClass("settings.animations_reveal_on_scroll", "scroll-trigger animate--fade-in"),
  );

  const placeholderMediaClassName = clsx(
    "banner__media media placeholder",
    imageBehaviorClass,
    useLiquidClass("settings.animations_reveal_on_scroll", "scroll-trigger animate--fade-in"),
  );

  const secondMediaClassName = clsx(
    "banner__media media",
    useLiquidClass("section.settings.image != blank", "banner__media-half"),
    imageBehaviorClass,
    useLiquidClass("settings.animations_reveal_on_scroll", "scroll-trigger animate--fade-in"),
  );

  return (
    <>
      <LiquidIf condition="section.settings.image != blank">
        <div className={firstMediaClassName}>
          <ShopifyImage
            image="section.settings.image"
            width={3840}
            tagWidth={liquid("section.settings.image.width")}
            tagHeight={liquid("section.settings.image.width | divided_by: section.settings.image.aspect_ratio")}
            imageClass={liquidIf("section.settings.image_2 != blank", "banner__media-image-half")}
            sizes={liquidChoice(
              [
                ["section.settings.image_behavior == 'ambient'", "120vw"],
                ["section.settings.image_2 != blank and section.settings.stack_images_on_mobile", "(min-width: 750px) 50vw, 100vw"],
                ["section.settings.image_2 != blank", "50vw"],
              ],
              "100vw",
            )}
            widths={liquidChoice([["section.settings.image_behavior == 'ambient'", ambientWidths]], defaultWidths)}
            fetchPriority={liquidChoice([["section.index == 1", "high"]], "auto")}
            autoLoading={false}
          />
        </div>
      </LiquidIf>

      <LiquidIf condition="section.settings.image == blank and section.settings.image_2 == blank">
        <div className={placeholderMediaClassName}>
          <PlaceholderMedia />
        </div>
      </LiquidIf>

      <LiquidIf condition="section.settings.image_2 != blank">
        <div className={secondMediaClassName}>
          <ShopifyImage
            image="section.settings.image_2"
            width={3840}
            tagWidth={liquid("section.settings.image_2.width")}
            tagHeight={liquid("section.settings.image_2.width | divided_by: section.settings.image_2.aspect_ratio")}
            imageClass={liquidIf("section.settings.image != blank", "banner__media-image-half")}
            sizes={liquidChoice(
              [
                ["section.settings.image_behavior == 'ambient'", "120vw"],
                ["section.settings.image != blank and section.settings.stack_images_on_mobile", "(min-width: 750px) 50vw, 100vw"],
                ["section.settings.image_2 != blank", "50vw"],
              ],
              "100vw",
            )}
            widths={liquidChoice([["section.settings.image_behavior == 'ambient'", ambientWidths]], defaultWidths)}
            fetchPriority={liquidChoice([["section.index == 1", "high"]], "auto")}
            autoLoading={false}
          />
        </div>
      </LiquidIf>
    </>
  );
}

export default function ImageBanner() {
  const [sectionId] = useLiquid<string>("section.id");
  const [imageHeight] = useLiquid<string>("section.settings.image_height");
  const [desktopContentAlignment] = useLiquid<string>(
    "section.settings.desktop_content_alignment",
  );
  const [mobileContentAlignment] = useLiquid<string>(
    "section.settings.mobile_content_alignment",
  );
  const [desktopContentPosition] = useLiquid<string>(
    "section.settings.desktop_content_position",
  );
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const style = useLiquidCssVars({
    "--banner-adapt-padding-bottom": {
      liquid: "1 | divided_by: section.settings.image.aspect_ratio | times: 100 | append: '%'",
      when: "section.settings.image_height == 'adapt' and section.settings.image != blank",
      fallback: "0%",
    },
    "--banner-overlay-opacity": {
      liquid: "section.settings.image_overlay_opacity | divided_by: 100.0",
      fallback: "0",
    },
  });
  const bannerClassName = clsx(
    "banner",
    `banner--content-align-${desktopContentAlignment}`,
    `banner--content-align-mobile-${mobileContentAlignment}`,
    `banner--${imageHeight}`,
    useLiquidClass(
      "section.settings.stack_images_on_mobile and section.settings.image != blank and section.settings.image_2 != blank",
      "banner--stacked",
    ),
    useLiquidClass(
      "section.settings.image_height == 'adapt' and section.settings.image != blank",
      "banner--adapt",
    ),
    useLiquidClass("section.settings.show_text_below", "banner--mobile-bottom"),
    useLiquidClass("section.settings.show_text_box", "banner--desktop-transparent", { unless: true }),
    useLiquidClass("settings.animations_reveal_on_scroll", "scroll-trigger animate--fade-in"),
  );

  const contentClassName = clsx(
    "banner__content",
    `banner__content--${desktopContentPosition}`,
    "page-width",
    useLiquidClass("settings.animations_reveal_on_scroll", "scroll-trigger animate--slide-in"),
  );

  return (
    <div id={`Banner-${sectionId}`} className={bannerClassName} style={style}>
      <ImageBannerMedia />
      <div className={contentClassName}>
        <div
          className={clsx(
            "banner__box",
            "content-container",
            "content-container--full-width-mobile",
            `color-${colorScheme}`,
            "gradient",
          )}
        >
          <BlockSlot />
        </div>
      </div>
    </div>
  );
}

export const shopifyMeta = {
  name: "t:sections.image-banner.name",
  tag: "section",
  class: "section",
  disabled_on: {
    groups: ["header", "footer"],
  },
  settings: [
    {
      type: "image_picker",
      id: "image",
      label: "t:sections.image-banner.settings.image.label",
    },
    {
      type: "image_picker",
      id: "image_2",
      label: "t:sections.image-banner.settings.image_2.label",
    },
    {
      type: "range",
      id: "image_overlay_opacity",
      min: 0,
      max: 100,
      step: 10,
      unit: "%",
      label: "t:sections.image-banner.settings.image_overlay_opacity.label",
      default: 0,
    },
    {
      type: "select",
      id: "image_height",
      options: [
        {
          value: "adapt",
          label: "t:sections.image-banner.settings.image_height.options__1.label",
        },
        {
          value: "small",
          label: "t:sections.image-banner.settings.image_height.options__2.label",
        },
        {
          value: "medium",
          label: "t:sections.image-banner.settings.image_height.options__3.label",
        },
        {
          value: "large",
          label: "t:sections.image-banner.settings.image_height.options__4.label",
        },
      ],
      default: "medium",
      label: "t:sections.image-banner.settings.image_height.label",
    },
    {
      type: "select",
      id: "image_behavior",
      options: [
        {
          value: "none",
          label: "t:sections.all.animation.image_behavior.options__1.label",
        },
        {
          value: "ambient",
          label: "t:sections.all.animation.image_behavior.options__2.label",
        },
        {
          value: "fixed",
          label: "t:sections.all.animation.image_behavior.options__3.label",
        },
        {
          value: "zoom-in",
          label: "t:sections.all.animation.image_behavior.options__4.label",
        },
      ],
      default: "none",
      label: "t:sections.all.animation.image_behavior.label",
    },
    {
      type: "header",
      content: "t:sections.image-banner.settings.content.content",
    },
    {
      type: "select",
      id: "desktop_content_position",
      options: [
        {
          value: "top-left",
          label: "t:sections.image-banner.settings.desktop_content_position.options__1.label",
        },
        {
          value: "top-center",
          label: "t:sections.image-banner.settings.desktop_content_position.options__2.label",
        },
        {
          value: "top-right",
          label: "t:sections.image-banner.settings.desktop_content_position.options__3.label",
        },
        {
          value: "middle-left",
          label: "t:sections.image-banner.settings.desktop_content_position.options__4.label",
        },
        {
          value: "middle-center",
          label: "t:sections.image-banner.settings.desktop_content_position.options__5.label",
        },
        {
          value: "middle-right",
          label: "t:sections.image-banner.settings.desktop_content_position.options__6.label",
        },
        {
          value: "bottom-left",
          label: "t:sections.image-banner.settings.desktop_content_position.options__7.label",
        },
        {
          value: "bottom-center",
          label: "t:sections.image-banner.settings.desktop_content_position.options__8.label",
        },
        {
          value: "bottom-right",
          label: "t:sections.image-banner.settings.desktop_content_position.options__9.label",
        },
      ],
      default: "middle-center",
      label: "t:sections.image-banner.settings.desktop_content_position.label",
    },
    {
      type: "select",
      id: "desktop_content_alignment",
      options: [
        {
          value: "left",
          label: "t:sections.image-banner.settings.desktop_content_alignment.options__1.label",
        },
        {
          value: "center",
          label: "t:sections.image-banner.settings.desktop_content_alignment.options__2.label",
        },
        {
          value: "right",
          label: "t:sections.image-banner.settings.desktop_content_alignment.options__3.label",
        },
      ],
      default: "center",
      label: "t:sections.image-banner.settings.desktop_content_alignment.label",
    },
    {
      type: "checkbox",
      id: "show_text_box",
      default: true,
      label: "t:sections.image-banner.settings.show_text_box.label",
    },
    {
      type: "color_scheme",
      id: "color_scheme",
      label: "t:sections.all.colors.label",
      default: "scheme-1",
    },
    {
      type: "header",
      content: "t:sections.image-banner.settings.mobile.content",
    },
    {
      type: "checkbox",
      id: "stack_images_on_mobile",
      default: true,
      label: "t:sections.image-banner.settings.stack_images_on_mobile.label",
    },
    {
      type: "select",
      id: "mobile_content_alignment",
      options: [
        {
          value: "left",
          label: "t:sections.image-banner.settings.mobile_content_alignment.options__1.label",
        },
        {
          value: "center",
          label: "t:sections.image-banner.settings.mobile_content_alignment.options__2.label",
        },
        {
          value: "right",
          label: "t:sections.image-banner.settings.mobile_content_alignment.options__3.label",
        },
      ],
      default: "center",
      label: "t:sections.image-banner.settings.mobile_content_alignment.label",
    },
    {
      type: "checkbox",
      id: "show_text_below",
      default: true,
      label: "t:sections.image-banner.settings.show_text_below.label",
    },
  ],
  blocks: [{ type: "@theme" }, { type: "@app" }],
  presets: [
    {
      name: "t:sections.image-banner.presets.name",
      blocks: [
        {
          type: "react-heading-block",
        },
        {
          type: "react-text-block",
        },
        {
          type: "react-button-block",
        },
      ],
    },
  ],
} satisfies ShopifyMeta;
