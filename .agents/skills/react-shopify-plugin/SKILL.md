---
name: react-shopify-plugin
description: Use when building Shopify themes with vite-plugin-react-shopify, including shopifyMeta, useLiquid, useLiquidCode, BlockSlot, StaticBlock, ShopifyImage, ShopifyVideo, clientOnly, SSG to Liquid output, and assets/chunk handling.
allowed-tools: Read, Grep, Glob, Bash
---

# React Shopify Plugin

Use this skill when writing or reviewing React code that targets Shopify theme output through `vite-plugin-react-shopify`.

This plugin is not a normal Vite SPA setup. React components are SSG-rendered into Shopify Liquid files, Shopify resolves Liquid at request time, and React hydrates on top of the server HTML.

## Core Model

- Source entries live under `frontend/sections`, `frontend/blocks`, `frontend/snippets`, and `frontend/templates`.
- Build output stays Shopify-native: `sections/*.liquid`, `blocks/*.liquid`, `snippets/*.liquid`, `templates/*.liquid/json`, and `assets/*`.
- Initial HTML comes from Shopify Liquid. React only hydrates and handles interactions.
- Liquid values must be read through the plugin bridge, not by inventing custom global data loaders.

## APIs

### `shopifyMeta`

Export `shopifyMeta` from each React entry to generate Shopify schema and wrapper metadata.

```tsx
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";

const settings = [
  { type: "text", id: "heading", label: "Heading", default: "Hello" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Hero",
  tag: "section",
  class: "section",
  settings,
  presets: [{ name: "Hero" }],
} satisfies ShopifyMeta;
```

Rules:

- Keep schema labels compatible with Shopify Theme Editor.
- Use Shopify setting types, not custom React config objects.
- Preserve merchant-editable behavior in `settings`, `blocks`, `presets`, `enabled_on`, and `disabled_on`.

### `useLiquid`

Use `useLiquid` for Shopify data and settings.

```tsx
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const [heading] = useLiquid<string>("section.settings.heading");
const [price] = useLiquid<number>("product.price", { type: "number" });
const [url] = useLiquid<string>("routes.all_products_collection_url");
const [label] = useLiquid<string>("'general.continue_shopping' | t");
```

Rules:

- Do not treat Shopify objects as build-time data. `product`, `collection`, `page`, `cart`, `request`, `routes`, `settings`, `section`, and `block` are Liquid/runtime context.
- Use `type: "number"` or `type: "boolean"` when the client needs a non-string value.
- Use `bridge` when the Liquid expression rendered in HTML differs from the JSON value needed by React.

### `useLiquidCode`

Use `useLiquidCode` for standalone Liquid code that does not wrap React children.

```tsx
useLiquidCode(`{%- style -%}
  .section-{{ section.id }} {
    padding-top: {{ section.settings.padding_top }}px;
  }
{%- endstyle -%}`, ["section.settings.padding_top"]);
```

Good uses:

- Standalone `{% liquid %}` calculations.
- Standalone `{% style %}` blocks.
- Liquid snippets that do not need to wrap React-owned children.

Bad uses:

- `{% form %}...{% endform %}` around React children.
- `{% paginate %}...{% endpaginate %}` around React-rendered lists.
- Large Liquid control flow that should remain Liquid-owned.

### `ShopifyImage` and `ShopifyVideo`

Use plugin media components for Shopify media objects.

```tsx
import { ShopifyImage, ShopifyVideo } from "vite-plugin-react-shopify/runtime";

<ShopifyImage image="section.settings.image" widths="375, 550, 750, 1100" sizes="100vw" />
<ShopifyVideo media="section.settings.video" controls />
```

Rules:

- Do not render Shopify image Liquid directly into React `<img src>` / `srcSet`.
- Use `ShopifyImage` so Shopify owns the generated `<img>`, `srcset`, preload, and responsive attributes.
- Use `ShopifyVideo` for Shopify-hosted videos.
- If the exact Dawn/media output cannot be represented, keep that media region Liquid-owned until the plugin API is extended.

### `BlockSlot`

Use `BlockSlot` where a section should render merchant-managed child blocks.

```tsx
import { BlockSlot } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Composable Section",
  blocks: [{ type: "@theme" }, { type: "@app" }],
  presets: [{ name: "Composable Section" }],
} satisfies ShopifyMeta;

export default function Section() {
  return <BlockSlot />;
}
```

Rules:

- Declare compatible blocks in `shopifyMeta.blocks` when using `BlockSlot`.
- Verify Theme Editor add/remove/reorder after implementation.
- For nested blocks, verify hydration order before scaling the pattern.

### `StaticBlock`

Use `StaticBlock` for fixed-position, Liquid-owned blocks that are not reorderable by the merchant.

```tsx
import { StaticBlock } from "vite-plugin-react-shopify/runtime";

<StaticBlock
  type="react-controls"
  id="controls"
  data={{ accent: { liquid: "section.settings.accent_color" } }}
/>;
```

Rules:

- Use for fixed controls, private children, or Shopify-owned DOM islands.
- Do not use when the merchant must freely add/remove/reorder the block; use `BlockSlot` instead.

### `clientOnly`

Use `clientOnly` for browser-only libraries.

```tsx
import { clientOnly } from "vite-plugin-react-shopify/runtime";

const ReviewsWidget = clientOnly(() => import("../components/ReviewsWidget.client"), {
  fallback: <div>Loading reviews...</div>,
});
```

Rules:

- Put browser-only code in `.client.tsx` files or dynamic imports.
- Do not statically import packages that touch `window`, `document`, browser storage, or DOM APIs at module top level.

## Assets And Chunks

- Shopify `assets/` has no nested directories; generated chunks usually go to `assets/` root.
- Use a stable `chunkPrefix`, commonly `react-shopify-`.
- Never clear the whole Shopify `assets/` directory.
- Ignore only generated plugin output, such as `assets/react-shopify-*.js`, `assets/react-shopify-*.css`, and `assets/.vite/`.

## Do Not

- Do not build a separate SPA shell for a Shopify theme page.
- Do not fetch Shopify storefront data just to replace Liquid context already available on the page.
- Do not replace Shopify forms or pagination with React unless a dedicated spike proves the behavior equivalent.
- Do not use CSS Modules unless the project has explicitly validated SSR/CSR class stability.
- Do not delete merchant-facing Liquid output without preserving Theme Editor compatibility.

## Verification

Before calling work complete:

- `pnpm typecheck` passes.
- `pnpm build` passes.
- Generated Liquid schema matches `shopifyMeta`.
- Generated chunks have the configured prefix.
- Browser console has no hydration errors.
- Theme Editor can add/remove/reorder relevant sections and blocks.
