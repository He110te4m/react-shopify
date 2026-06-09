---
name: react-shopify-plugin
description: Use when building Shopify themes with vite-plugin-react-shopify, including shopifyMeta, useLiquid, useLiquidCode, BlockSlot, StaticBlock, ShopifyImage, ShopifyVideo, clientOnly, SSG to Liquid output, and assets/chunk handling.
allowed-tools: Read, Grep, Glob, Bash
---

# React Shopify Plugin

Use this skill when writing or reviewing React code that targets Shopify theme output through `vite-plugin-react-shopify`.

This plugin is not a normal Vite SPA setup. React components are SSG-rendered into Shopify Liquid files, Shopify resolves Liquid at request time, and React hydrates on top of the server HTML.

## Design Principle: React First, Liquid Minimal

The purpose of this plugin is to let developers write Shopify themes like React applications while still outputting Shopify-native Liquid files.

Use Liquid only for Shopify runtime boundaries that React cannot know at build time:

- Theme, section, block, product, collection, cart, route, request, and locale values.
- Shopify filters that must run on the server, such as `t`, `money`, `image_url`, or `video_tag`.
- Shopify-owned structures such as `{% form %}`, `{% paginate %}`, app blocks, and complex media DOM.

Do not use Liquid as a shortcut to avoid React work:

- Do not render whole HTML regions through `useLiquid` or `useLiquidCode` when React can own the markup.
- Do not inject complete CSS/style systems through Liquid just because it is faster to port.
- Do not keep Liquid loops/conditionals inside React-owned UI unless the loop context must remain Liquid-owned.
- Do not treat `useLiquidCode` as a general escape hatch.

Preferred pattern: React owns structure and behavior, CSS files own styling, Liquid only supplies dynamic values or Shopify-owned DOM boundaries.

## Core Model

- Source entries live under `frontend/sections`, `frontend/blocks`, `frontend/snippets`, and `frontend/templates`.
- Build output stays Shopify-native: `sections/*.liquid`, `blocks/*.liquid`, `snippets/*.liquid`, `templates/*.liquid/json`, and `assets/*`.
- Initial HTML comes from Shopify Liquid. React only hydrates and handles interactions.
- Liquid values must be read through the plugin bridge, not by inventing custom global data loaders.

## APIs

### `shopifyMeta`

Export `shopifyMeta` from each React entry to generate Shopify schema and wrapper metadata.

Entry kind is inferred from the source directory:

| Source directory | Shopify output |
|---|---|
| `frontend/sections/*.tsx` | `sections/react-*.liquid` |
| `frontend/blocks/*.tsx` | `blocks/react-*.liquid` |
| `frontend/snippets/*.tsx` | `snippets/react-*.liquid` |
| `frontend/templates/*.tsx` | `templates/*.liquid` |

Do not use `shopifyMeta.type` to declare a Theme Block's Shopify block type. A Theme Block's type is its generated block filename, e.g. `frontend/blocks/Heading.tsx` becomes a block reference such as `{ "type": "react-heading" }` depending on the configured output prefix.

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
- Avoid setting `shopifyMeta.type` in normal theme code. It is an internal/output-kind override and is easy to confuse with Shopify block references.
- Snippets do not have Shopify schema metadata. Do not invent snippet-specific `shopifyMeta` fields.

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
- Minimal scoped `{% style %}` blocks only when CSS custom properties cannot be expressed through React inline CSS variables.
- Liquid snippets that do not need to wrap React-owned children.

Bad uses:

- `{% form %}...{% endform %}` around React children.
- `{% paginate %}...{% endpaginate %}` around React-rendered lists.
- Whole `<style>` tags containing normal component CSS.
- Large Liquid-rendered HTML strings that React should render as JSX.
- Large Liquid control flow that should remain Liquid-owned.

### Dynamic Styles

Prefer CSS files plus CSS custom properties.

Good:

```tsx
const [gap] = useLiquid<number>("section.settings.gap", { type: "number" });

return (
  <section className="hero" style={{ "--hero-gap": `${gap}px` } as React.CSSProperties}>
    ...
  </section>
);
```

```css
.hero {
  gap: var(--hero-gap, 24px);
}
```

Acceptable only when media queries or Shopify scoping require it:

```tsx
useLiquidCode(`{%- style -%}
  .section-{{ section.id }} {
    --hero-padding-top: {{ section.settings.padding_top }}px;
  }

  @media screen and (min-width: 750px) {
    .section-{{ section.id }} {
      --hero-padding-top: {{ section.settings.padding_top_desktop }}px;
    }
  }
{%- endstyle -%}`, [
  "section.settings.padding_top",
  "section.settings.padding_top_desktop",
]);
```

Wrong:

```tsx
useLiquidCode(`{%- style -%}
  .hero { display: grid; gap: 24px; }
  .hero__title { font-size: 48px; }
  .hero__button { ... }
{%- endstyle -%}`);
```

Normal component CSS belongs in CSS files, not Liquid.

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

- Declare compatible child blocks in `shopifyMeta.blocks` when using `BlockSlot`.
- In `shopifyMeta.blocks`, `type` means a child block reference: `@theme`, `@app`, or a concrete block filename/type such as `react-heading`. It does not declare the current component's own kind.
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
- Do not port Liquid by wrapping large chunks of Liquid HTML/CSS inside React.
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
