import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { ShopifyVideo, useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
import "./Video.css";
import "../styles/shared.css";

const settings = [
  { type: "inline_richtext", id: "heading", default: "t:sections.video.settings.heading.default", label: "t:sections.video.settings.heading.label" },
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
  { type: "checkbox", id: "enable_video_looping", label: "t:sections.video.settings.enable_video_looping.label", default: false },
  { type: "header", content: "t:sections.video.settings.header__1.content" },
  { type: "video", id: "video", label: "t:sections.video.settings.video.label" },
  { type: "header", content: "t:sections.video.settings.header__2.content" },
  { type: "paragraph", content: "t:sections.video.settings.paragraph.content" },
  { type: "video_url", id: "video_url", accept: ["youtube", "vimeo"], label: "t:sections.video.settings.video_url.label", info: "t:sections.video.settings.video_url.info" },
  { type: "image_picker", id: "cover_image", label: "t:sections.video.settings.cover_image.label" },
  { type: "text", id: "description", label: "t:sections.video.settings.description.label", info: "t:sections.video.settings.description.info" },
  { type: "header", content: "t:sections.video.settings.header__3.content" },
  { type: "checkbox", id: "full_width", label: "t:sections.video.settings.full_width.label", default: false },
  { type: "color_scheme", id: "color_scheme", label: "t:sections.all.colors.label", default: "scheme-1" },
  { type: "header", content: "t:sections.all.padding.section_padding_heading" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "t:sections.all.padding.padding_top", default: 36 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "t:sections.all.padding.padding_bottom", default: 36 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "t:sections.video.name",
  tag: "section",
  class: "section",
  settings,
  disabled_on: { groups: ["header", "footer"] },
  presets: [{ name: "t:sections.video.presets.name" }],
} satisfies ShopifyMeta;

export default function Video() {
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("slide-in");

  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [fullWidth] = useLiquid<boolean>("section.settings.full_width", { type: "boolean" });
  const [heading] = useLiquid<string>("section.settings.heading");
  const [headingSize] = useLiquid<string>("section.settings.heading_size");
  const [enableLooping] = useLiquid<boolean>("section.settings.enable_video_looping", { type: "boolean" });

  useLiquidCode(
    `{%- liquid
  assign video_id = section.settings.video.id | default: section.settings.video_url.id
  assign video_alt = section.settings.video.alt | default: section.settings.description
  assign alt = 'sections.video.load_video' | t: description: video_alt | escape
  assign poster = section.settings.video.preview_image | default: section.settings.cover_image
  if section.settings.video != null
    assign ratio_diff = section.settings.video.aspect_ratio | minus: poster.aspect_ratio | abs
    if ratio_diff < 0.01 and ratio_diff > 0
      assign fix_ratio = true
    endif
  endif
-%}
{%- capture sizes -%}
  {% if section.settings.full_width -%}100vw{%- else -%}(min-width: {{ settings.page_width }}px) {{ settings.page_width | minus: 100 }}px, (min-width: 750px) calc(100vw - 10rem), 100vw{%- endif %}
{%- endcapture -%}`,
    ["section.settings.video", "section.settings.video_url", "section.settings.description", "section.settings.cover_image", "section.settings.full_width"],
  );

  return (
    <div className={`color-${colorScheme} gradient`}>
      <div
        className={clsx("video-section isolate", !fullWidth && "page-width")}
        style={paddingStyle}
      >
        <div className="section-padding">
          {heading && (
            <div className={fullWidth ? "page-width" : undefined}>
              <div className={clsx("title-wrapper title-wrapper--no-top-margin", animClass)}>
                <h2 className={`title inline-richtext ${headingSize}`}>{heading}</h2>
              </div>
            </div>
          )}

          <ShopifyVideo
            media="section.settings.video"
            controls
            autoplay
            loop={enableLooping}
            className={clsx("video-section__media global-media-settings", { "global-media-settings--full-width": fullWidth })}
          />
        </div>
      </div>
    </div>
  );
}
