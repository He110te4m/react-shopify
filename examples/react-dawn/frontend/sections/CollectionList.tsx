import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./CollectionList.css";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  { type: "inline_richtext", id: "title", default: "t:sections.collection-list.settings.title.default", label: "t:sections.collection-list.settings.title.label" },
  {
    type: "select", id: "heading_size",
    options: [
      { value: "h2", label: "t:sections.all.heading_size.options__1.label" },
      { value: "h1", label: "t:sections.all.heading_size.options__2.label" },
      { value: "h0", label: "t:sections.all.heading_size.options__3.label" },
      { value: "hxl", label: "t:sections.all.heading_size.options__4.label" },
      { value: "hxxl", label: "t:sections.all.heading_size.options__5.label" },
    ],
    default: "h1", label: "t:sections.all.heading_size.label",
  },
  { type: "header", content: "t:sections.collection-list.settings.header_layout.content" },
  {
    type: "select", id: "image_ratio",
    options: [
      { value: "adapt", label: "t:sections.collection-list.settings.image_ratio.options__1.label" },
      { value: "portrait", label: "t:sections.collection-list.settings.image_ratio.options__2.label" },
      { value: "square", label: "t:sections.collection-list.settings.image_ratio.options__3.label" },
    ],
    default: "square", label: "t:sections.collection-list.settings.image_ratio.label",
  },
  { type: "range", id: "columns_desktop", min: 1, max: 6, step: 1, default: 3, label: "t:sections.collection-list.settings.columns_desktop.label" },
  { type: "color_scheme", id: "color_scheme", label: "t:sections.all.colors.label", info: "t:sections.all.colors.has_cards_info", default: "scheme-1" },
  { type: "checkbox", id: "show_view_all", default: false, label: "t:sections.collection-list.settings.show_view_all.label", info: "t:sections.collection-list.settings.show_view_all.info" },
  { type: "header", content: "t:sections.collection-list.settings.header_mobile.content" },
  {
    type: "select", id: "columns_mobile",
    options: [
      { value: "1", label: "t:sections.collection-list.settings.columns_mobile.options__1.label" },
      { value: "2", label: "t:sections.collection-list.settings.columns_mobile.options__2.label" },
    ],
    default: "1", label: "t:sections.collection-list.settings.columns_mobile.label",
  },
  { type: "checkbox", id: "swipe_on_mobile", default: false, label: "t:sections.collection-list.settings.swipe_on_mobile.label" },
  { type: "header", content: "t:sections.all.padding.section_padding_heading" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "t:sections.all.padding.padding_top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "t:sections.all.padding.padding_bottom", default: 36 },
] as const satisfies SettingSchema[];

const blockSettings = [
  { type: "collection", id: "collection", label: "t:sections.collection-list.blocks.featured_collection.settings.collection.label" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Collection List (React)",
  tag: "section",
  class: "section section-collection-list",
  settings,
  blocks: [{ type: "featured_collection", name: "t:sections.collection-list.blocks.featured_collection.name", settings: blockSettings }],
  max_blocks: 15,
  disabled_on: { groups: ["header", "footer"] },
  presets: [{ name: "t:sections.collection-list.presets.name" }],
} satisfies ShopifyMeta;

export default function CollectionList() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [title] = useLiquid<string>("section.settings.title");
  const [headingSize] = useLiquid<string>("section.settings.heading_size");
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [imageRatio] = useLiquid<string>("section.settings.image_ratio");
  const [columnsDesktop] = useLiquid<number>("section.settings.columns_desktop", { type: "number" });
  const [columnsMobile] = useLiquid<string>("section.settings.columns_mobile");
  const [swipeOnMobile] = useLiquid<boolean>("section.settings.swipe_on_mobile", { type: "boolean" });
  const [showViewAll] = useLiquid<boolean>("section.settings.show_view_all", { type: "boolean" });
  const [sectionId] = useLiquid<string>("section.id");

  const columnsMobileInt = parseInt(columnsMobile) || 1;

  useLiquidCode(
    `{%- if section.settings.show_view_all -%}
      {{ 'component-card.css' | asset_url | stylesheet_tag }}
    {%- endif -%}
    {{ 'component-slider.css' | asset_url | stylesheet_tag }}`,
    ["section.settings.show_view_all"],
  );

  return (
    <div className={`color-${colorScheme} gradient`}>
      <div
        className={clsx("collection-list-wrapper page-width isolate", {
          "page-width-desktop": swipeOnMobile,
          "no-heading": !title,
          "no-mobile-link": !showViewAll,
        })}
        style={paddingStyle}
      >
        <div className="section-padding">
          {title && (
            <div className={clsx("title-wrapper-with-link", {
              "title-wrapper--self-padded-tablet-down": swipeOnMobile,
              "title-wrapper--self-padded-mobile": !swipeOnMobile,
            }, "title-wrapper--no-top-margin")}>
              <h2 className={clsx("collection-list-title inline-richtext", headingSize, animClass)}>
                {title}
              </h2>
              {showViewAll && swipeOnMobile && (
                <a href="routes.collections_url" className="link underlined-link large-up-hide">
                  {`{{ 'sections.collection_list.view_all' | t }}`}
                </a>
              )}
            </div>
          )}

          <slider-component className={clsx("slider-mobile-gutter", animClass)}>
            <ul
              className={clsx(
                "collection-list contains-card contains-card--collection",
                "grid",
                `grid--${columnsDesktop}-col-desktop grid--${columnsMobile}-col-tablet-down`,
                { "slider slider--tablet grid--peek": swipeOnMobile },
              )}
              id={`Slider-${sectionId}`}
              role="list"
            >
              {`{%- for block in section.blocks -%}
                {%- assign placeholder_image_index = forloop.index0 | modulo: 4 | plus: 1 -%}
                {%- assign placeholder_image = 'collection-apparel-' | append: placeholder_image_index -%}
                <li class="collection-list__item grid__item{% if section.settings.swipe_on_mobile %} slider__slide{% endif %}">
                  {% render 'card-collection',
                    card_collection: block.settings.collection,
                    media_aspect_ratio: section.settings.image_ratio,
                    columns: 3,
                    placeholder_image: placeholder_image
                  %}
                </li>
              {%- endfor -%}`}
            </ul>
          </slider-component>

          {showViewAll && (
            <div className={clsx("center collection-list-view-all", { "small-hide medium-hide": swipeOnMobile })}>
              <a href="routes.collections_url" className="button">
                {`{{ 'sections.collection_list.view_all' | t }}`}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
