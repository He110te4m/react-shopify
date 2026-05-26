import type { ShopifyMeta } from "vite-plugin-react-shopify";

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
        <div className="highlight">
          <h3>React + Shopify</h3>
          <p className="highlight-description">
            Write sections, blocks, and templates as React components. The SSG
            compiler converts them to Shopify Liquid files at build time.
          </p>
        </div>

        <div className="highlight">
          <h3>Type-Safe Schemas</h3>
          <p className="highlight-description">
            Define your Shopify section schema as a TypeScript object using the
            shopifyMeta export. Settings, presets, and blocks are all
            type-checked.
          </p>
        </div>

        <div className="highlight">
          <h3>Hot Reload</h3>
          <p className="highlight-description">
            Changes to React components trigger automatic rebuilds. The theme
            refreshes instantly with @shopify/theme-hot-reload.
          </p>
        </div>
      </section>
    </main>
  );
}
