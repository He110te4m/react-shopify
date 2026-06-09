---
name: react-shopify-theme-blocks
description: Use when designing React Shopify Theme Blocks, BlockSlot layouts, StaticBlock fixed children, @theme/@app block support, nested blocks, and Theme Editor add/remove/reorder behavior.
allowed-tools: Read, Grep, Glob, Bash
---

# React Shopify Theme Blocks

Use this skill for React theme blocks and block-based section architecture in Shopify themes.

## Block Types

| Type | Use |
|---|---|
| Section block | Block schema embedded in one section; not reusable outside that section. |
| Theme block | Reusable block entry that merchants can add to compatible sections. |
| App block | Third-party app-provided block rendered by Shopify. |
| Static block | Fixed-position block rendered by parent, not freely reorderable. |

React Shopify theme work should prefer reusable Theme Blocks when multiple sections share heading, text, button, image, card, column, slide, or row patterns.

## Dynamic Blocks With `BlockSlot`

Use `BlockSlot` when the merchant controls add/remove/reorder.

```tsx
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { BlockSlot } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Composable Section",
  blocks: [{ type: "@theme" }, { type: "@app" }],
  presets: [{ name: "Composable Section" }],
} satisfies ShopifyMeta;

export default function Section() {
  return (
    <section className="section-layout">
      <BlockSlot />
    </section>
  );
}
```

Rules:

- `BlockSlot` must match `shopifyMeta.blocks`.
- Include `@app` if app blocks should be allowed.
- Verify add/remove/reorder in Theme Editor.
- Do not use `StaticBlock` for merchant-reorderable content.

## Theme Block Entry

```tsx
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Heading" },
  { type: "select", id: "size", label: "Size", default: "h2", options: [
    { value: "h2", label: "Small" },
    { value: "h1", label: "Large" },
  ]},
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Heading",
  type: "block",
  settings,
} satisfies ShopifyMeta;

export default function HeadingBlock() {
  const [heading] = useLiquid<string>("block.settings.heading");
  const [size] = useLiquid<string>("block.settings.size");
  return <h2 className={size}>{heading}</h2>;
}
```

Rules:

- Read block data from `block.settings.*`.
- Keep block schema local to the block entry.
- Keep DOM portable unless the block is intentionally private to one section.
- Avoid parent-specific class names in public reusable blocks unless the theme's design system requires them.

## Static Blocks

Use `StaticBlock` when the parent needs a fixed child in a fixed location.

```tsx
import { StaticBlock } from "vite-plugin-react-shopify/runtime";

<StaticBlock
  type="react-slideshow-controls"
  id="controls"
  data={{ sectionId: { liquid: "section.id" } }}
/>;
```

Good uses:

- Slider controls.
- Header/menu fixed regions.
- Private children required by a section.
- Liquid-owned DOM that should not be hydrated by React.

Bad uses:

- Merchant-added content.
- Blocks that must be reorderable.
- Arbitrary layout content that belongs in `BlockSlot`.

## Nested Blocks

Nested blocks are powerful but high risk.

Before using nested blocks broadly:

- Build a minimal nested example.
- Verify Shopify Theme Editor add/remove/reorder at each level.
- Verify hydration order has no console errors.
- Verify parent and child bridge data do not collide.
- Avoid relying on array index as identity.

## App Blocks

Allow `@app` when the section is intended to accept merchant-installed app blocks.

```ts
blocks: [{ type: "@theme" }, { type: "@app" }]
```

Do not assume React can inspect or control app block internals. Treat app block DOM as Shopify/app-owned.

## Architecture Guidance

- Sections own layout.
- Blocks own content and settings.
- Shared visual primitives live in React components.
- Shopify-owned DOM uses `BlockSlot`, `StaticBlock`, media components, or explicit Liquid-owned boundaries.

## Verification Checklist

- Block builds to `blocks/react-*.liquid`.
- Parent section builds to `sections/react-*.liquid`.
- Theme Editor can add/remove/reorder dynamic blocks.
- Static blocks render in the intended fixed location.
- Nested blocks hydrate cleanly before the pattern is reused.
- App blocks render without React trying to control their internals.
