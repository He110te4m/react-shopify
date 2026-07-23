---
name: react-dawn-migration
description: Use ONLY for the examples/react-dawn Dawn v15.4.1 React migration task, including the current migration plan, Dawn-specific section order, retained Liquid boundaries, asset preservation, and long-running refactor constraints. Do not use for general React Shopify theme development.
allowed-tools: Read, Grep, Glob, Bash, Edit
---

# React Dawn Migration

Use this skill only for the current `examples/react-dawn` migration from Dawn v15.4.1 Liquid to React via `vite-plugin-react-shopify`.

For general React Shopify theme development, use the public skills instead:

- `react-shopify-plugin`
- `react-shopify-theme`
- `react-shopify-theme-blocks`
- `react-shopify-hydration`

## Source Documents

Read these before changing migration code or plans:

- `docs/2026-06-09-theme-react-refactor.md`
- `docs/2026-06-09-react-dawn-migration-plan.md`
- `docs/2026-06-29-section-migration-best-practices.md`

## Current Goal

Migrate Dawn gradually while preserving Shopify-native output and keeping original Liquid files as comparison targets.

Do not batch migrate unrelated sections. Each migration unit should be small, buildable, and manually verifiable in Theme Editor.

## Non-Negotiable Rules

- Keep original Dawn Liquid sections/snippets as comparison targets unless the user explicitly approves deletion.
- Do not clear or replace Dawn `assets/`.
- Do not remove Dawn global scripts until all remaining Liquid paths that depend on them are verified.
- Preserve Dawn BEM class names and visual structure unless the task explicitly changes design.
- Do not introduce CSS Modules.
- Do not migrate `meta-tags.liquid` to React.
- Do not fully migrate `{% form %}` or `{% paginate %}` regions without a dedicated spike.
- Do not treat `page`, `product`, `collection`, `cart`, `routes`, `settings`, `section`, or `block` as build-time data.
- Do not batch migrate unrelated sections or add React entries outside the current approved migration order.
- Do not use `useLiquid()` values from Shopify runtime data to decide React structure, class names, or render branches during SSG unless SSG/client first-render equivalence is explicitly proven.
- Do not run JavaScript math on Liquid placeholder values. Padding, aspect ratios, section index decisions, and responsive CSS calculations must stay Liquid-owned.
- Do not write route placeholders as string literals such as `href="routes.collections_url"`; use `useLiquid("routes.*")` or raw Liquid `{{ routes.* }}`.
- Do not render Shopify HTML content (`page.content`, richtext, `block.settings.page.content`) as a normal React string child. Keep it Liquid-owned via `Island`, raw Liquid, or a dedicated boundary.
- Do not embed full Liquid loops/snippet renders as large opaque JSX strings unless explicitly choosing to keep that region Liquid-owned. Prefer keeping the original Liquid section until a smaller boundary is proven.
- Do not replace Dawn schema labels/defaults/info/presets with English placeholders. Preserve Dawn `t:...` translation keys and schema metadata unless a change is explicitly documented.

## Current Baseline Cleanup

Before real migration work, remove demo/orphan React output and confirm a clean baseline:

- `frontend/sections/TodoList.tsx` is demo-only.
- `sections/react-dawn-smoke-test.liquid` is orphan output.
- `sections/react-todo-list.liquid` is demo output.
- `assets/react-shopify-*` and `snippets/shopify-importmap.liquid` may be generated demo output.

After cleanup, `pnpm build` and `pnpm typecheck` should pass.

## Migration Order

Preferred order:

1. Clean demo/orphan baseline.
2. Build minimal infrastructure under `frontend/`.
3. Spike Theme Blocks, nested `BlockSlot`, and multi-instance snippet hydration.
4. Migrate `main-404` and `main-page`.
5. Create minimal `Heading`, `Text`, and `Button` Theme Blocks.
6. Migrate `rich-text`.
7. Migrate `video` and `image-banner`.
8. Migrate `collection-list` only after collection object/media behavior is verified.
9. Move to medium/complex sections one PR at a time.

## Common Failure Patterns To Reject

### Runtime Liquid Branching In React

During SSG, `useLiquid()` returns Liquid placeholder strings, not real Shopify runtime values. Branches like these are usually wrong:

```tsx
{showViewAll && <a />}
{image != null ? <ShopifyImage /> : <Placeholder />}
postLimit < 3 ? "page-width-tablet" : null
```

Use Liquid-owned conditions instead. If the project needs reusable ergonomics, add a dedicated API such as `LiquidIf` rather than scattering raw conditions through JSX.

### Liquid Math In JavaScript

Do not calculate derived values from Liquid placeholders in React:

```tsx
Math.round(paddingTop * 0.75)
1 / image.aspect_ratio
sectionIndex === 1
```

Use Liquid filters instead:

```liquid
{{ section.settings.padding_top | times: 0.75 | round: 0 }}px
{{ 1 | divided_by: section.settings.image.aspect_ratio | times: 100 }}%
```

### Literal Route Strings

Reject generated output like:

```html
<a href="routes.collections_url">
<a href="routes.blog_url">
```

Use Liquid expressions or `useLiquid()` values for `routes.*`.

### HTML-Owned Content

`page.content`, richtext, page-setting content, and snippet-rendered cards are Shopify/Liquid-owned HTML. Do not render these as normal React text children because client hydration may escape or replace the server-rendered HTML.

### Opaque Raw Liquid Blobs

Small raw Liquid guards/filters are acceptable. Full `{% for %}` loops, `{% render %}` snippets, and large Liquid control-flow blobs inside JSX indicate the migration boundary is too large. Keep that area Liquid-owned or introduce an explicit runtime boundary.

## Dawn-Specific Notes

### `main-404`

Not pure static text. It uses Shopify `t` filter and `routes.all_products_collection_url`.

Use `useLiquid("'templates.404.title' | t")` and similar Liquid expressions rather than introducing React i18n just for this section.

### `main-page`

Uses `page.title`, `page.content`, padding settings, and animation classes. `page.content` is Shopify page context, not a section setting.

### `rich-text`

Depends on three block types: `heading`, `text`, and `button`. Theme Blocks should be verified before this migration.

### Form Sections

`newsletter`, `contact-form`, `footer` newsletter, account/customer forms, and product buy buttons rely on Shopify `{% form %}` semantics. Default to keeping the form Liquid-owned or deferring migration.

### Pagination Sections

`main-collection-product-grid`, `main-search`, `main-blog`, `main-list-collections`, account/order/address sections, and quick order snippets rely on `{% paginate %}`. Keep pagination Liquid-owned.

### Product/Card/Price

`price.liquid` and `card-product.liquid` are high-coupling snippets. They are referenced by collection, search, related products, featured product, and product flows. Spike before replacing public snippets.

## CSS And JS

- Keep Dawn `base.css` globally loaded.
- Import or preserve relevant Dawn section CSS with original class names.
- Add only minimal React shared CSS. Prefer original Dawn CSS assets over ad-hoc overrides.
- Any new CSS override must have a verified generated-markup reason; do not patch layout differences blindly.
- Keep Dawn `global.js` and custom elements while Liquid comparison paths still use them.
- Remove original JS only after the corresponding React replacement and remaining Liquid paths are verified.

### CSS Migration Ownership

- Do not solve missing migrated styles by injecting `{{ 'section-*.css' | asset_url | stylesheet_tag }}` through `useLiquidCode`; that keeps the migration dependent on Liquid assets instead of moving the style ownership to React.
- Copy and adapt the original Dawn section CSS into the React section CSS file. Keep original BEM names unless generated markup requires a documented selector adaptation.
- Treat section CSS as the owner of section layout, including child block spacing and alignment. Theme Block CSS should only contain styles that are intrinsic to the block itself and remain valid outside a specific parent section.
- When a section uses `BlockSlot`, inspect generated Liquid and account for wrapper elements such as `<shopify-block-slot>`, block root wrappers, and hydration containers. Rewrite selectors against stable classes on these generated nodes instead of assuming the original Liquid child structure.
- If adding the original Liquid section makes the React section visually correct, first suspect a missing CSS asset migration or selector ownership issue; do not add a hidden Liquid section or raw stylesheet include as the fix.

## Schema Fidelity

- Compare migrated `shopifyMeta` against the original Dawn `{% schema %}` before calling a section migrated.
- Preserve `t:...` labels, defaults, info fields, limits, presets, `disabled_on`, block names, and block limits.
- For blank links, preserve Dawn disabled-link semantics (`role="link" aria-disabled="true"`) instead of emitting `href="#"`.
- Decide block strategy explicitly: legacy section blocks, Theme Blocks via `BlockSlot`, or app blocks. Do not mix strategies accidentally.

## Required Verification Per Migration Unit

- `pnpm typecheck` passes.
- `pnpm build` passes.
- Generated `sections/react-*.liquid` / `blocks/react-*.liquid` schema matches expected `shopifyMeta`.
- Compare original section CSS selectors against the migrated React section/block CSS and confirm every retained visual rule has an owner.
- Inspect generated Liquid for invalid SSG artifacts before manual testing:
  - No `NaNpx`.
  - No literal `${section.id}` or similar JS template placeholders.
  - No `href="routes.` string literals.
  - No invalid direct `image_tag` input; image output should be guarded and use `image_url | image_tag` when applicable.
  - No React-only decisions that should be Liquid-owned, such as permanently emitted setting-controlled links/classes.
- Theme Editor can add/configure/remove/reorder affected section or blocks.
- Browser console has no hydration errors.
- Visual output is close to Dawn original.
- Original Dawn Liquid file remains unchanged unless explicitly approved.
- Generated React chunks use `react-shopify-` prefix.
- If browser preview is gated by password/auth, state that live DOM/computed-style verification could not be completed instead of guessing.

Useful grep gate after build:

```bash
rg 'NaNpx|\$\{section\.id\}|href="routes\.' examples/react-dawn/sections examples/react-dawn/blocks
rg '\| image_tag:' examples/react-dawn/sections/react-*.liquid examples/react-dawn/blocks/react-*.liquid
```

Review `image_tag` matches manually: valid generated image markup should be guarded for blank images and should normally pipe through `image_url` first.

## Current Review Findings To Address Before More Migration

- Fix `frontend/hooks/useSectionPadding.ts`: it currently produces `NaNpx` in generated Liquid when used with Liquid placeholders.
- Fix `frontend/sections/ImageBanner.tsx`: generated selectors currently contain literal `${section.id}` if written through JS replacement.
- Fix route links in `CollectionList` and `FeaturedBlog`: generated `href="routes.*"` is invalid.
- Pause or remove React entries beyond the approved migration order until each can be migrated and verified individually.
- Keep `page.content`, richtext, and page-setting HTML Liquid-owned.
- Reconcile `CollectionList` block strategy; it currently mixes section-block schema with raw `section.blocks` rendering and no `BlockSlot`.

## When Unsure

Prefer the smaller migration boundary. Keep complex Shopify behavior Liquid-owned until a spike proves the React replacement preserves behavior.
