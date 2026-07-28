import type { ShopifyEntryConfig, ShopifyMeta } from "vite-plugin-react-shopify";
import {
  BlockSlot,
  LiquidHtml,
  ShopifyImage,
  and,
  append,
  createCheckboxSetting,
  createColorSchemeSetting,
  createHeaderSetting,
  createImagePickerSetting,
  createRangeSetting,
  createSelectSetting,
  defineSettings,
  dividedBy,
  eq,
  isBlank,
  isPresent,
  liquidChoice,
  liquidIf,
  multiply,
  neq,
  or,
  placeholderSvg,
  property,
  sectionValue,
  themeSetting,
  useLiquidClass,
  useLiquidCssVars,
  useLiquidDynamicClass,
  useShopifyValue,
  when,
  type ShopifyReference,
} from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./ImageBanner.css";

const defaultWidths = "375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840";
const ambientWidths = "450, 660, 900, 1320, 1800, 2136, 2400, 3600, 7680";

const imageBannerSettings = defineSettings("section", {
  image: createImagePickerSetting({ label: "t:sections.image-banner.settings.image.label" }),
  image_2: createImagePickerSetting({ label: "t:sections.image-banner.settings.image_2.label" }),
  image_overlay_opacity: createRangeSetting({
    min: 0,
    max: 100,
    step: 10,
    unit: "%",
    label: "t:sections.image-banner.settings.image_overlay_opacity.label",
    default: 0,
  }),
  image_height: createSelectSetting({
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
  }),
  image_behavior: createSelectSetting({
    options: [
      { value: "none", label: "t:sections.all.animation.image_behavior.options__1.label" },
      {
        value: "ambient",
        label: "t:sections.all.animation.image_behavior.options__2.label",
      },
      { value: "fixed", label: "t:sections.all.animation.image_behavior.options__3.label" },
      { value: "zoom-in", label: "t:sections.all.animation.image_behavior.options__4.label" },
    ],
    default: "none",
    label: "t:sections.all.animation.image_behavior.label",
  }),
  content_header: createHeaderSetting({
    content: "t:sections.image-banner.settings.content.content",
  }),
  desktop_content_position: createSelectSetting({
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
  }),
  desktop_content_alignment: createSelectSetting({
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
  }),
  show_text_box: createCheckboxSetting({
    default: true,
    label: "t:sections.image-banner.settings.show_text_box.label",
  }),
  color_scheme: createColorSchemeSetting({
    label: "t:sections.all.colors.label",
    default: "scheme-1",
  }),
  mobile_header: createHeaderSetting({
    content: "t:sections.image-banner.settings.mobile.content",
  }),
  stack_images_on_mobile: createCheckboxSetting({
    default: true,
    label: "t:sections.image-banner.settings.stack_images_on_mobile.label",
  }),
  mobile_content_alignment: createSelectSetting({
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
  }),
  show_text_below: createCheckboxSetting({
    default: true,
    label: "t:sections.image-banner.settings.show_text_below.label",
  }),
});

const { refs } = imageBannerSettings;
const animationsReveal = themeSetting<boolean>("animations_reveal_on_scroll");
const currentSectionIndex = sectionValue<number>("index");

export const shopifyEntry = { runtime: "static" } satisfies ShopifyEntryConfig;

function imageSizes(otherImage: ShopifyReference<unknown, "object">) {
  const ambient = eq(refs.image_behavior, "ambient");
  const otherPresent = isPresent(otherImage);
  return liquidChoice(
    [
      [and(ambient, otherPresent, refs.stack_images_on_mobile), "(min-width: 750px) 60vw, 120vw"],
      [and(ambient, otherPresent), "60vw"],
      [ambient, "120vw"],
      [or(eq(refs.image_behavior, "fixed"), eq(refs.image_behavior, "zoom-in")), "100vw"],
      [and(otherPresent, refs.stack_images_on_mobile), "(min-width: 750px) 50vw, 100vw"],
      [otherPresent, "50vw"],
    ],
    "100vw",
  );
}

function PlaceholderMedia() {
  return (
    <LiquidHtml
      as="span"
      expression={placeholderSvg("hero-apparel-1", "placeholder-svg")}
      style={{ display: "contents" }}
    />
  );
}

function ImageBannerMedia() {
  const imageBehaviorClass = useLiquidDynamicClass(
    neq(refs.image_behavior, "none"),
    refs.image_behavior,
    (value: string) => `animate--${value}`,
  );

  const firstMediaClassName = clsx(
    "banner__media media",
    "banner__media--first",
    useLiquidClass(isPresent(refs.image_2), "banner__media-half"),
    imageBehaviorClass,
    useLiquidClass(animationsReveal, "scroll-trigger animate--fade-in"),
  );

  const placeholderMediaClassName = clsx(
    "banner__media media placeholder",
    "banner__media--placeholder",
    imageBehaviorClass,
    useLiquidClass(animationsReveal, "scroll-trigger animate--fade-in"),
  );

  const secondMediaClassName = clsx(
    "banner__media media",
    "banner__media--second",
    useLiquidClass(isPresent(refs.image), "banner__media-half"),
    imageBehaviorClass,
    useLiquidClass(animationsReveal, "scroll-trigger animate--fade-in"),
  );

  const firstWidth = property<number>(refs.image, "width");
  const firstRatio = property<number>(refs.image, "aspect_ratio");
  const secondWidth = property<number>(refs.image_2, "width");
  const secondRatio = property<number>(refs.image_2, "aspect_ratio");

  return (
    <>
      {when(isPresent(refs.image), () => (
        <div className={firstMediaClassName}>
          <ShopifyImage
            image={refs.image}
            width={3840}
            tagWidth={firstWidth}
            tagHeight={dividedBy(firstWidth, firstRatio)}
            imageClass={liquidIf(isPresent(refs.image_2), "banner__media-image-half")}
            sizes={imageSizes(refs.image_2)}
            widths={liquidChoice(
              [[eq(refs.image_behavior, "ambient"), ambientWidths]],
              defaultWidths,
            )}
            fetchPriority={liquidChoice([[eq(currentSectionIndex, 1), "high"]], "auto")}
            autoLoading={false}
          />
        </div>
      ))}

      {when(and(isBlank(refs.image), isBlank(refs.image_2)), () => (
        <div className={placeholderMediaClassName}>
          <PlaceholderMedia />
        </div>
      ))}

      {when(isPresent(refs.image_2), () => (
        <div className={secondMediaClassName}>
          <ShopifyImage
            image={refs.image_2}
            width={3840}
            tagWidth={secondWidth}
            tagHeight={dividedBy(secondWidth, secondRatio)}
            imageClass={liquidIf(isPresent(refs.image), "banner__media-image-half")}
            sizes={imageSizes(refs.image)}
            widths={liquidChoice(
              [[eq(refs.image_behavior, "ambient"), ambientWidths]],
              defaultWidths,
            )}
            fetchPriority={liquidChoice([[eq(currentSectionIndex, 1), "high"]], "auto")}
            autoLoading={false}
          />
        </div>
      ))}
    </>
  );
}

export default function ImageBanner() {
  const sectionId = useShopifyValue(sectionValue<string>("id"));
  const {
    image_height: imageHeight,
    desktop_content_alignment: desktopContentAlignment,
    mobile_content_alignment: mobileContentAlignment,
    desktop_content_position: desktopContentPosition,
    color_scheme: colorScheme,
  } = imageBannerSettings.useProps();
  const adaptPadding = append(
    multiply(dividedBy(1, property<number>(refs.image, "aspect_ratio")), 100),
    "%",
  );
  const style = useLiquidCssVars({
    "--banner-adapt-padding-bottom": {
      value: adaptPadding,
      when: and(eq(refs.image_height, "adapt"), isPresent(refs.image)),
      fallback: "0%",
    },
    "--banner-overlay-opacity": {
      value: dividedBy(refs.image_overlay_opacity, 100, { divisorFormat: "float" }),
      fallback: "0",
    },
  });
  const bannerClassName = clsx(
    "banner",
    `banner--content-align-${desktopContentAlignment}`,
    `banner--content-align-mobile-${mobileContentAlignment}`,
    `banner--${imageHeight}`,
    useLiquidClass(
      and(refs.stack_images_on_mobile, isPresent(refs.image), isPresent(refs.image_2)),
      "banner--stacked",
    ),
    useLiquidClass(and(eq(refs.image_height, "adapt"), isPresent(refs.image)), "banner--adapt"),
    useLiquidClass(refs.show_text_below, "banner--mobile-bottom"),
    useLiquidClass(refs.show_text_box, "banner--desktop-transparent", { unless: true }),
    useLiquidClass(animationsReveal, "scroll-trigger animate--fade-in"),
  );

  const contentClassName = clsx(
    "banner__content",
    `banner__content--${desktopContentPosition}`,
    "page-width",
    useLiquidClass(animationsReveal, "scroll-trigger animate--slide-in"),
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
          <BlockSlot className="banner__blocks" />
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
  settings: imageBannerSettings.schema,
  blocks: [{ type: "@theme" }, { type: "@app" }],
  presets: [
    {
      name: "t:sections.image-banner.presets.name",
      blocks: [
        { type: "react-heading-block" },
        { type: "react-text-block" },
        { type: "react-button-block" },
      ],
    },
  ],
} satisfies ShopifyMeta;
