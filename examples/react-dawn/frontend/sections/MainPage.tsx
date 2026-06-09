import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import "./MainPage.css";
import "./SectionPadding.css";
import "../styles/shared.css";

const settings = [
  { type: "header", content: "t:sections.all.padding.section_padding_heading" },
  {
    type: "range", id: "padding_top", min: 0, max: 100, step: 4, unit: "px",
    label: "t:sections.all.padding.padding_top", default: 36,
  },
  {
    type: "range", id: "padding_bottom", min: 0, max: 100, step: 4, unit: "px",
    label: "t:sections.all.padding.padding_bottom", default: 36,
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Page (React)",
  tag: "section",
  class: "section",
  settings,
} satisfies ShopifyMeta;

export default function MainPage() {
  const [title] = useLiquid<string>("page.title");
  const [content] = useLiquid<string>("page.content");
  const [pt] = useLiquid<number>("section.settings.padding_top", { type: "number" });
  const [pb] = useLiquid<number>("section.settings.padding_bottom", { type: "number" });
  const [anim] = useLiquid<boolean>("settings.animations_reveal_on_scroll", { type: "boolean" });

  return (
    <div
      className="page-width page-width--narrow"
      style={{
        "--pt-desktop": `${pt}px`,
        "--pt-mobile": `${Math.round(pt * 0.75)}px`,
        "--pb-desktop": `${pb}px`,
        "--pb-mobile": `${Math.round(pb * 0.75)}px`,
      } as React.CSSProperties}
    >
      <div className="section-padding">
        <h1 className={clsx("main-page-title page-title h0", { "scroll-trigger animate--fade-in": anim })}>
          {title}
        </h1>
        <div className={clsx("rte", { "scroll-trigger animate--slide-in": anim })}>
          {content}
        </div>
      </div>
    </div>
  );
}
