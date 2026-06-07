import { useState } from "react";
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid, BlockSlot } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "text", id: "title", label: "Section Title", default: "Block Test Section" },
  {
    type: "select",
    id: "layout",
    label: "Layout",
    default: "vertical",
    options: [
      { value: "vertical", label: "Vertical" },
      { value: "horizontal", label: "Horizontal" },
    ],
  },
  { type: "color", id: "border_color", label: "Border Color", default: "#e5e5e5" },
  { type: "number", id: "initial_count", label: "Initial Count", default: 0 },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Block Test Section",
  settings,
  blocks: [
    { type: "react-color-block" },
    { type: "@theme" },
  ],
  max_blocks: 8,
  presets: [
    {
      name: "Block Test (Default)",
      category: "Test",
      settings: { title: "Block Test Section", layout: "vertical", border_color: "#e5e5e5", initial_count: 0 },
      blocks: [
        { type: "react-color-block", settings: { label: "Block A", color: "#6c63ff", height: 60 } },
        { type: "react-color-block", settings: { label: "Block B", color: "#00b894", height: 80 } },
        { type: "react-color-block", settings: { label: "Block C", color: "#e17055", height: 100 } },
      ],
    },
  ],
} satisfies ShopifyMeta;

export default function BlockTestSection() {
  const [title] = useLiquid<string>("section.settings.title");
  const [layout] = useLiquid<string>("section.settings.layout");
  const [borderColor] = useLiquid<string>("section.settings.border_color");
  const [initialCount] = useLiquid<number>("section.settings.initial_count", { type: "number" });

  const [count, setCount] = useState(initialCount);

  return (
    <section
      className="block-test-section"
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: "8px",
        padding: "1.5rem",
        marginBottom: "2rem",
        display: "flex",
        flexDirection: layout === "horizontal" ? "row" : "column",
        gap: "1rem",
      } as React.CSSProperties}
    >
      <div className="block-test-section__header">
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{title}</h2>
        <p style={{ color: "#888", margin: "4px 0 0", fontSize: "0.875rem" }}>
          {`Layout: ${layout} | Initial: ${initialCount}`}
        </p>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        backgroundColor: "#f5f5f5",
        borderRadius: "6px",
      }}>
        <span style={{ fontWeight: 600, fontSize: "1.25rem" }}>{count}</span>
        <button
          type="button"
          onClick={() => setCount((c) => c - 1)}
          style={{
            border: "none",
            background: "#6c63ff",
            color: "#fff",
            borderRadius: "4px",
            padding: "0.25rem 0.75rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          -1
        </button>
        <button
          type="button"
          onClick={() => setCount(initialCount)}
          style={{
            border: "none",
            background: "#ddd",
            color: "#333",
            borderRadius: "4px",
            padding: "0.25rem 0.75rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          style={{
            border: "none",
            background: "#00b894",
            color: "#fff",
            borderRadius: "4px",
            padding: "0.25rem 0.75rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          +1
        </button>
      </div>

      {/* BlockSlot: child blocks render precisely here, between the counter and footer */}
      <div style={{
        padding: "1rem",
        border: "1px dashed #ccc",
        borderRadius: "6px",
      }}>
        <p style={{ margin: "0 0 0.5rem", color: "#666", fontSize: "0.85rem" }}>
          ↓ Blocks inserted here ↓
        </p>
        <BlockSlot />
        <p style={{ margin: "0.5rem 0 0", color: "#666", fontSize: "0.85rem" }}>
          ↑ Blocks inserted above ↑
        </p>
      </div>

      <footer style={{ fontSize: "0.75rem", color: "#999" }}>
        Section footer — rendered after BlockSlot
      </footer>
    </section>
  );
}