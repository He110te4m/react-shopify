---
name: react-shopify-hydration
description: Use when debugging React Shopify hydration errors, Liquid bridge mismatches, Shopify media DOM differences, clientOnly browser libraries, Theme Editor reload issues, or multi-instance snippet hydration.
allowed-tools: Read, Grep, Glob, Bash
---

# React Shopify Hydration Debugging

Use this skill when React Shopify theme output renders differently between SSG/Liquid HTML and the first client render.

## Mental Model

Hydration succeeds only if these match:

1. React SSG output containing Liquid placeholders.
2. Shopify server-rendered HTML after Liquid resolves.
3. React's first client render using the bridge values.

If React reads a different value on first client render, or if Shopify owns a DOM subtree React tries to recreate, hydration can fail.

## First Checks

1. Reproduce with browser console open.
2. Identify the component and DOM node named by the hydration warning.
3. Inspect the generated `sections/react-*.liquid`, `blocks/react-*.liquid`, or `snippets/react-*.liquid`.
4. Check whether the differing value comes from Liquid, browser-only state, dates, random values, media tags, or conditional rendering.

## Common Causes

### Liquid Overuse Inside React

Hydration becomes harder to reason about when React components render large Liquid strings instead of JSX.

Bad signs:

- Whole markup regions are injected through `useLiquidCode`.
- Normal component CSS is inside Liquid `{% style %}` instead of CSS files.
- React only acts as a wrapper around Liquid HTML.

Fix:

- Move structure back to JSX.
- Move normal styling back to CSS files.
- Keep only runtime values in `useLiquid`.
- Use CSS custom properties for Liquid-driven style values.

### Liquid Value Not Bridged

Wrong:

```tsx
const heading = "{{ section.settings.heading }}";
```

Right:

```tsx
const [heading] = useLiquid<string>("section.settings.heading");
```

Use `type` for non-string values:

```tsx
const [enabled] = useLiquid<boolean>("section.settings.enabled", { type: "boolean" });
```

### Different HTML And Bridge Expressions

If HTML needs formatted Liquid but React needs JSON-safe data, use `bridge`.

```tsx
const [imageUrl] = useLiquid<string>("section.settings.image", {
  bridge: "{{ section.settings.image | image_url: width: 800 | json }}",
});
```

### Shopify-Owned Media DOM

Do not hydrate over Shopify-generated `image_tag` / `video_tag` output as normal React DOM.

Use:

```tsx
<ShopifyImage image="section.settings.image" />
<ShopifyVideo media="section.settings.video" controls />
```

If plugin media props cannot represent the needed Liquid output, keep that region Liquid-owned until the API is extended.

### Browser-Only Code During SSG

Wrong:

```tsx
import MapWidget from "browser-map-widget";
```

Right:

```tsx
const MapWidget = clientOnly(() => import("./MapWidget.client"));
```

Browser-only code includes module-top access to `window`, `document`, `localStorage`, layout measurement, or custom elements that require DOM.

### Non-Deterministic Values

Avoid these in first render:

- `Date.now()`
- `Math.random()`
- locale formatting that differs between server and browser
- reading viewport width before mount
- reading browser storage before mount

Render a stable fallback first, then update after mount if needed.

### Conditional Rendering From Client State

If a branch depends on browser-only state, do not let it affect first render.

Use a stable SSR-compatible default, or isolate the region with `clientOnly`.

### Adjacent Text And Liquid Placeholders

Hydration can be fragile when static text and dynamic placeholders are split differently.

Prefer one expression:

```tsx
<button>{`-${step}`}</button>
```

over separated text nodes:

```tsx
<button>-{step}</button>
```

## Multi-Instance Snippets

When a React snippet is rendered multiple times in a Liquid loop:

- Confirm each instance gets an isolated hydration root.
- Confirm bridge ids/data do not collide.
- Avoid hardcoded DOM ids.
- Avoid global mutable module state that assumes one instance.

## Theme Editor Reloads

Theme Editor can load, unload, reorder, and re-render sections.

Check:

- Event listeners are cleaned up.
- Custom elements are not defined twice.
- Component initialization is idempotent.
- Block reorder does not depend on array indexes as persistent ids.

## Debugging Order

1. Compare generated Liquid with expected Liquid.
2. Compare Shopify-rendered HTML with React's expected first render.
3. Check `useLiquid` paths and `bridge` expressions.
4. Replace direct media DOM with `ShopifyImage` / `ShopifyVideo` or Liquid-owned islands.
5. Move browser-only code behind `clientOnly`.
6. Stabilize first render by removing dates, random values, viewport reads, and storage reads.
7. Verify in Theme Editor after normal storefront works.

## Done Criteria

- Browser console has no hydration warning/error on first load.
- Hydration remains clean after Theme Editor add/remove/reorder.
- Build and typecheck pass.
- No Shopify-owned DOM subtree is recreated by React without an island boundary.
