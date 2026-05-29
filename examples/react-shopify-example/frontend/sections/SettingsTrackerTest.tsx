import { useEffect, useState } from "react";
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquidValue, useLiquidValues } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Settings Tracker Test",
  settings: [
    { type: "text", id: "title", label: "Title", default: "默认标题" },
    { type: "textarea", id: "description", label: "Description" },
    { type: "checkbox", id: "show_banner", label: "显示横幅", default: true },
    { type: "select", id: "banner_position", label: "横幅位置", default: "top", options: [{ value: "top", label: "顶部" }, { value: "bottom", label: "底部" }] },
    { type: "range", id: "font_size", label: "字体大小", default: 16, min: 12, max: 32 },
    { type: "color", id: "accent_color", label: "强调色", default: "#6366f1" },
    { type: "image_picker", id: "image", label: "图片" },
    { type: "text", id: "effect_only_text", label: "仅 Effect 使用的文本", default: "effect value" },
    { type: "header", content: "测试信息区" },
    { type: "paragraph", content: "以上 8 个 input settings，组件实际用了其中部分" },
  ],
  presets: [{ name: "Tracker Test (Default)", category: "Test" }],
} satisfies ShopifyMeta;

export default function SettingsTrackerTest() {
  const [title] = useLiquidValue("section.settings.title");
  const [description] = useLiquidValue("section.settings.description");
  const [showBanner] = useLiquidValue("section.settings.show_banner", "boolean");
  const [bannerPosition] = useLiquidValue("section.settings.banner_position");

  const unused = useLiquidValues({
    effect_only_text: "section.settings.effect_only_text",
  });

  const [effectResult, setEffectResult] = useState("(等待 hydrate)");

  useEffect(() => {
    if (unused.effect_only_text) setEffectResult(unused.effect_only_text);
  }, []);

  return (
    <div className={`settings-tracker-test ${bannerPosition}`}>
      <section hidden={!showBanner}>
        <h1>{title}</h1>
        <div className="tracker-banner">
          <p>{description}</p>
        </div>
      </section>

      <div className="tracker-debug">
        <h3>Render 中访问的 settings（被跟踪 → 会出现在 bridge JSON 中）:</h3>
        <ul>
          <li>{`title = ${title}`}</li>
          <li>{`description = ${description}`}</li>
          <li>{`show_banner = ${String(showBanner)}`}</li>
          <li>{`banner_position = ${bannerPosition}`}</li>
        </ul>
        <h3>useEffect 测试（hydrate 后可见）:</h3>
        <p data-testid="effect-result">{`effect_only_text = ${effectResult}`}</p>
      </div>
    </div>
  );
}
