import { useState, useCallback } from "react";
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "text", id: "label", label: "Label", default: "Block" },
  { type: "color", id: "color", label: "Color", default: "#6c63ff" },
  {
    type: "range",
    id: "height",
    label: "Height (px)",
    default: 60,
    min: 30,
    max: 200,
    step: 10,
    unit: "px",
  },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Color Block (React)",
  settings,
  presets: [{ name: "Color Block (Default)", category: "Test" }],
} satisfies ShopifyMeta;

export default function ColorBlock() {
  const [label] = useLiquid<string>("block.settings.label");
  const [color] = useLiquid<string>("block.settings.color");
  const [heightRaw] = useLiquid<string>("block.settings.height");

  const [expanded, setExpanded] = useState(true);
  const [clickCount, setClickCount] = useState(0);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleClick = useCallback(() => {
    setClickCount((c) => c + 1);
  }, []);

  return (
    <div
      className="color-block"
      style={{
        backgroundColor: color,
        color: "#fff",
        borderRadius: "6px",
        overflow: "hidden",
        transition: "min-height 0.2s",
        minHeight: expanded ? `${heightRaw}px` : "40px",
      } as React.CSSProperties}
    >
      <div
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          cursor: "pointer",
          userSelect: "none",
          fontWeight: 600,
          fontSize: "1rem",
        } as React.CSSProperties}
      >
        <span>{label}</span>
        <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
          {expanded ? "Collapse" : "Expand"}
        </span>
      </div>

      {expanded && (
        <div
          onClick={handleClick}
          style={{
            padding: "0.5rem 1rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            cursor: "pointer",
          } as React.CSSProperties}
        >
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
            {`Height: ${heightRaw}px | Color: ${color}`}
          </div>
          <div style={{
            fontSize: "0.8rem",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "4px",
            padding: "0.25rem 0.5rem",
          }}>
            {clickCount === 0 ? "Click me!" : `Clicked ${clickCount} times`}
          </div>
        </div>
      )}
    </div>
  );
}
