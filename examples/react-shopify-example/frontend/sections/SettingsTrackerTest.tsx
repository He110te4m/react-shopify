import { useEffect, useState } from "react";
import type { ShopifyMeta, InputSettingSchema, InferSettings } from "vite-plugin-react-shopify";
import { useShopifySettings } from "vite-plugin-react-shopify/runtime/settings";

const settings: InputSettingSchema[] = [
  { type: "text", id: "title", label: "Title", default: "默认标题" },
  { type: "textarea", id: "description", label: "Description" },
  { type: "checkbox", id: "show_banner", label: "显示横幅", default: true },
  { type: "select", id: "banner_position", label: "横幅位置", default: "top", options: [
    { value: "top", label: "顶部" },
    { value: "bottom", label: "底部" },
  ] },
  { type: "range", id: "font_size", label: "字体大小", default: 16, min: 12, max: 32 },
  { type: "color", id: "accent_color", label: "强调色", default: "#6366f1" },
  { type: "image_picker", id: "image", label: "图片" },
  { type: "text", id: "effect_only_text", label: "仅 Effect 使用的文本", default: "effect value" },
];

export const shopifyMeta = {
  name: "Settings Tracker Test",
  settings: [
    ...settings,
    { type: "header" as const, content: "测试信息区" },
    { type: "paragraph" as const, content: "以上 8 个 input settings，组件实际只用了 4 个在 render body 中" },
  ],
  presets: [
    { name: "Tracker Test (Default)", category: "Test" },
  ],
} satisfies ShopifyMeta;

export default function SettingsTrackerTest() {
  const s = useShopifySettings<InferSettings<typeof settings>>();

  const [effectResult, setEffectResult] = useState("(等待 hydrate)");
  const [renderCount, setRenderCount] = useState(0);
  const [unusedSettingsDetected, setUnusedSettingsDetected] = useState<string[]>([]);

  useEffect(() => {
    setRenderCount(1);

    const unused: string[] = [];
    const expectedUsed = ["title", "description", "show_banner", "banner_position"];

    const settingsObj = s as Record<string, any>;

    for (const key of ["font_size", "accent_color", "image"]) {
      if (!expectedUsed.includes(key)) {
        const val = settingsObj[key];
        unused.push(`${key}=${val === undefined ? "undefined" : JSON.stringify(val)}`);
      }
    }

    const effectVal = s.effect_only_text;
    if (effectVal === undefined || effectVal === "") {
      unused.push("effect_only_text=undefined (useEffect中访问，SSR未追踪)");
    } else {
      unused.push(`effect_only_text=${JSON.stringify(effectVal)}`);
      setEffectResult(String(effectVal));
    }

    setUnusedSettingsDetected(unused);
  }, []);

  const title = s.title;
  const description = s.description;
  const showBanner = s.show_banner !== false;
  const bannerPosition = s.banner_position;

  return (
    <div className={`settings-tracker-test ${bannerPosition}`}>
      <h1>{title}</h1>

      {showBanner && (
        <div className="tracker-banner">
          <p>{description}</p>
        </div>
      )}

      <div className="tracker-debug">
        <h3>Render 中访问的 settings（被追踪 → 会出现在 bridge JSON 中）:</h3>
        <ul>
          <li>title = {title}</li>
          <li>description = {description}</li>
          <li>show_banner = {String(showBanner)}</li>
          <li>banner_position = {bannerPosition}</li>
        </ul>

        <h3>useEffect 测试（hydrate 后可见）:</h3>
        <ul>
          <li data-testid="effect-result">effect_only_text = {effectResult}</li>
          <li>renderCount = {renderCount}</li>
          <li>
            未在 render 中使用的 settings（不应出现在 bridge JSON 中）:
            <ul>
              {unusedSettingsDetected.map((item) => (
                <li key={item} data-testid="unused-setting">{item}</li>
              ))}
              {unusedSettingsDetected.length === 0 && <li>(无)</li>}
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
}
