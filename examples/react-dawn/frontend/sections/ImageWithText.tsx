import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, ShopifyImage, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./ImageWithText.css";
import "../styles/shared.css";

const settings = [
  { type: "image_picker", id: "image", label: "Image" },
  {
    type: "select", id: "height",
    options: [
      { value: "adapt", label: "Adapt to image" },
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
    default: "adapt", label: "Section height",
  },
  {
    type: "select", id: "desktop_image_width",
    options: [
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
    ],
    default: "medium", label: "Desktop image width",
  },
  {
    type: "select", id: "layout",
    options: [
      { value: "image_first", label: "Image first" },
      { value: "text_first", label: "Text first" },
    ],
    default: "image_first", label: "Layout",
  },
  {
    type: "select", id: "image_behavior",
    options: [
      { value: "none", label: "None" },
      { value: "ambient", label: "Ambient" },
      { value: "zoom-in", label: "Zoom in" },
    ],
    default: "none", label: "Image behavior",
  },
  {
    type: "select", id: "content_layout",
    options: [
      { value: "no-overlap", label: "No overlap" },
      { value: "overlap", label: "Overlap" },
    ],
    default: "no-overlap", label: "Content layout",
  },
  {
    type: "select", id: "desktop_content_position",
    options: [
      { value: "top", label: "Top" },
      { value: "middle", label: "Middle" },
      { value: "bottom", label: "Bottom" },
    ],
    default: "top", label: "Desktop content position",
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
  { type: "color_scheme", id: "color_scheme", label: "Content container color scheme", default: "scheme-1" },
  { type: "header", content: "Section padding" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "Padding top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "Padding bottom", default: 36 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Image with Text (React)",
  tag: "section",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }, { type: "@app" }],
  disabled_on: { groups: ["header", "footer"] },
  presets: [
    {
      name: "Image with Text (React)",
      blocks: [
        { type: "react-heading-block" },
        { type: "react-text-block" },
        { type: "react-button-block" },
      ],
    },
  ],
} satisfies ShopifyMeta;

export default function ImageWithText() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [sectionId] = useLiquid<string>("section.id");
  const [sectionIndex] = useLiquid<number>("section.index", { type: "number" });
  const [image] = useLiquid<object>("section.settings.image");
  const [height] = useLiquid<string>("section.settings.height");
  const [desktopImageWidth] = useLiquid<string>("section.settings.desktop_image_width");
  const [layout] = useLiquid<string>("section.settings.layout");
  const [imageBehavior] = useLiquid<string>("section.settings.image_behavior");
  const [contentLayout] = useLiquid<string>("section.settings.content_layout");
  const [desktopContentPosition] = useLiquid<string>("section.settings.desktop_content_position");
  const [desktopContentAlignment] = useLiquid<string>("section.settings.desktop_content_alignment");
  const [mobileContentAlignment] = useLiquid<string>("section.settings.mobile_content_alignment");
  const [sectionColorScheme] = useLiquid<string>("section.settings.section_color_scheme");
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");

  const fetchPriority = sectionIndex === 1 ? "high" : "auto";
  const isReverse = layout === "text_first";
  const isOverlap = contentLayout === "overlap";
  const sameColor = sectionColorScheme === colorScheme;
  const removeColorClasses = sameColor && !isOverlap;
  const behavior = imageBehavior !== "none" ? imageBehavior : null;
  const gridClass = desktopImageWidth === "medium" ? "2-col-tablet" : "3-col-tablet";
  const hasImage = image != null;

  useLiquidCode(
    `{%- liquid
  if section.settings.height == 'adapt' and section.settings.image != blank
    assign image_aspect_ratio = section.settings.image.aspect_ratio | default: 1
    assign padding_bottom = 1 | divided_by: image_aspect_ratio | times: 100
  endif
-%}`,
    ["section.settings.height", "section.settings.image"],
  );

  useLiquidCode(
    `{{ 'component-image-with-text.css' | asset_url | stylesheet_tag }}`,
    [],
  );

  return (
    <div
      className={`color-${sectionColorScheme} gradient`}
      style={paddingStyle}
    >
      <div className="page-width">
        <div
          id={`ImageWithText--${sectionId}`}
          className={clsx(
            "image-with-text",
            `image-with-text--${contentLayout}`,
            "isolate",
            { "image-with-text--overlap": isOverlap },
            animClass,
          )}
        >
          <div className={clsx(
            "image-with-text__grid",
            "grid grid--gapless grid--1-col",
            `grid--${gridClass}`,
            { "image-with-text__grid--reverse": isReverse },
          )}>
            <div className={`image-with-text__media-item image-with-text__media-item--${desktopImageWidth} image-with-text__media-item--${desktopContentPosition} grid__item`}>
              <div
                className={clsx(
                  "image-with-text__media",
                  `image-with-text__media--${height}`,
                  "global-media-settings",
                  removeColorClasses ? "background-transparent" : `gradient color-${colorScheme}`,
                  { "media": hasImage, "image-with-text__media--placeholder placeholder": !hasImage },
                  behavior && `animate--${behavior}`,
                )}
              >
                {hasImage ? (
                  <ShopifyImage
                    image="section.settings.image"
                    widths="165, 360, 535, 750, 1070, 1500"
                    sizes="(min-width: 750px) calc((100vw - 130px) / 2), calc((100vw - 50px) / 2)"
                    fetchPriority={fetchPriority}
                  />
                ) : (
                  <>{`{{ 'detailed-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}`}</>
                )}
              </div>
            </div>

            <div className="image-with-text__text-item grid__item">
              <div
                className={clsx(
                  "image-with-text__content",
                  `image-with-text__content--${desktopContentPosition}`,
                  `image-with-text__content--desktop-${desktopContentAlignment}`,
                  `image-with-text__content--mobile-${mobileContentAlignment}`,
                  `image-with-text__content--${height}`,
                  "content-container",
                  removeColorClasses ? "background-transparent" : `gradient color-${colorScheme}`,
                )}
              >
                <BlockSlot />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
