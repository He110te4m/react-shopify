import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";
import { useAnimation } from "../hooks/useAnimation";
import { useSectionPadding } from "../hooks/useSectionPadding";
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
  const { style: paddingStyle } = useSectionPadding();
  const animClass = useAnimation("fade-in");
  const slideClass = useAnimation("slide-in");

  const [title] = useLiquid<string>("page.title");
  const [content] = useLiquid<string>("page.content");

  return (
    <div
      className="page-width page-width--narrow"
      style={paddingStyle}
    >
      <div className="section-padding">
        <h1 className={clsx("main-page-title page-title h0", animClass)}>{title}</h1>
        <div className={clsx("rte", slideClass)}>{content}</div>
      </div>
    </div>
  );
}
