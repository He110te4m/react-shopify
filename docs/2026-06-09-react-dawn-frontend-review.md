# React Dawn Frontend Review

Date: 2026-06-09

Scope: `examples/react-dawn/frontend/`

Context: review of another model's React Dawn migration work against the `react-dawn-migration` skill constraints.

## Summary

The current `frontend/` migration has systemic quality problems, not isolated defects. The main failure mode is treating Shopify runtime Liquid values as if they were normal React runtime values during SSG. This produces invalid generated Liquid, incorrect HTML structure, broken links, and migration scope drift beyond the approved Dawn migration order.

The generated files must be treated as the source of truth for migration quality. Several issues are already visible in generated `.liquid` output, including `NaNpx`, literal `${section.id}`, and `href="routes.*"`.

## Findings

### P0: Padding Hook Generates `NaNpx`

Source:

- `examples/react-dawn/frontend/hooks/useSectionPadding.ts:10-16`

Problem:

`useSectionPadding` performs JavaScript math on values returned by `useLiquid`. During SSG, those values are Liquid placeholder strings, so `Math.round(pt * 0.75)` becomes `NaN`.

Generated evidence:

- `examples/react-dawn/sections/react-main-page.liquid:20`
- `examples/react-dawn/sections/react-rich-text.liquid:21`
- `examples/react-dawn/sections/react-video.liquid:42`
- `examples/react-dawn/sections/react-image-with-text.liquid:50`

Generated output includes:

```liquid
style="--pt-desktop: {{ section.settings.padding_top }}px;--pt-mobile: NaNpx;--pb-desktop: {{ section.settings.padding_bottom }}px;--pb-mobile: NaNpx;"
```

Fix:

Do not calculate Liquid-derived numeric values in React during SSG. Use Dawn-style Liquid math:

```liquid
{{ section.settings.padding_top | times: 0.75 | round: 0 }}px
```

Options:

- Emit padding style through `useLiquidCode` per section.
- Replace `useSectionPadding` with a hook that returns Liquid expression strings for mobile/desktop CSS variables.

### P0: Image Banner Emits Literal `${section.id}`

Source:

- `examples/react-dawn/frontend/sections/ImageBanner.tsx:97`
- `examples/react-dawn/frontend/sections/ImageBanner.tsx:99`

Problem:

The code uses `.replace(/STARTID/g, "${section.id}")`, which writes the JavaScript template placeholder literally into generated Liquid. CSS selectors do not match real section IDs.

Generated evidence:

- `examples/react-dawn/sections/react-image-banner.liquid:11-12`

Generated output includes:

```liquid
#Banner-${section.id}::before
#Banner-${section.id}::after
```

Fix:

Write Liquid directly:

```liquid
#Banner-{{ section.id }}::before
#Banner-{{ section.id }}::after
```

### P0: Invalid Route URLs

Source:

- `examples/react-dawn/frontend/sections/CollectionList.tsx:110`
- `examples/react-dawn/frontend/sections/CollectionList.tsx:145`
- `examples/react-dawn/frontend/sections/FeaturedBlog.tsx:81`
- `examples/react-dawn/frontend/sections/FeaturedBlog.tsx:180`

Problem:

Routes are written as plain string literals, so generated HTML points to literal paths like `routes.collections_url` and `routes.blog_url`.

Generated evidence:

- `examples/react-dawn/sections/react-collection-list.liquid:31`
- `examples/react-dawn/sections/react-collection-list.liquid:42`
- `examples/react-dawn/sections/react-featured-blog.liquid:31`
- `examples/react-dawn/sections/react-featured-blog.liquid:100`

Generated output includes:

```html
<a href="routes.collections_url">
<a href="routes.blog_url">
```

Fix:

Use Liquid-owned URLs:

```tsx
const [collectionsUrl] = useLiquid<string>("routes.collections_url");
```

or raw Liquid:

```liquid
href="{{ routes.collections_url }}"
```

For featured blog, use the correct Dawn route/setting expression rather than a placeholder string.

### P0: React Branches Depend On Shopify Runtime Liquid Values

Sources:

- `examples/react-dawn/frontend/sections/CollectionList.tsx:94-116`
- `examples/react-dawn/frontend/sections/FeaturedBlog.tsx:68-84`
- `examples/react-dawn/frontend/sections/ImageWithText.tsx:133-189`
- `examples/react-dawn/frontend/sections/CollapsibleContent.tsx:98`
- `examples/react-dawn/frontend/blocks/SlideBlock.tsx:91`

Problem:

During SSG, `useLiquid` returns placeholder strings such as `{{ section.settings.title }}`. React branches like `if (title)`, `showViewAll && ...`, `postLimit < 3`, and `image != null` are evaluated against placeholders, not Shopify runtime values.

This causes fixed generated structure that does not match the Theme Editor state.

Observed effects:

- View-all links are emitted even when controlled by settings.
- Slider classes are emitted based on placeholder truthiness rather than actual settings.
- Image wrappers render as if images always exist.
- Placeholder branches often become unreachable.

Fix:

Do not use React branching for Shopify runtime data unless SSG/client first render equivalence is proven. Use Liquid-owned branches or a controlled runtime API such as a future `LiquidIf`.

### P0: Migration Scope Violates Skill Order

Source tree includes React entries for:

- `CollectionList`
- `FeaturedBlog`
- `Collage`
- `Multirow`
- `Multicolumn`
- `Slideshow`
- `CollapsibleContent`

Problem:

The `react-dawn-migration` skill requires a small, ordered migration path. The current frontend includes many medium/complex sections that were not supposed to be batch migrated.

Risk:

- Many generated sections are unverified.
- Broken generated output may be uploaded to the theme.
- Review cost explodes because unrelated migrations are interleaved.

Fix:

Pause feature migration. Exclude or revert entries outside the approved migration unit. Reintroduce them one section at a time after validation.

### P1: `page.content` Is HTML But Rendered As React Text

Source:

- `examples/react-dawn/frontend/sections/MainPage.tsx:35`
- `examples/react-dawn/frontend/sections/MainPage.tsx:43`

Problem:

`page.content` is Shopify HTML. Rendering it as a normal React child risks escaping or hydration mismatch after bridge JSON data is read on the client.

Generated evidence:

- `examples/react-dawn/sections/react-main-page.liquid:17`
- `examples/react-dawn/sections/react-main-page.liquid:20`

Fix:

HTML/richtext/page content must be Liquid-owned. Use `Island`, a future `LiquidHtml`, or raw Liquid inside a non-reactive boundary.

### P1: Collection List Declares Blocks But Has No `BlockSlot`

Source:

- `examples/react-dawn/frontend/sections/CollectionList.tsx:60`
- `examples/react-dawn/frontend/sections/CollectionList.tsx:128`

Problem:

`shopifyMeta.blocks` declares inline section blocks, but the React tree does not include `BlockSlot`. The build already warns:

```text
shopifyMeta.blocks is declared but no <BlockSlot /> found in the React tree
```

This is also a conceptual mismatch: legacy section blocks are rendered by a raw Liquid loop, while the plugin warning expects Theme Block behavior.

Fix:

Choose one strategy:

- Keep `collection-list` Liquid-owned until collection object/media behavior is validated.
- Add explicit support for legacy section blocks in the plugin/migration pattern.
- Convert to Theme Blocks only after a dedicated spike.

### P1: Large Raw Liquid Strings Bypass Migration Boundaries

Sources:

- `examples/react-dawn/frontend/sections/ImageBanner.tsx:109-143`
- `examples/react-dawn/frontend/sections/FeaturedBlog.tsx:101-170`
- `examples/react-dawn/frontend/sections/CollectionList.tsx:128-139`
- `examples/react-dawn/frontend/sections/CollapsibleContent.tsx:149-161`

Problem:

Large raw Liquid loops/snippet renders are embedded directly in JSX strings. This makes the React file a weak wrapper around opaque Liquid and bypasses type checking, structure review, and the intended migration boundary.

Fix:

Short raw Liquid expressions are acceptable for guards or filters. Full loops/snippet renders should remain in the original Liquid section until a dedicated boundary/component exists.

### P1: Schema Does Not Preserve Dawn i18n And Defaults

Sources:

- `examples/react-dawn/frontend/sections/FeaturedBlog.tsx:9-40`
- `examples/react-dawn/frontend/sections/ImageWithText.tsx:9-99`
- `examples/react-dawn/frontend/blocks/ButtonBlock.tsx:4-24`
- `examples/react-dawn/frontend/blocks/RowBlock.tsx:5-10`
- `examples/react-dawn/frontend/blocks/ColumnBlock.tsx:5`
- `examples/react-dawn/frontend/blocks/ImageBlock.tsx:5`

Problem:

Several schemas use English placeholder labels/defaults instead of Dawn translation keys and original schema metadata.

Examples:

```ts
label: "Image"
label: "Button label"
default: "Button label"
name: "Featured Blog (React)"
name: "Image with Text (React)"
```

Fix:

Schema migration must be line-by-line against the original Dawn schema. Preserve `t:...` labels, defaults, info text, limits, presets, and disabled groups.

### P1: Button Block Breaks Empty Link Semantics

Source:

- `examples/react-dawn/frontend/blocks/ButtonBlock.tsx:29-33`

Problem:

When the link is blank, the block emits `href="#"`. Dawn uses disabled-link semantics for blank links.

Fix:

For blank links, emit:

```html
role="link" aria-disabled="true"
```

Do not emit `href="#"`.

### P2: Unused `useLiquid` Reads Inflate Bridge And Hide Bugs

Examples:

- `examples/react-dawn/frontend/sections/CollectionList.tsx:73` reads `imageRatio` but does not use it.
- `examples/react-dawn/frontend/sections/FeaturedBlog.tsx:53-55` reads `showImage`, `showDate`, `showAuthor`, but raw Liquid rereads them.
- `examples/react-dawn/frontend/sections/ImageBanner.tsx:92-94` computes `fetchPriority` but does not use it.

Fix:

Delete unused reads. Bridge data should be intentional and minimal.

### P2: CSS Overrides Are Not Clearly Justified

Source:

- `examples/react-dawn/frontend/sections/ImageWithText.css:1-8`

Problem:

The migration adds overrides like:

```css
.image-with-text__grid {
  display: flex;
}
```

This can diverge from Dawn's original grid behavior.

Fix:

Prefer loading original Dawn CSS assets. Add minimal overrides only after confirming an actual generated markup mismatch, and document why the override exists.

## Skill Updates Applied

The `react-dawn-migration` skill was updated directly with stricter implementation rules:

- Reject `useLiquid()` runtime branch/class misuse.
- Keep Liquid math Liquid-owned.
- Reject literal `href="routes.*"`.
- Keep HTML/richtext/page content Liquid-owned.
- Limit opaque raw Liquid blobs inside JSX.
- Preserve Dawn schema fidelity.
- Add generated Liquid grep gates.
- Block migration scope drift outside approved order.

## Recommended Fix Queue

### P0

- Fix `useSectionPadding` so generated Liquid has no `NaNpx`.
- Fix `ImageBanner` `${section.id}` selectors.
- Fix all `href="routes.*"` outputs.
- Disable or move out React entries beyond the approved migration unit.

### P1

- Add a guard/lint/test for `useLiquid` branch misuse.
- Make `page.content`, richtext, and page block content Liquid-owned.
- Decide block strategy: legacy section blocks vs Theme Blocks. Do not mix accidentally.
- Reduce large raw Liquid strings or move those sections back to Liquid ownership.
- Restore Dawn schema fidelity.

### P2

- Remove unused `useLiquid` reads.
- Audit and minimize CSS overrides.
- Add generated output snapshots or grep-based CI checks for migrated sections.

## Suggested Runtime/Plugin Follow-ups

Consider adding explicit APIs to make correct migration easier:

- `LiquidIf` for Liquid-owned conditional DOM.
- `LiquidHtml` for Shopify HTML/richtext/page content.
- `LiquidRaw` with naming that makes ownership explicit.
- Optional legacy section-block boundary, if the project intentionally supports migrating sections that still use `section.blocks` loops.

These should be introduced carefully. They should reduce raw string sprawl, not legitimize arbitrary Liquid blobs inside React files.
