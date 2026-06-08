import { useState } from "react";
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { BlockSlot, StaticBlock, useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "text", id: "title", label: "Section Title", default: "Static Block Demo" },
  { type: "color", id: "accent_color", label: "Accent Color", default: "#6c63ff" },
  { type: "color", id: "secondary_color", label: "Secondary Color", default: "#00b894" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Static Block Test",
  settings,
  blocks: [
    { type: "@theme" },
    { type: "react-color-block" },
  ],
  max_blocks: 6,
  presets: [
    {
      name: "Static Block Test",
      category: "Test",
      settings: {
        title: "Static Block Demo",
        accent_color: "#6c63ff",
        secondary_color: "#00b894",
      },
      blocks: [
        {
          type: "react-hero-banner",
          static: true,
          id: "hero-1",
          settings: {
            heading: "Static Hero Banner",
            bg_color: "#f4f1ff",
            text_color: "#2d2350",
          },
        },
        {
          type: "react-color-block",
          settings: { label: "Dynamic Block", color: "#00b894", height: 80 },
        },
      ],
    },
  ],
} satisfies ShopifyMeta;

export default function StaticBlockTest() {
  const [title] = useLiquid<string>("section.settings.title");
  const [accentColor] = useLiquid<string>("section.settings.accent_color");
  const [secondaryColor] = useLiquid<string>("section.settings.secondary_color");
  const [expanded, setExpanded] = useState(true);

  return (
    <section
      className="static-block-section"
      style={{
        border: "2px solid #e5e5e5",
        borderRadius: "12px",
        padding: "2rem",
        marginBottom: "2rem",
      } as React.CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{title}</h2>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          style={{
            border: "none",
            borderRadius: "999px",
            background: accentColor,
            color: "#fff",
            cursor: "pointer",
            padding: "0.5rem 1rem",
            fontWeight: 700,
          }}
        >
          {expanded ? "Hide notes" : "Show notes"}
        </button>
      </div>

      {expanded && (
        <p style={{ margin: "0 0 1rem", color: "#666", fontSize: "0.9rem" }}>
          StaticBlock keeps this hero fixed in the section layout, while BlockSlot below remains merchant-editable.
        </p>
      )}

      <div style={{ border: `2px dashed ${accentColor}`, borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 0.75rem", color: "#666", fontSize: "0.85rem", fontWeight: 700 }}>
          Fixed static block
        </p>
        <StaticBlock
          type="react-hero-banner"
          id="hero-1"
          data={{ static_badge: { liquid: "section.settings.title" } }}
        />
      </div>

      <div style={{ border: `2px dashed ${secondaryColor}`, borderRadius: "8px", padding: "1rem" }}>
        <p style={{ margin: "0 0 0.75rem", color: "#666", fontSize: "0.85rem", fontWeight: 700 }}>
          Dynamic blocks slot
        </p>
        <BlockSlot />
      </div>
    </section>
  );
}
