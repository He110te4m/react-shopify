import { useState } from "react";
import type { ShopifyMeta, SettingSchema, InferSettings } from "vite-plugin-react-shopify";
import { useShopifySettings } from "vite-plugin-react-shopify/runtime/settings";
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
    {
      name: "Counter (Step 5)",
      category: "Demo",
      settings: { step: "5", initial_count: 10 },
    },
  ],
} satisfies ShopifyMeta;

export default function Counter() {
  const s = useShopifySettings<InferSettings<typeof settings>>();
  const title = s.title || "Counter";
  const initial_count = s.initial_count || 0;
  const step = s.step || "1";

  const stepNum = Number(step) || 1;
  const [count, setCount] = useState(initial_count);

  return (
    <SharedCard title={title} accentColor="#e17055">
      <p className="counter-value">{count}</p>
      <div className="counter-buttons">
        <button
          type="button"
          className="counter-btn counter-btn--dec"
          onClick={() => setCount((c) => c - stepNum)}
        >
          -{step}
        </button>
        <button
          type="button"
          className="counter-btn counter-btn--reset"
          onClick={() => setCount(initial_count)}
        >
          Reset
        </button>
        <button
          type="button"
          className="counter-btn counter-btn--inc"
          onClick={() => setCount((c) => c + stepNum)}
        >
          +{step}
        </button>
      </div>
    </SharedCard>
  );
}
