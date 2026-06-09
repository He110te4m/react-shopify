import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  { type: "blog", id: "blog", label: "Blog" },
  { type: "range", id: "post_limit", min: 2, max: 4, step: 1, default: 3, label: "Number of posts to show" },
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Blog posts" },
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
  { type: "range", id: "columns_desktop", min: 1, max: 4, step: 1, default: 3, label: "Columns on desktop" },
  { type: "checkbox", id: "show_view_all", default: true, label: "Show 'View all' button" },
  { type: "checkbox", id: "show_image", default: true, label: "Show image" },
  { type: "checkbox", id: "show_date", default: true, label: "Show date" },
  { type: "checkbox", id: "show_author", default: false, label: "Show author" },
  { type: "color_scheme", id: "color_scheme", label: "Color scheme", default: "scheme-1" },
  { type: "header", content: "Section padding" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "Padding top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "Padding bottom", default: 36 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Featured Blog (React)",
  tag: "section",
  settings,
  disabled_on: { groups: ["header", "footer"] },
  presets: [{ name: "Featured Blog (React)" }],
} satisfies ShopifyMeta;

export default function FeaturedBlog() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [sectionId] = useLiquid<string>("section.id");
  const [heading] = useLiquid<string>("section.settings.heading");
  const [headingSize] = useLiquid<string>("section.settings.heading_size");
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [columnsDesktop] = useLiquid<number>("section.settings.columns_desktop", { type: "number" });
  const [showViewAll] = useLiquid<boolean>("section.settings.show_view_all", { type: "boolean" });
  const [showImage] = useLiquid<boolean>("section.settings.show_image", { type: "boolean" });
  const [showDate] = useLiquid<boolean>("section.settings.show_date", { type: "boolean" });
  const [showAuthor] = useLiquid<boolean>("section.settings.show_author", { type: "boolean" });
  const [postLimit] = useLiquid<number>("section.settings.post_limit", { type: "number" });

  useLiquidCode(`{{ 'component-slider.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-card.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'component-article-card.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(`{{ 'section-featured-blog.css' | asset_url | stylesheet_tag }}`, []);

  return (
    <div className={clsx("blog", `color-${colorScheme}`, "gradient", { "no-heading": !heading })}>
      <div
        className={clsx("page-width-desktop", "isolate", {
          "page-width-tablet": postLimit < 3,
        })}
        style={paddingStyle}
      >
        {heading && (
          <div className={clsx(
            "title-wrapper-with-link",
            { "title-wrapper--self-padded-tablet-down": postLimit > 2, "title-wrapper--self-padded-mobile": postLimit <= 2 },
            "title-wrapper--no-top-margin",
          )}>
            <h2 id={`SectionHeading-${sectionId}`} className={clsx("blog__title inline-richtext", headingSize, animClass)}>
              {heading}
            </h2>
            {showViewAll && (
              <a href="routes.blog_url" className={clsx("link underlined-link large-up-hide", animClass)}>
                {`{{ 'sections.featured_blog.view_all' | t }}`}
              </a>
            )}
          </div>
        )}

        <slider-component className={clsx("slider-mobile-gutter", animClass)}>
          <ul
            id={`Slider-${sectionId}`}
            className={clsx(
              "blog__posts articles-wrapper contains-card contains-card--article",
              "grid grid--peek grid--2-col-tablet",
              `grid--${columnsDesktop}-col-desktop`,
              "slider",
              { "slider--tablet": postLimit > 2, "slider--mobile": postLimit <= 2 },
            )}
            role="list"
          >
            {`{%- liquid
  assign posts_displayed = section.settings.blog.articles_count
  assign posts_exceed_limit = false
  if section.settings.post_limit <= section.settings.blog.articles_count or section.settings.post_limit <= 4
    assign posts_exceed_limit = true
    assign posts_displayed = section.settings.post_limit
  endif
-%}
{%- if section.settings.blog != blank and section.settings.blog.articles_count > 0 -%}
  {%- for article in section.settings.blog.articles limit: section.settings.post_limit -%}
    <li id="Slide-{{ section.id }}-{{ forloop.index }}" class="blog__post grid__item article slider__slide slider__slide--full-width{% if settings.animations_reveal_on_scroll %} scroll-trigger animate--slide-in{% endif %}">
      {% render 'article-card',
        blog: section.settings.blog,
        article: article,
        media_aspect_ratio: 1.66,
        show_image: section.settings.show_image,
        show_date: section.settings.show_date,
        show_author: section.settings.show_author,
        show_excerpt: true
      %}
    </li>
  {%- endfor -%}
{%- else -%}
  {% for i in (1..section.settings.post_limit) -%}
    {%- assign placeholder_image_index = forloop.index0 | modulo: 3 | plus: 1 -%}
    {%- assign placeholder_image = 'blog-apparel-' | append: placeholder_image_index -%}
    <li id="Slide-{{ section.id }}-{{ forloop.index }}" class="blog__post grid__item article slider__slide slider__slide--full-width{% if settings.animations_reveal_on_scroll %} scroll-trigger animate--slide-in{% endif %}">
      <div class="article-card-wrapper card-wrapper">
        <div class="card article-card card--{{ settings.blog_card_style }}{% if settings.blog_card_style == 'card' %} color-{{ settings.blog_card_color_scheme }} gradient{% endif %}{% if section.settings.show_image %} card--media{% else %} card--text{% endif %}">
          <div class="card__inner{% if settings.blog_card_style == 'standard' %} color-{{ settings.blog_card_color_scheme }} gradient{% endif %} ratio" style="--ratio-percent: 80%;">
            {%- if section.settings.show_image == true -%}
              <div class="article-card__image-wrapper card__media">
                <div class="article-card__image media">
                  {{ placeholder_image | placeholder_svg_tag: 'blog-placeholder-svg' }}
                </div>
              </div>
            {%- endif -%}
            <div class="card__content">
              <div class="card__information">
                <h3 class="card__heading h2">{{ 'sections.featured_blog.onboarding_title' | t }}</h3>
                <p class="article-card__excerpt rte-width">{{ 'sections.featured_blog.onboarding_content' | t }}</p>
              </div>
            </div>
          </div>
          <div class="card__content">
            <div class="card__information">
              <h3 class="card__heading h2">{{ 'sections.featured_blog.onboarding_title' | t }}</h3>
              <p class="article-card__excerpt rte-width">{{ 'sections.featured_blog.onboarding_content' | t }}</p>
            </div>
          </div>
        </div>
      </div>
    </li>
  {%- endfor -%}
{%- endif -%}`}
          </ul>

          {`{%- if posts_exceed_limit -%}
            <div class="slider-buttons{% if section.settings.post_limit < 3 %} medium-hide{% endif %}{% if section.settings.post_limit < 2 %} small-hide{% endif %}">
              <button type="button" class="slider-button slider-button--prev" name="previous" aria-label="{{ 'general.slider.previous_slide' | t }}">
                <span class="svg-wrapper">{{- 'icon-caret.svg' | inline_asset_content -}}</span>
              </button>
              <div class="slider-counter caption">
                <span class="slider-counter--current">1</span>
                <span aria-hidden="true"> / </span>
                <span class="visually-hidden">{{ 'general.slider.of' | t }}</span>
                <span class="slider-counter--total">{{ section.settings.post_limit }}</span>
              </div>
              <button type="button" class="slider-button slider-button--next" name="next" aria-label="{{ 'general.slider.next_slide' | t }}">
                <span class="svg-wrapper">{{- 'icon-caret.svg' | inline_asset_content -}}</span>
              </button>
            </div>
          {%- endif -%}`}
        </slider-component>

        {showViewAll && (
          <div
            className={clsx("blog__view-all center small-hide medium-hide", animClass)}
          >
            <a
              href="routes.blog_url"
              id={`ViewAll-${sectionId}`}
              className="blog__button button"
              aria-labelledby={`ViewAll-${sectionId} SectionHeading-${sectionId}`}
            >
              {`{{ 'sections.featured_blog.view_all' | t }}`}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
