import { useState } from "react";
import type { ShopifyMeta } from "vite-plugin-react-shopify";

export const shopifyMeta = {
  name: "Counter (React)",
  settings: [
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
  ],
  presets: [
    { name: "Counter (Default)", category: "Demo" },
    {
      name: "Counter (Step 5)",
      category: "Demo",
      settings: { step: "5", initial_count: 10 },
    },
  ],
} satisfies ShopifyMeta;

interface CounterProps {
  title?: string;
  initial_count?: number;
  step?: string;
}

export default function Counter({
  title = "Counter",
  initial_count = 0,
  step = "1",
}: CounterProps) {
  const stepNum = Number(step) || 1;
  const [count, setCount] = useState(initial_count);

  return (
    <div className="counter-section">
      <h2 className="counter-title">{title}</h2>
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
    </div>
  );
}
