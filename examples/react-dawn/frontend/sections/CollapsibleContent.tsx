import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { ShopifyImage, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  { type: "text", id: "caption", label: "Caption" },
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Collapsible content" },
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
    type: "select", id: "heading_alignment",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ],
    default: "center", label: "Heading alignment",
  },
  {
    type: "select", id: "layout",
    options: [
      { value: "none", label: "None" },
      { value: "row", label: "Row" },
      { value: "section", label: "Section" },
    ],
    default: "none", label: "Layout",
  },
  { type: "color_scheme", id: "container_color_scheme", label: "Container color scheme", default: "scheme-2" },
  { type: "color_scheme", id: "color_scheme", label: "Section color scheme", default: "scheme-1" },
  { type: "checkbox", id: "open_first_collapsible_row", label: "Open first row by default", default: false },
  { type: "image_picker", id: "image", label: "Image" },
  {
    type: "select", id: "image_ratio",
    options: [
      { value: "adapt", label: "Adapt to image" },
      { value: "small", label: "Small" },
      { value: "large", label: "Large" },
    ],
    default: "adapt", label: "Image ratio",
  },
  {
    type: "select", id: "desktop_layout",
    options: [
      { value: "image_first", label: "Image first" },
      { value: "image_second", label: "Image second" },
    ],
    default: "image_second", label: "Desktop layout",
  },
  { type: "header", content: "Section padding" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "Padding top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "Padding bottom", default: 36 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Collapsible Content (R)",
  tag: "section",
  class: "section",
  settings,
  disabled_on: { groups: ["header", "footer"] },
  presets: [
    {
      name: "Collapsible Content (React)",
      blocks: [],
    },
  ],
} satisfies ShopifyMeta;

export default function CollapsibleContent() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [sectionId] = useLiquid<string>("section.id");
  const [caption] = useLiquid<string>("section.settings.caption");
  const [heading] = useLiquid<string>("section.settings.heading");
  const [headingSize] = useLiquid<string>("section.settings.heading_size");
  const [headingAlignment] = useLiquid<string>("section.settings.heading_alignment");
  const [layout] = useLiquid<string>("section.settings.layout");
  const [containerColorScheme] = useLiquid<string>("section.settings.container_color_scheme");
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [openFirst] = useLiquid<boolean>("section.settings.open_first_collapsible_row", { type: "boolean" });
  const [image] = useLiquid<object>("section.settings.image");
  const [imageRatio] = useLiquid<string>("section.settings.image_ratio");
  const [desktopLayout] = useLiquid<string>("section.settings.desktop_layout");

  const hasImage = image != null;
  const isReverse = desktopLayout === "image_second";
  const isSectionLayout = layout === "section";
  const isNoneLayout = layout === "none";

  useLiquidCode(`{{ 'component-accordion.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'collapsible-content.css' | asset_url | stylesheet_tag }}`, []);

  return (
    <div className={`color-${colorScheme} gradient`}>
      <div className={clsx(
        "collapsible-content",
        `collapsible-${layout}-layout`,
        "isolate",
        { "page-width": isSectionLayout, "content-container content-container--full-width": isNoneLayout },
      )}>
        <div
          className={clsx("collapsible-content__wrapper", {
            [`content-container color-${containerColorScheme} gradient`]: isSectionLayout,
          })}
          style={paddingStyle}
        >
          <div className={hasImage ? "page-width" : "collapsible-content-wrapper-narrow"}>
            <div className={clsx("collapsible-content__header", animClass)} style={{ textAlign: headingAlignment as React.CSSProperties["textAlign"] }}>
              {caption && <p className="caption-with-letter-spacing">{caption}</p>}
              {heading ? (
                <h2 className={clsx("collapsible-content__heading inline-richtext", headingSize)}>{heading}</h2>
              ) : (
                <h2 className="visually-hidden">{`{{ 'accessibility.collapsible_content_title' | t }}`}</h2>
              )}
            </div>

            <div className={clsx(
              "grid grid--1-col grid--2-col-tablet",
              "collapsible-content__grid",
              { "collapsible-content__grid--reverse": isReverse },
              animClass,
            )}>
              {hasImage && (
                <div className="grid__item collapsible-content__grid-item">
                  <div className={`collapsible-content__media collapsible-content__media--${imageRatio} media global-media-settings gradient`}>
                    <ShopifyImage
                      image="section.settings.image"
                      widths="50, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000, 3200"
                      sizes="(min-width: 750px) calc((100vw - 100px) / 2), calc(100vw - 30px)"
                    />
                  </div>
                </div>
              )}

              <div className="grid__item">
                {`{%- for block in section.blocks -%}
                  <div class="accordion{% if section.settings.layout == 'row' %} content-container color-{{ section.settings.container_color_scheme }} gradient{% endif %}" {{ block.shopify_attributes }}>
                    <details id="Details-{{ block.id }}-{{ section.id }}"{% if section.settings.open_first_collapsible_row and forloop.first %} open{% endif %}>
                      <summary id="Summary-{{ block.id }}-{{ section.id }}">
                        {% render 'icon-accordion', icon: block.settings.icon %}
                        <h3 class="accordion__title inline-richtext h4">
                          {{ block.settings.heading | default: block.settings.page.title | escape }}
                        </h3>
                        {{- 'icon-caret.svg' | inline_asset_content -}}
                      </summary>
                      <div class="accordion__content rte" id="CollapsibleAccordion-{{ block.id }}-{{ section.id }}" role="region" aria-labelledby="Summary-{{ block.id }}-{{ section.id }}">
                        {{ block.settings.row_content }}
                        {{ block.settings.page.content }}
                      </div>
                    </details>
                  </div>
                {%- endfor -%}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
