---
name: react-shopify-theme
description: Use when developing reusable Shopify themes with React, including React sections, blocks, snippets, Liquid data boundaries, Theme Editor compatibility, CSS strategy, i18n, forms, pagination, and validation.
allowed-tools: Read, Grep, Glob, Bash
---

# React Shopify Theme Development

Use this skill for general React Shopify theme development. These rules are project-independent and should not assume Dawn-specific migration order.

## Goal

Build Shopify themes with React while keeping Shopify-native behavior:

- Theme Editor remains usable.
- Shopify Liquid still renders first HTML.
- Merchants can configure sections and blocks through schema.
- SEO, forms, pagination, locale, and Shopify-owned DOM remain correct.

## Core Principle: React Owns UI

Use React as the default authoring model. Liquid is a runtime data and Shopify-platform boundary, not the primary UI authoring language.

React should own:

- Markup structure that can be expressed as JSX.
- Component composition and conditional UI.
- Client interactions and state.
- Normal component CSS through CSS files.
- CSS custom properties derived from Liquid settings.

Liquid should only own:

- Shopify runtime values unavailable at build time.
- Shopify filters that must run server-side.
- Shopify platform tags such as `{% form %}` and `{% paginate %}`.
- Shopify/app-owned DOM that React should not hydrate.

Avoid “Liquid porting inside React”. If most of a component is a string passed to `useLiquidCode`, the migration has likely failed its goal.

## Recommended Structure

```text
frontend/
├── sections/
├── blocks/
├── snippets/
├── templates/
├── components/
├── hooks/
├── lib/
├── styles/
├── icons/
└── i18n/
```

Rules:

- Put Shopify entrypoints in `sections`, `blocks`, `snippets`, and `templates`.
- Put reusable React-only pieces in `components`, `hooks`, `lib`, `styles`, `icons`, and `i18n`.
- Keep entry files small and schema-driven.

## Data Boundaries

Shopify runtime data is Liquid context, not React build-time data.

Use `useLiquid` for:

- `section.settings.*`
- `block.settings.*`
- `settings.*`
- `product.*`
- `collection.*`
- `page.*`
- `cart.*`
- `routes.*`
- `request.locale.*`
- Shopify translation filters such as `"'key' | t"`

Do not invent `useSectionSettings`, `useBlockSettings`, or `useThemeSettings` unless the project already has a proven abstraction over `useLiquid`.

## Rendering Ownership

Choose ownership per DOM region.

| Region | Recommended owner |
|---|---|
| Simple layout and text | React |
| Merchant-managed section/block schema | React + `shopifyMeta` |
| Shopify image/video tag output | Plugin media components / Liquid-owned island |
| Forms using `{% form %}` | Liquid-owned unless a spike proves React equivalent |
| Pagination using `{% paginate %}` | Liquid-owned |
| SEO/head/meta | Liquid-owned |
| Browser-only third-party widgets | `clientOnly` |

## Sections

When creating a section:

- Export `shopifyMeta` with `name`, `settings`, `blocks`, and `presets` as needed.
- Keep merchant-editable values in schema.
- Use `useLiquid` for runtime values.
- Use `BlockSlot` if merchants can add/reorder child blocks.
- Verify Theme Editor add/remove/reorder.

Minimal section:

```tsx
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

const settings = [
  { type: "text", id: "heading", label: "Heading", default: "Welcome" },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Hero",
  settings,
  presets: [{ name: "Hero" }],
} satisfies ShopifyMeta;

export default function Hero() {
  const [heading] = useLiquid<string>("section.settings.heading");
  return <h2>{heading}</h2>;
}
```

## Blocks

Use theme blocks when content needs to be reusable across sections or merchant-composable.

- Use `type: "block"` or the project-supported `shopifyMeta` block form.
- Read settings with `block.settings.*`.
- Keep block DOM self-contained.
- Avoid hardcoding parent section class names unless the block is intentionally private to that layout.

## Snippets

React snippets are useful for repeated UI pieces, but use them carefully.

Good candidates:

- Icons and simple display fragments.
- Small, repeated UI with stable inputs.
- Cards after data and hydration behavior are validated.

Poor candidates:

- `meta-tags` / SEO head output.
- Liquid pagination controls.
- Complex product forms.
- Snippets rendered inside large Liquid loops before multi-instance hydration has been validated.

## CSS Strategy

- Preserve the theme's existing class naming system when working inside an existing theme.
- Prefer ordinary CSS imports. Do not introduce CSS Modules unless SSR/CSR class stability has been validated.
- Do not duplicate an entire existing global stylesheet into React.
- Keep global theme CSS loaded if existing Liquid sections still depend on it.
- Add only minimal React-specific shared CSS.
- Use CSS custom properties for Liquid-driven values such as spacing, colors, widths, and alignment.
- Do not inject whole style tags through Liquid for normal component styling.
- Use a tiny scoped `{% style %}` only when media queries or Shopify section scoping cannot be represented cleanly through React inline CSS variables.

Preferred dynamic style pattern:

```tsx
const [paddingTop] = useLiquid<number>("section.settings.padding_top", { type: "number" });

return (
  <section
    className="section hero"
    style={{ "--hero-padding-top": `${paddingTop}px` } as React.CSSProperties}
  >
    ...
  </section>
);
```

```css
.hero {
  padding-top: var(--hero-padding-top, 36px);
}
```

Bad pattern:

```tsx
useLiquidCode(`{%- style -%}
  .hero { padding-top: {{ section.settings.padding_top }}px; }
  .hero__content { display: grid; }
  .hero__button { ... }
{%- endstyle -%}`);
```

Only the dynamic value should come from Liquid. The component styling should stay in CSS.

## i18n Strategy

- Schema `name`, `label`, `info`, and Theme Editor text should keep Shopify `t:` keys where the theme uses them.
- Frontend text can use Shopify `t` through `useLiquid("'key' | t")` when it is static per request.
- Use React i18n only for React-only dynamic UI that genuinely needs client-side translation logic.
- Initial locale should come from Liquid, usually `request.locale.iso_code`.
- Do not build a locale generator before there is repeated need.

## Forms And Pagination

Default rule: Shopify form and pagination control flow stays Liquid-owned.

Forms are risky because `{% form %}` handles action URLs, hidden inputs, errors, success state, captcha/bot protection, and Shopify-specific semantics.

Pagination is risky because `{% paginate %}` creates Liquid pagination context and controls list slicing.

Only migrate these if a dedicated spike proves the React version preserves behavior.

## Verification Checklist

- Build and typecheck pass.
- Theme Editor can add, remove, configure, and reorder affected sections/blocks.
- No hydration errors in browser console.
- No unexpected deletion of original theme assets.
- Schema settings and presets match intended merchant behavior.
- No React code assumes Shopify objects exist at build time.
- No browser-only library is statically imported into SSG code.
- No large React-owned markup or component CSS is hidden inside `useLiquidCode`.
