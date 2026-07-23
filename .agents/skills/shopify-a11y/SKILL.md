---
name: shopify-a11y
description: Audit Shopify theme code for accessibility compliance against Shopify's official best practices. Use when reviewing theme code for a11y, implementing accessible theme features, or checking WCAG conformance.
allowed-tools: Read, Grep, Glob, Bash
argument-hint: <file-or-directory>
---

# Shopify Theme Accessibility Audit

Review these files for a11y compliance: $ARGUMENTS

Read files, check against rules below. Terse output. High signal-to-noise.

## Rules

### Global & Page Structure

- `<html lang="…">` set
- No `maximum-scale` / `user-scalable=no` in viewport meta
- Skip link present, focused on main container with `tabindex="-1"`
- No positive `tabindex` values or `autofocus`
- Headings use `<h1>`–`<h6>` in sequence; `<h1>` identifies page topic
- Navigation wrapped in `<nav>`; `aria-current` on active link
- No `role="menu"` / `role="menuitem"` on navigation

### Keyboard & Focus

- Focus indicator visible on all interactive elements (no `outline: none` without replacement)
- Tab order matches DOM order (top→bottom, left→right)
- No mouse-hover-only content or controls
- `Tab` / `Shift+Tab` navigates all controls
- No focus-triggered context changes
- Pinch-to-zoom always available; complex gestures have single-tap alternatives

### Controls (Links & Buttons)

- `<a>` for navigation, `<button>` for actions — no `<div onClick>`
- Link destination clear from text alone
- External links: visual icon + alt text warning about new window

### Drop-down Navigation

- `aria-expanded` on toggle
- `aria-controls` referencing the controlled container
- `aria-current` on active items
- `Enter`/`Space` opens, focus stays on launcher; `Tab` moves to first item
- `Esc` closes and returns focus to launcher

### Product Information

- Product images have descriptive `alt`
- Regular vs sale price visually distinct + visually-hidden text for screen readers
- Dynamic price/availability changes use `aria-live`

### Tables

- Use `<table>` for tabular data
- `<caption>` for table identification
- `<th>` with `scope="col"` / `scope="row"`

### Forms

- Every input has a label (`<label for="…">`, `aria-label`, or visually-hidden)
- Required inputs have `required` attribute
- `autocomplete` on form fields
- Errors: focus moves to error message; `aria-describedby` on input referencing error; `aria-live` for announcements
- Error messages clear and descriptive

### Images & Icons

- All `<img>` have `alt` attribute
- Content images: descriptive `alt`
- Decorative images/icons: `alt=""`
- Decorative icons: `aria-hidden="true"`

### Video & Audio

- No autoplay (or muted if unavoidable, e.g. slideshow)
- Video: closed captions + descriptive audio available
- Audio: transcript available
- `Space` key pauses/resumes

### Color & Contrast

- Text <24px regular / <18.5px bold: 4.5:1 contrast ratio
- Text >=24px regular / >=18.5px bold: 3:1 contrast ratio
- Icons and input borders: 3:1 minimum
- Color is never the only indicator of information

### Drawers & Modals

- Focus moves to drawer/modal label on open
- Keyboard focus trapped inside
- `Esc` closes and returns focus to trigger
- Use `role="dialog"`

### Slideshows

- Auto-playing content can be paused/stopped
- Previous/next buttons always available

### Touch & Mobile

- Primary touch targets >=44x44px (menu links, submit buttons, cart/menu toggles, close buttons, variant options)
- Orientation changes work correctly

### Liquid-Specific

- Dynamic content changes use `aria-live` regions
- `alt` from schema settings must fallback gracefully (`| default:`)
- No `role="menu"` / `role="menuitem"` in Liquid-generated navigation
- Form labels bound via `for` attribute from schema settings

## Output Format

Group by file. `file:line` format.

```text
## sections/header.liquid

sections/header.liquid:12 - nav missing aria-current on active link
sections/header.liquid:35 - menu toggle missing aria-expanded

## blocks/product-form.liquid

blocks/product-form.liquid:8  - input missing label
blocks/product-form.liquid:15 - variant change missing aria-live

## assets/theme.css

assets/theme.css:42 - outline: none without :focus-visible replacement
```

Issue + location. No preamble. Skip explanation unless fix is non-obvious.
