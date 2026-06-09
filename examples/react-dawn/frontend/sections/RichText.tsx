import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./RichText.css";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  {
    type: "select", id: "desktop_content_position",
    options: [
      { value: "left", label: "t:sections.rich-text.settings.desktop_content_position.options__1.label" },
      { value: "center", label: "t:sections.rich-text.settings.desktop_content_position.options__2.label" },
      { value: "right", label: "t:sections.rich-text.settings.desktop_content_position.options__3.label" },
    ],
    default: "center",
    label: "t:sections.rich-text.settings.desktop_content_position.label",
  },
  {
    type: "select", id: "content_alignment",
    options: [
      { value: "left", label: "t:sections.rich-text.settings.content_alignment.options__1.label" },
      { value: "center", label: "t:sections.rich-text.settings.content_alignment.options__2.label" },
      { value: "right", label: "t:sections.rich-text.settings.content_alignment.options__3.label" },
    ],
    default: "center",
    label: "t:sections.rich-text.settings.content_alignment.label",
  },
  { type: "color_scheme", id: "color_scheme", label: "t:sections.all.colors.label", default: "scheme-1" },
  { type: "checkbox", id: "full_width", default: true, label: "t:sections.rich-text.settings.full_width.label" },
  { type: "header", content: "t:sections.all.padding.section_padding_heading" },
  { type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px", label: "t:sections.all.padding.padding_top", default: 40 },
  { type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px", label: "t:sections.all.padding.padding_bottom", default: 52 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "t:sections.rich-text.name",
  tag: "section",
  class: "section",
  settings,
  blocks: [{ type: "@theme" }],
  disabled_on: { groups: ["header", "footer"] },
  presets: [{ name: "t:sections.rich-text.presets.name", category: "Text" }],
} satisfies ShopifyMeta;

export default function RichText() {
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [fullWidth] = useLiquid<boolean>("section.settings.full_width", { type: "boolean" });
  const [contentPosition] = useLiquid<string>("section.settings.desktop_content_position");
  const [contentAlignment] = useLiquid<string>("section.settings.content_alignment");
  const [pt] = useLiquid<number>("section.settings.padding_top", { type: "number" });
  const [pb] = useLiquid<number>("section.settings.padding_bottom", { type: "number" });

  return (
    <div className={clsx("isolate", !fullWidth && "page-width")}>
      <div
        className={clsx("rich-text content-container", `color-${colorScheme}`, "gradient", {
          "rich-text--full-width content-container--full-width": fullWidth,
        })}
        style={{
          "--pt-desktop": `${pt}px`, "--pt-mobile": `${Math.round(pt * 0.75)}px`,
          "--pb-desktop": `${pb}px`, "--pb-mobile": `${Math.round(pb * 0.75)}px`,
        } as React.CSSProperties}
      >
        <div className="section-padding">
          <div className={clsx("rich-text__wrapper", `rich-text__wrapper--${contentPosition}`, fullWidth && "page-width")}>
            <div className={`rich-text__blocks ${contentAlignment}`}>
              <BlockSlot />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
