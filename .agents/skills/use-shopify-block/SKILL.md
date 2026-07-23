---
name: use-shopify-block
description: Clarify Shopify block types (Theme, Section, App) and their usage patterns. Use when the user asks about Shopify blocks, needs to choose between block types, or confuses block terminology.
allowed-tools: Read
---

# Shopify Blocks — Type Reference

## Terminology Map

The word "block" appears in many contexts in Shopify themes. Here's what each term means and how they relate:

| Term | Category | Meaning |
|---|---|---|
| **Theme Block** | Block type | A block defined as a `.liquid` file in `/blocks/`. One of three block types. |
| **Section Block** | Block type | A block defined inline in a section's `{% schema %}`. One of three block types. |
| **App Block** | Block type | A block provided by a Shopify app. One of three block types. |
| **Dynamic block** | Rendering mode | Rendered via `{% content_for 'blocks' %}`. Merchants can reorder, remove, duplicate. (Theme blocks only) |
| **Static block** | Rendering mode | Rendered via `{% content_for "block", type: "...", id: "..." %}`. Fixed position, can receive data. (Theme blocks only) |
| **Public block** | Visibility | Filename does NOT start with `_`. Visible to `@theme`. (Theme blocks only) |
| **Private block** | Visibility | Filename starts with `_`. Hidden from `@theme`, referenced by exact filename. (Theme blocks only) |

Static/Dynamic and Public/Private are **independent dimensions** — a block can be any combination (e.g., `_slide` rendered statically = private + static).

---

## Overview

Shopify themes have three distinct block types. The word "block" alone is ambiguous — always confirm which type is being discussed before giving advice or writing code.

| | Theme Block | Section Block | App Block |
|---|---|---|---|
| **Defined in** | Separate file in `/blocks/` | Inside a section's Liquid file | Shopify App (installed by merchant) |
| **Scope** | Any section that accepts it | Only within its parent section | Any section/block that accepts `@app` |
| **Nesting** | Yes — blocks can contain other blocks | No — single level only | Yes — can nest inside theme blocks |
| **Coexistence** | Cannot coexist with section blocks in same section | Cannot coexist with theme blocks in same section | Can coexist with theme blocks |
| **Static blocks** | Supported | Not supported | Not supported |

---

## Theme Blocks

Stored as individual `.liquid` files in the `/blocks/` directory.

```text
blocks/
  slide.liquid
  product-card.liquid
  announcement-bar.liquid
  _header-menu.liquid       ← "private" block (see below)
```

**Key characteristics:**
- Reusable — a single block can be added to any section that accepts it
- Nestable — blocks can declare `"blocks"` in their schema to accept child blocks
- Merchants can add, remove, reorder, and hide them in the theme editor
- Dynamic blocks (`{% content_for 'blocks' %}`) cannot receive Liquid variables from parent code — use **static blocks** for that (see below)

### Referencing blocks by name vs `@theme`

A section or parent block can reference child blocks in two ways:

```json
{% schema %}
{
  "name": "Slide",
  "blocks": [
    { "type": "slide" },
    { "type": "product-card" },
    { "type": "@theme" },
    { "type": "@app" }
  ]
}
{% endschema %}
```

| Syntax | Behavior |
|---|---|
| `{ "type": "slide" }` | Exposes only `blocks/slide.liquid` as an option |
| `{ "type": "@theme" }` | Exposes ALL theme blocks whose filename does NOT start with `_` |
| `{ "type": "@app" }` | Exposes all app-provided blocks that are compatible |

### `_` prefix — Private blocks

Blocks whose filename starts with `_` are **private blocks** — they are hidden from `@theme` selection and intended only as dedicated children of a specific parent block.

```text
blocks/
  header.liquid             ← Public (selected via @theme or by name)
  _header-menu.liquid       ← Private — only referenced inside header.liquid
  _header-logo.liquid       ← Private — only referenced inside header.liquid
```

Private blocks are typically used when a parent block needs fixed internal structure that the merchant should not rearrange or expose elsewhere.

**Schema pattern for parent referencing private children:**

```json
{% schema %}
{
  "name": "Header",
  "blocks": [
    { "type": "_header-menu" },
    { "type": "_header-logo" }
  ]
}
{% endschema %}
```

### Static Blocks

Dynamic blocks use `{% content_for 'blocks' %}` to render all child blocks in a single location. This creates two limitations: blocks cannot be split across different DOM positions, and data cannot be passed to child blocks.

Static blocks solve both — they are rendered individually with explicit positioning and optional data:

```liquid
{% content_for "block", type: "slide", id: "slide-1", color: "#111" %}
{#                   ^-- block filename       ^-- unique ID        ^-- arbitrary data  #}
```

| Parameter | Description |
|---|---|
| `type` | The block's filename (e.g., `"slide"` → `blocks/slide.liquid`) |
| `id` (required) | Unique identifier within the **immediate parent**. Used for presets and JSON data. Two static blocks in different parents may share the same `id`. |
| `key: value` | Arbitrary data passed to the child block, accessible as `{{ key }}` in the block's Liquid |

**Example — splitting blocks into different DOM positions:**

```liquid
{# sections/slideshow.liquid #}
<div class="slideshow">
  <div class="slides">
    {% content_for "block", type: "slide", id: "slide-1", accent: "#f00" %}
    {% content_for "block", type: "slide", id: "slide-2", accent: "#0f0" %}
  </div>

  {% if section.blocks.size > 1 %}
    <div class="controls">
      {% content_for "block", type: "_slideshow-controls", id: "static-controls" %}
    </div>
  {% endif %}
</div>
```

The child block accesses passed data with `{{ key | default: ... }}`:

```liquid
{# blocks/slide.liquid #}
<div style="--accent: {{ accent | default: '#333' }}">
  {% content_for 'blocks' %}
</div>
```

**Static vs Dynamic — key differences:**

| | Static (`content_for "block"`) | Dynamic (`content_for 'blocks'`) |
|---|---|---|
| Reorderable (drag/drop) | No | Yes |
| Removable / duplicable | No | Yes |
| Rendered conditionally or in a loop | Yes | No |
| Receives data from parent | Yes | No |
| Counts toward `max_blocks` | No | Yes |
| Included in preset automatically | Yes (default settings) | No (must be listed) |

**Static blocks in presets:**

Static blocks in presets require `"static": true` and must match the `id` from Liquid:

```json
{% schema %}
{
  "name": "Collapsible row",
  "blocks": [{ "type": "@theme" }, { "type": "@app" }],
  "presets": [
    {
      "name": "Collapsible row",
      "blocks": [
        {
          "type": "collapsible-row-summary",
          "static": true,
          "id": "row-summary"
        },
        {
          "type": "group",
          "blocks": [
            { "type": "heading" },
            { "type": "text" }
          ]
        }
      ]
    }
  ]
}
{% endschema %}
```

**In JSON data:** Static blocks carry `"static": true` and are **excluded from `block_order`** (their order is determined by Liquid source order, not merchant reordering).

### Public/Private vs Dynamic/Static

These are **two independent dimensions** — a block can be any combination:

| | Public (`slide.liquid`) | Private (`_slide.liquid`) |
|---|---|---|
| **Dynamic** (`{% content_for 'blocks' %}`) | Reorderable + removable, visible to `@theme` | Reorderable + removable, hidden from `@theme` |
| **Static** (`{% content_for "block" %}`) | Fixed position + receives data, visible to `@theme` | Fixed position + receives data, hidden from `@theme` |

- **Public/Private** controls visibility to `@theme` — a naming convention (`_` prefix).
- **Dynamic/Static** controls rendering flexibility — how the block is placed and whether it receives data.

A `_slideshow-controls` block rendered statically is both private (hidden from `@theme`) and static (cannot be reordered, receives data from parent).

---

## Section Blocks

Defined directly inside a section's `{% schema %}` tag — no separate file.

**Key characteristics:**
- Scoped to a single section — cannot be reused elsewhere
- Single-level only — cannot nest child blocks
- Cannot be used in the same section as theme blocks (mutually exclusive)

**Schema pattern:**

```json
{% schema %}
{
  "name": "Featured Collection",
  "blocks": [
    {
      "type": "product",
      "name": "Product",
      "settings": [...]
    },
    {
      "type": "collection",
      "name": "Collection",
      "settings": [...]
    }
  ]
}
{% endschema %}
```

---

## App Blocks

Provided by Shopify apps installed by the merchant. Themes do not define them — they only declare support.

**Key characteristics:**
- Defined externally by third-party apps
- Enabled in your theme by adding `{ "type": "@app" }` to a section or theme block's `"blocks"` array
- Commonly used for: product reviews, ratings, wishlists, custom forms, etc.
- Works with theme blocks (can nest inside them)

**Schema pattern:**

```json
{% schema %}
{
  "name": "Slide",
  "blocks": [
    { "type": "@theme" },
    { "type": "@app" }
  ]
}
{% endschema %}
```

The `@theme` + `@app` combo is the typical pattern: let merchants insert both theme-defined blocks and app-provided blocks as children.

---

## When to Use Each Type

Use this decision flow to guide block type selection:

- **Need the block reusable across multiple sections?** → Theme Block
- **Need blocks to nest inside other blocks?** → Theme Block
- **Only need it in one section, simple structure?** → Section Block
- **Merchant wants app-provided functionality (reviews, forms, etc.)?** → App Block
- **Already using theme blocks in the section?** → Theme Block (section blocks can't coexist)
- **Already using section blocks in the section?** → Section Block (theme blocks can't coexist)

---

## Theme Blocks vs Snippets

Both help reuse code, but serve fundamentally different purposes:

| | Theme Block | Snippet |
|---|---|---|
| **Settings visible in theme editor** | Yes | No |
| **Merchant can customize each instance** | Yes | No |
| **Can receive variables from parent** | Dynamic: No — Static: Yes (see #static-blocks) | Yes (via `render` or `include` with parameters) |
| **Access to parent section object** | Yes | Limited |
| **Access to global objects** | Yes | Yes |

**When to use which:**
- Use **blocks** for merchant-customizable building blocks (hero banners, product grids, slides)
- Use **snippets** for repeatable markup/logic without customization (price formatting, badge rendering, utility markup)
- Often used together: blocks define the structure/settings, snippets handle the internal rendering logic

---

## AI-Generated Theme Blocks

Shopify Magic can generate blocks from plain text descriptions in the theme editor. These blocks are **theme blocks** in every respect:

- Stored in the `/blocks/` directory
- Follow the same schema and rendering rules
- Can be added to any section that accepts theme blocks
- No special handling needed from a development perspective

---

## Quick Reference

| | Source | Schema | Render |
|---|---|---|---|
| **Theme Block** | `/blocks/*.liquid` | `[{ "type": "@theme" }, { "type": "block-name" }, { "type": "@app" }]` | `{% content_for 'blocks' %}` or `{% content_for "block", type: "...", id: "..." %}` |
| | `_` prefix | `[{ "type": "_block-name" }]` | Private — hidden from `@theme` |
| **Section Block** | In section file | `[{ "type": "...", "name": "...", "settings": [...] }]` | `{% content_for 'blocks' %}` inside its section |
| **App Block** | Shopify App | `[{ "type": "@app" }]` | Auto-rendered by app |
