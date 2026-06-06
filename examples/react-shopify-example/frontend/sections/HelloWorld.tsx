import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquidValue } from "vite-plugin-react-shopify/runtime";
import SharedCard from "../components/SharedCard/SharedCard";

import "./HelloWorld.css";

export const shopifyMeta = {
  name: "Hello World (React)",
  settings: [
    { type: "text", id: "title", label: "Title", default: "Hello, World!" },
    { type: "textarea", id: "description", label: "Description", default: "This section is built with React and compiled to Liquid via vite-plugin-react-shopify SSG." },
    { type: "color", id: "accent_color", label: "Accent Color", default: "#6c63ff" },
  ],
  presets: [
    { name: "Hello World (React)", category: "Demo" },
  ],
} satisfies ShopifyMeta;

export default function HelloWorld() {
  const [title] = useLiquidValue("section.settings.title");
  const [description] = useLiquidValue("section.settings.description");
  const [accentColor] = useLiquidValue("section.settings.accent_color");

  return (
    <main>
      <section className="react-welcome full-width">
        <div className="react-welcome-content">
          <div>
            <h1>{title}</h1>
            <p className="react-welcome-description">{description}</p>
          </div>
        </div>
      </section>

      <section className="react-highlights">
        <SharedCard title="React + Shopify" accentColor={accentColor}>
          <p>Write sections, blocks, and templates as React components. The SSG compiler converts them to Shopify Liquid files at build time.</p>
        </SharedCard>

        <SharedCard title="Type-Safe Schemas" accentColor="#00b894">
          <p>Define your Shopify section schema as a TypeScript object using the shopifyMeta export. Settings, presets, and blocks are all type-checked.</p>
        </SharedCard>

        <SharedCard title="Hot Reload" accentColor="#fdcb6e">
          <p>Changes to React components trigger automatic rebuilds. The theme refreshes instantly with @shopify/theme-hot-reload.</p>
        </SharedCard>
      </section>
    </main>
  );
}
