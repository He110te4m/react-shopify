import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "text", id: "heading", label: "Heading", default: "Static Hero Banner" },
  { type: "color", id: "bg_color", label: "Background Color", default: "#f4f1ff" },
  { type: "color", id: "text_color", label: "Text Color", default: "#2d2350" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Hero Banner",
  settings,
  presets: [
    {
      name: "Hero Banner",
      category: "Test",
      settings: {
        heading: "Static Hero Banner",
        bg_color: "#f4f1ff",
        text_color: "#2d2350",
      },
    },
  ],
} satisfies ShopifyMeta;

export default function HeroBanner() {
  const [heading] = useLiquid<string>("block.settings.heading");
  const [bgColor] = useLiquid<string>("block.settings.bg_color");
  const [textColor] = useLiquid<string>("block.settings.text_color");
  const [badge] = useLiquid<string>("static_badge");

  return (
    <div
      className="static-hero-banner"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderRadius: "12px",
        padding: "2rem",
        textAlign: "center",
      } as React.CSSProperties}
    >
      {badge && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {badge}
        </p>
      )}
      <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{heading}</h3>
      <p style={{ margin: "0.75rem 0 0", opacity: 0.78, fontSize: "0.9rem" }}>
        Rendered by Shopify through StaticBlock at a fixed position.
      </p>
    </div>
  );
}
