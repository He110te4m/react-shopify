---
name: create-shopify-theme-block
description: Guide for creating Shopify Theme Blocks with proper architecture, code organization, and coding standards. Use when the user needs to create a new theme block in a Shopify theme.
allowed-tools: Read, Write, Bash
---

## Overview

Create theme blocks in `/blocks/` following a strict section ordering (doc → liquid → html → style → stylesheet → `{% javascript %}` → `<script>` → schema). Each section has specific rules about what can and cannot appear in it.

Theme blocks are the most powerful Shopify block type — they support nesting other blocks, static rendering with data passing, and cross-section reuse. If unsure about block types (Theme vs Section vs App), public vs private (`_` prefix), or static vs dynamic rendering, use `/use-shopify-block` first for the terminology reference.

## Workflow

### 1. Understand Requirements

Clarify with the user:
- What data does the block consume? (product, collection, section settings, etc.)
- What DOM zones does it need? (media, content, footer, badges, etc.)
- What settings does the merchant control? (layout, colors, visibility toggles, etc.)
- Does it accept child blocks? If so, which types? (Use `/use-shopify-block` for `@theme` / `@app` / named block type semantics)
- Is the block public (reusable) or private (`_` prefix, tied to a specific parent)? (Use `/use-shopify-block` for public vs private details)

### 2. Plan the Sections

Before writing code, list what goes in each section:

| Section | What to plan |
|---|---|
| `{% doc %}` | Block purpose, execution context, DOM zones, params |
| `{% liquid %}` | All variable defaults, priority chains, computed classes, loop/conditional captures |
| HTML | DOM structure by zone, which `content_for` calls, where capture output renders |
| `{% style %}` | Which liquid values become CSS variables, which differ per breakpoint |
| `{% stylesheet %}` | Layout rules, zone styles, responsive breakpoints |
| `{% javascript %}` | Which shared snippets to import (klaviyo, cart helpers, etc.) |
| `<script>` | Initialization logic, Web Component class or dataset strategy, lifecycle events |
| `{% schema %}` | Settings fields, allowed child blocks, presets with pre-configured blocks |

### 3. Write in Order

Write the file from top to bottom following the section order. Each section has strict rules (see Block Skeleton and Section Details below).

The `{% style %}` tag must appear **before** the HTML root element — not after. The `{% stylesheet %}` tag must appear **after** the HTML root element.

### 4. Verify

Check before finishing:
- [ ] No liquid in `<script>` tag (no `{{ }}`, no `{% %}`)
- [ ] No liquid logic (`{% if %}`, `{% for %}`, `{% unless %}`, `assign`, `| append:`) in HTML section
- [ ] Loop output uses `capture` in `{% liquid %}` block
- [ ] Same CSS variable name across breakpoints (overridden, not duplicated)
- [ ] `shopify:section:load` and `shopify:section:unload` listeners registered
- [ ] `init()` is idempotent — calls `destroy()` first
- [ ] At least one preset with pre-configured child blocks
- [ ] Static blocks in presets use `"static": true` and match the `id` from `content_for`

## Block Skeleton

This is the order and shape every theme block follows. Copy this structure as a starting point.

The complete skeleton with all 8 sections — `{% doc %}`, `{% liquid %}`, HTML (`<my-block>` root with Web Component), `{% style %}`, `{% stylesheet %}`, `{% javascript %}`, `<script>`, and `{% schema %}` — is at [examples/skeleton.liquid](examples/skeleton.liquid). Read it when you need the full starting template.

## Section Details

### 1. `{% doc %}` — Documentation

Document the block for future developers. Use JSDoc-style annotations.

See [examples/doc.liquid](examples/doc.liquid) for a complete `{% doc %}` example. No strict format required, but describe the block's role, context, DOM structure, and parameters.

### 2. `{% liquid %}` — All Liquid Logic

**This is the ONLY place for liquid logic.** The HTML section must not contain `{% if %}`, `{% for %}`, `{% unless %}`, `assign`, or string concatenation with `| append:`.

**What belongs here:**

| Operation | Example |
|---|---|
| Variable defaults | `assign val = bs.foo \| default: 'fallback'` |
| Priority chains | `assign cur = bs.product \| default: prod \| default: product` |
| Computed class names | `assign cls = 'card--' \| append: layout` |
| Price / metafield math | `assign cents = raw \| plus: 0` |
| Conditional HTML → capture | `capture html` … `if` / `for` … `endcapture` |
| Loop HTML → capture | `capture html` … `for` … `endcapture` |

**Rules:**
- Use **one** `{% liquid %}` block. Multiple blocks have undefined execution order.
- Never `echo` directly — use `assign` for values, `capture` for HTML output.
- Capture names should describe what they contain: `badge_html`, `tags_html`, `footer_html`.

**Capturing conditional content for HTML:**

See [examples/liquid-capture.liquid](examples/liquid-capture.liquid) for complete examples of `capture` blocks for conditional content (`if`/`endif`) and loop content (`for`/`endfor`).

Using `capture` for all conditional/loop output keeps HTML clean and logic-free.

### 3. HTML — DOM Structure

Organize into functional zones using BEM-like class naming. Output liquid variables and captured content only — **no liquid logic**.

See [examples/html-zones.liquid](examples/html-zones.liquid) for the full HTML structure with `content_for` (static and dynamic), zone divs, and capture output rendering.

**Rules:**
- **No** `{% if %}`, `{% unless %}`, `{% for %}`, `assign`, `| append:`, or any string building
- All conditional rendering goes through `capture` in the `{% liquid %}` block
- All loop rendering goes through `capture` in the `{% liquid %}` block
- `{{ block.shopify_attributes }}` **must** be on the root element
- `data-section-id="{{ section.id }}"` on the root element for JavaScript to scope events
- Use `{%- ... -%}` whitespace control on `content_for` to avoid blank lines
- `content_for "block"` (static) takes `type` + `id` + optional data params
- `content_for 'blocks'` (dynamic) renders all reorderable child blocks
- For the full comparison table (reorderable vs fixed, data passing, preset behavior), use `/use-shopify-block`

### 4. `{% style %}` — Liquid-to-CSS Bridge

Passes liquid values into CSS custom properties. For multi-device values, use media queries to **override the same variable name** — never create separate names like `--gap-mobile` and `--gap-desktop`.

See [examples/style.liquid](examples/style.liquid) for the complete pattern: mobile defaults + desktop overrides using the same variable names.

**Rules:**
- Same variable name across breakpoints — override the **value**, not the name
- Always provide `| default:` fallbacks for every liquid value
- Scope to `#{{ el_id }}` to avoid leaking styles to other blocks
- Unitless number settings must have the unit appended: `{{ val }}px`
- This tag must appear **before** the HTML root element

**Wrong:**
```css
--my-gap-mobile: 8px;   /* Don't create separate names */
--my-gap-desktop: 16px; /* Override the same name instead */
```

**Why:** Using the same variable name means `{% stylesheet %}` references one variable. If you later want three breakpoints instead of two, the stylesheet needs no changes — only this block changes.

### 5. `{% stylesheet %}` — Shared CSS

Pure CSS. **No liquid allowed.** Shopify extracts this as an independent, cacheable file with automatic minification.

See [examples/stylesheet.liquid](examples/stylesheet.liquid) for the full pattern including zone styles, responsive breakpoints, and `var()` fallback usage.

**Rules:**
- No `{{ }}`, no `{% %}`, no liquid of any kind
- Reference settings through `var(--custom-property, fallback)` only
- Always provide a fallback value in `var()`: `var(--my-gap, 16px)`
- Use the same CSS variables defined in `{% style %}`
- This tag must appear **after** the HTML root element

### 6. `{% javascript %}` — Shared Dependencies

Use `{% render %}` inside this tag to include shared snippet scripts. Shopify de-duplicates this tag — even if the block renders 10 times on a page, the JavaScript inside `{% javascript %}` executes only once.

```liquid
{%- javascript -%}
  {% render 'klaviyo-init' %}
  {% render 'cart-helpers' %}
{%- endjavascript -%}
```

**Rules:**
- Only for importing shared dependencies — no block-specific logic
- Useful for: analytics (Klaviyo), cart API wrappers, shared utility functions
- The de-duplication makes this ideal for scripts injected by multiple block instances
- This tag can appear anywhere, but placing it before `<script>` ensures dependencies load first

**Do NOT confuse with the `<script>` tag** — `{% javascript %}` is a Liquid tag that supports `{% render %}` inside it. The bare `<script>` HTML tag does NOT support liquid.

### 7. `<script>` — Component JavaScript

Block-specific initialization. **No liquid allowed** inside `<script>`. Parameters pass via **Web Component OR `dataset`** — pick one strategy, never both.

#### Web Component Strategy (recommended for complex blocks)

Define a custom element class. The root HTML element uses the custom tag name.

See [examples/web-component-strategy.md](examples/web-component-strategy.md) for the full pattern: HTML root as `<my-block>`, JS class with `connectedCallback`/`disconnectedCallback`, `init()`/`destroy()` lifecycle, and `shopify:section:load`/`unload` event listeners.

#### Dataset Strategy (for simpler blocks)

Use `data-*` attributes on a plain element. JS reads from `element.dataset`. Do NOT define a custom element.

See [examples/dataset-strategy.md](examples/dataset-strategy.md) for the full IIFE pattern with `querySelectorAll`, `shopify:section:load`/`unload` listeners, and idempotent `init()` calling `destroy()` first.

**Rules for both strategies:**
- **No liquid** — no `{{ }}`, no `{% %}` inside `<script>`
- Choose ONE strategy per block — never mix Web Component + dataset
- Always listen for `shopify:section:load` (re-init on editor changes)
- Always listen for `shopify:section:unload` (cleanup to prevent editor memory leaks)
- Use `event.detail.sectionId` to scope events to the correct section
- `init()` must be idempotent — call `destroy()` at the start to clean previous state
- Guard `customElements.define()` with `if (!customElements.get(...))` to prevent re-definition errors during editor re-renders

### 8. `{% schema %}` — Settings and Presets

Define configurable settings and presets. Presets give merchants pre-configured starting points.

See [examples/schema.liquid](examples/schema.liquid) for the full `{% schema %}` block with settings, `@theme`/`@app` child blocks, and multiple presets with static blocks.

**Rules:**
- `"tag": null` unless the block wraps in a semantic HTML tag
- Group settings under `"type": "header"` for logical sections in the editor
- Use `"info"` for helpful descriptions visible in the editor
- Use `"visible_if"` to conditionally show settings: `"visible_if": "{{ block.settings.layout == 'horizontal' }}"`
- `"blocks"`: include both `@theme` and `@app` for merchant flexibility; list specific block types by filename for private/required children. Use `/use-shopify-block` for the full `@theme` vs `@app` vs named type reference.
- Static blocks in presets require `"static": true` and the `"id"` must match the `content_for` id in the HTML section. For more on static blocks (data passing, exclusions from `block_order`), use `/use-shopify-block`.
- Dynamic product references: `"{{ closest.product.featured_image }}"`, `"{{ closest.product.title }}"`

#### Multiple Presets for Different Use Cases

Provide presets for common configurations to simplify merchant setup. See [examples/presets-multiple.md](examples/presets-multiple.md) for an example with landscape and portrait variants.

## Key Reminders

- `{% style %}` before HTML, `{% stylesheet %}` after HTML
- No liquid in `<script>` or `{% stylesheet %}`
- No `{% if %}`, `{% for %}`, `assign`, `| append:` in HTML — use `capture`
- Same CSS variable name across breakpoints — override value, not name
- `{% javascript %}` ≠ `<script>` — only `{% javascript %}` supports `{% render %}`
- `init()` calls `destroy()` first → idempotent and safe for double-invoke
- `data-section-id="{{ section.id }}"` on root element for JS event scoping
- `!customElements.get(...)` guard before `customElements.define()`
- At least one preset with pre-configured blocks
- Static blocks in presets: `"static": true` + matching `"id"`
