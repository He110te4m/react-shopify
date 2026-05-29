import { useState, useEffect } from "react";
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useSectionSettings, useLiquidValues, parseLiquidNumber } from "vite-plugin-react-shopify/runtime";
import SharedCard from "../components/SharedCard/SharedCard";

const settings = [
  { type: "text", id: "title", label: "Title", default: "Counter" },
  { type: "number", id: "initial_count", label: "Initial Count", default: 0 },
  {
    type: "select",
    id: "step",
    label: "Step Size",
    default: "1",
    options: [
      { value: "1", label: "1" },
      { value: "2", label: "2" },
      { value: "5", label: "5" },
      { value: "10", label: "10" },
    ],
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Counter (React)",
  settings,
  presets: [
    { name: "Counter (Default)", category: "Demo" },
    { name: "Counter (Step 5)", category: "Demo", settings: { step: "5", initial_count: 10 } },
  ],
} satisfies ShopifyMeta;

export default function Counter() {
  const { value: title } = useSectionSettings("title");
  const { values: s } = useLiquidValues({
    initial: "section.settings.initial_count",
    step: "section.settings.step",
  });

  const stepNum = parseLiquidNumber(s.step, 1);
  const initialCount = parseLiquidNumber(s.initial, 0);

  const [count, setCount] = useState(0);

  useEffect(() => {
    // After hydration, sync to the Shopify setting value.
    // During SSR, useState is always 0 so the DOM has <p>0</p> → hydration match.
    setCount(initialCount);
  }, []);

  return (
    <SharedCard title={title ?? "Counter"} accentColor="#e17055">
      <p className="counter-value">{count}</p>
      <div className="counter-buttons">
        <button type="button" className="counter-btn counter-btn--dec" onClick={() => setCount((c) => c - stepNum)}>
          {`-${s.step}`}
        </button>
        <button type="button" className="counter-btn counter-btn--reset" onClick={() => setCount(initialCount)}>
          Reset
        </button>
        <button type="button" className="counter-btn counter-btn--inc" onClick={() => setCount((c) => c + stepNum)}>
          {`+${s.step}`}
        </button>
      </div>
    </SharedCard>
  );
}
