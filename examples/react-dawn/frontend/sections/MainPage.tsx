import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "../styles/shared.css";

const settings = [
  {
    type: "header",
    content: "t:sections.all.padding.section_padding_heading",
  },
  {
    type: "range",
    id: "padding_top",
    min: 0,
    max: 100,
    step: 4,
    unit: "px",
    label: "t:sections.all.padding.padding_top",
    default: 36,
  },
  {
    type: "range",
    id: "padding_bottom",
    min: 0,
    max: 100,
    step: 4,
    unit: "px",
    label: "t:sections.all.padding.padding_bottom",
    default: 36,
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Page (React)",
  tag: "section",
  class: "section",
  settings,
} satisfies ShopifyMeta;

export default function MainPage() {
  useLiquidCode(`{{ 'section-main-page.css' | asset_url | stylesheet_tag }}`, []);
  useLiquidCode(
    `{%- style -%}
  .section-{{ section.id }}-padding {
    padding-top: {{ section.settings.padding_top | times: 0.75 | round: 0 }}px;
    padding-bottom: {{ section.settings.padding_bottom | times: 0.75 | round: 0 }}px;
  }

  @media screen and (min-width: 750px) {
    .section-{{ section.id }}-padding {
      padding-top: {{ section.settings.padding_top }}px;
      padding-bottom: {{ section.settings.padding_bottom }}px;
    }
  }
{%- endstyle -%}`,
    ["section.settings.padding_top", "section.settings.padding_bottom"],
  );
  const [title] = useLiquid<string>("page.title");
  const [content] = useLiquid<string>("page.content");
  const [sectionId] = useLiquid<string>("section.id");
  const [animationsEnabled] = useLiquid<boolean>("settings.animations_reveal_on_scroll", { type: "boolean" });

  return (
    <div className={`page-width page-width--narrow section-${sectionId}-padding`}>
      <h1
        className={clsx("main-page-title", "page-title", "h0", {
          "scroll-trigger animate--fade-in": animationsEnabled,
        })}
      >
        {title}
      </h1>
      <div
        className={clsx("rte", {
          "scroll-trigger animate--slide-in": animationsEnabled,
        })}
      >
        {content}
      </div>
    </div>
  );
}
