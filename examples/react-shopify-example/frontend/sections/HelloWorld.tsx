import type { ShopifyMeta } from "vite-plugin-react-shopify";
import SharedCard from "../components/SharedCard/SharedCard";

export const shopifyMeta = {
  name: "Hello World (React)",
  settings: [],
  presets: [
    {
      name: "Hello World React Template",
      category: "Demo",
    },
  ],
} satisfies ShopifyMeta;

export default function HelloWorld() {
  return (
    <main>
      <section className="welcome full-width">
        <div className="welcome-content">
          <div>
            <h1>Hello, World!</h1>
            <p className="welcome-description">
              This section is built with React and compiled to Liquid via
              vite-plugin-react-shopify SSG.
            </p>
          </div>
        </div>
      </section>

      <section className="highlights">
        <SharedCard title="React + Shopify" accentColor="#6c63ff">
          <p>
            Write sections, blocks, and templates as React components. The SSG
            compiler converts them to Shopify Liquid files at build time.
          </p>
        </SharedCard>

        <SharedCard title="Type-Safe Schemas" accentColor="#00b894">
          <p>
            Define your Shopify section schema as a TypeScript object using the
            shopifyMeta export. Settings, presets, and blocks are all
            type-checked.
          </p>
        </SharedCard>

        <SharedCard title="Hot Reload" accentColor="#fdcb6e">
          <p>
            Changes to React components trigger automatic rebuilds. The theme
            refreshes instantly with @shopify/theme-hot-reload.
          </p>
        </SharedCard>
      </section>
    </main>
  );
}
