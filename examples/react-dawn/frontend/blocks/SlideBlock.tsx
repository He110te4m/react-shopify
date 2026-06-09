import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { ShopifyImage, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";

const settings = [
  { type: "image_picker", id: "image", label: "Image" },
  { type: "range", id: "image_overlay_opacity", min: 0, max: 100, step: 10, unit: "%", label: "Image overlay opacity", default: 0 },
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Slide heading" },
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
  { type: "inline_richtext", id: "subheading", label: "Subheading", default: "Tell your brand's story through images" },
  { type: "text", id: "button_label", label: "Button label", default: "Shop all" },
  { type: "url", id: "link", label: "Link" },
  { type: "checkbox", id: "button_style_secondary", label: "Use secondary button style", default: false },
  { type: "checkbox", id: "show_text_box", label: "Show text box", default: true },
  {
    type: "select", id: "box_align",
    options: [
      { value: "top-left", label: "Top left" },
      { value: "top-center", label: "Top center" },
      { value: "top-right", label: "Top right" },
      { value: "middle-left", label: "Middle left" },
      { value: "middle-center", label: "Middle center" },
      { value: "middle-right", label: "Middle right" },
      { value: "bottom-left", label: "Bottom left" },
      { value: "bottom-center", label: "Bottom center" },
      { value: "bottom-right", label: "Bottom right" },
    ],
    default: "middle-center", label: "Box alignment",
  },
  {
    type: "select", id: "text_alignment",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
    default: "center", label: "Text alignment",
  },
  {
    type: "select", id: "text_alignment_mobile",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
    default: "center", label: "Mobile text alignment",
  },
  { type: "color_scheme", id: "color_scheme", label: "Color scheme", default: "scheme-1" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Slide (React)",
  settings,
} satisfies ShopifyMeta;

export default function SlideBlock() {
  const [blockId] = useLiquid<string>("block.id");
  const [image] = useLiquid<object>("block.settings.image");
  const [overlayOpacity] = useLiquid<number>("block.settings.image_overlay_opacity", { type: "number" });
  const [heading] = useLiquid<string>("block.settings.heading");
  const [headingSize] = useLiquid<string>("block.settings.heading_size");
  const [subheading] = useLiquid<string>("block.settings.subheading");
  const [buttonLabel] = useLiquid<string>("block.settings.button_label");
  const [link] = useLiquid<string>("block.settings.link");
  const [buttonSecondary] = useLiquid<boolean>("block.settings.button_style_secondary", { type: "boolean" });
  const [showTextBox] = useLiquid<boolean>("block.settings.show_text_box", { type: "boolean" });
  const [boxAlign] = useLiquid<string>("block.settings.box_align");
  const [textAlignment] = useLiquid<string>("block.settings.text_alignment");
  const [textAlignmentMobile] = useLiquid<string>("block.settings.text_alignment_mobile");
  const [colorScheme] = useLiquid<string>("block.settings.color_scheme");

  useLiquidCode(
    `{%- style -%}
  #Slide-{{ block.id }}::after {
    opacity: {{ block.settings.image_overlay_opacity | divided_by: 100.0 }};
  }
{%- endstyle -%}`,
    ["block.settings.image_overlay_opacity"],
  );

  const hasImage = image != null;
  const buttonStyle = buttonSecondary ? "button--secondary" : "button--primary";

  return (
    <div
      id={`Slide-${blockId}`}
      className={clsx("slideshow__slide", "grid__item", "grid--1-item", {
        "slideshow__slide--no-image": !hasImage,
      })}
    >
      {hasImage && (
        <div className="slideshow__media banner__media media">
          <ShopifyImage
            image="block.settings.image"
            widths="375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840"
            sizes="100vw"
          />
        </div>
      )}

      <div
        className={clsx(
          "slideshow__text-wrapper",
          `banner__content--${boxAlign}`,
          "page-width",
        )}
      >
        <div
          className={clsx("slideshow__text", `banner__box content-container--full-width-mobile color-${colorScheme} gradient`, {
            [`slideshow__text--${textAlignment}`]: true,
            [`slideshow__text-mobile--${textAlignmentMobile}`]: true,
          })}
        >
          {showTextBox ? (
            <>
              {heading && <h2 className={clsx("banner__heading", headingSize)}>{heading}</h2>}
              {subheading && <div className="banner__text">{subheading}</div>}
              {buttonLabel && (
                <div className="banner__buttons">
                  <a href={link || "#"} className={clsx("button", buttonStyle)}>{buttonLabel}</a>
                </div>
              )}
            </>
          ) : (
            <>
              {heading && <h2 className={clsx("banner__heading", headingSize)}>{heading}</h2>}
              {subheading && <div className="banner__text">{subheading}</div>}
              {buttonLabel && (
                <div className="banner__buttons">
                  <a href={link || "#"} className={clsx("button", buttonStyle)}>{buttonLabel}</a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
