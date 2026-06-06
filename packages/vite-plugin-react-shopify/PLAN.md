# Refactor Plan — Unified React↔Liquid Interop

## Architecture

```
React Component Tree
       │
       ├── useLiquid(path, opts)          ← Scenario 3: Liquid 值 → React state
       │     └── ctx.track() + ctx.read()
       │
       ├── useLiquidCode(code)            ← 原始 Liquid 代码注入
       │     └── ctx.inject()
       │
       └── <Island expression={...} />    ← Scenario 1+2: Liquid 产出 DOM
             └── custom element 隔离水合边界
```

## Two Primitives

### 1. ShopifyContext — 单一通信中枢

| Method | SSR | CSR |
|--------|-----|-----|
| `isSSR` | `true` | `false` |
| `read(path)` | 返回 `{{ expr }}` | 从 bridge 读解析值 |
| `track(path, opts?)` | 注册到 bridge registry | no-op |
| `inject(code)` | 推入 Liquid blocks 队列 | no-op |
| `buildBridge()` | 生成 `<script data-ssg-liquid>` HTML | no-op |

`track` 的 `opts`:
- `bridge?: string` — 自定义 bridge 中的 Liquid 渲染（替代默认 `| json`）
- `type?: 'string'|'number'|'boolean'|'json'|'html'`

复杂场景示例:
```ts
ctx.track('section.settings.image', {
  bridge: '{{ expr | image_url: width: 800 | json }}',
  type: 'string'
})
ctx.track('_lazy', {
  bridge: '{% if section.index < 4 %}true{% else %}false{% endif %}',
  type: 'boolean'
})
ctx.track('_card', {
  bridge: '{% render "product-card", product: product | json %}',
  type: 'html'
})
```

### 2. Island — 统一 hydration 边界

```tsx
function Island({ expression, as, className, style, children })
```

- SSR: `<shopify-island>{{ expression }}</shopify-island>`
- CSR: `<shopify-island></shopify-island>` (空 — React 跳过水合)
- 原理: custom element 对 React 不透明，浏览器保留 Liquid 产出的 DOM
- SEO: Liquid 内容在 light DOM 中，搜索引擎可见

替代: `dangerouslySetInnerHTML` + `suppressHydrationWarning` + `<ssg-slot>`

## API

```ts
// Core
function useShopifyContext(): ShopifyContext
function useLiquid<T>(path: string, opts?: { type?, bridge?, defaultValue? }): [T, Setter<T>]
function useLiquidCode(code: string, trackedExprs?: string[]): void

// Rendering
function Island(props: {
  expression: string     // Liquid expression
  as?: string            // wrapper tag (default 'shopify-island')
  className?: string
  style?: CSSProperties
  children?: ReactNode   // CSR fallback (advanced)
}): ReactElement

// Specialized (uses above primitives internally)
function ShopifyImage(props): ReactElement
function ShopifyVideo(props): ReactElement
```

## MVP Implementation (6 files)

### Runtime (3 files)

1. **`src/runtime/ShopifyContext.ts`**
   - `ShopifyContext` interface
   - React Context creation (`ShopifyContextImpl`)
   - SSR helper: creates globalThis registry, returns context methods
   - CSR helper: reads from LiquidDataProvider (React Context)
   - `useShopifyContext()` hook
   - `buildLiquidBridge()` — assembles JSON bridge from tracked expressions

2. **`src/runtime/Island.tsx`**
   - `Island` component
   - Custom element registration (idempotent, once)
   - SSR: `dangerouslySetInnerHTML` with Liquid expression
   - CSR: empty element (no innerHTML, no children mismatch)

3. **`src/runtime/useLiquid.ts`**
   - `useLiquid<T>(path, opts)` hook
   - Delegates to `useShopifyContext()` for SSR/CSR paths
   - Type coercion: number, boolean, string, json, html
   - `useLiquidCode(code, exprs)` hook — delegates to `ctx.inject()` + `ctx.track()`

### Tests (3 files)

4. **`src/__tests__/mvp-context.test.ts`**
   - ShopifyContext SSR: isSSR, read, track, inject, buildBridge
   - ShopifyContext CSR: read from bridge data
   - useLiquid SSR: returns placeholder, tracks
   - useLiquid CSR: returns parsed value, type coercion
   - useLiquidCode: injects + auto-tracks referenced expressions

5. **`src/__tests__/mvp-island.test.ts`**
   - Island SSR: produces custom element with Liquid content
   - Island CSR: produces empty custom element
   - content_for expression
   - image_tag expression
   - Custom `as` prop
   - CSR fallback children

6. **`src/__tests__/mvp-bridge.test.ts`**
   - bridge with image_url custom expression
   - bridge with conditional Liquid (section.index)
   - bridge with snippet capture (render tag)
   - bridge with multi-line liquid block
   - bridge with mixed simple + custom expressions
   - JSON validity (no trailing commas, proper escaping)
   - Uses existing `assembleLiquidFile` from `src/ssg/liquid-assembler.ts`

## Test Strategy

- Mock React (useContext, useState, useEffect) like existing hooks.test.ts
- Environment: node (no jsdom) — same as existing vitest config
- SSR path: set `globalThis.document = undefined`, set global regstries
- CSR path: set `globalThis.document = {}`, set mock context data
- Bridge tests: direct calls to `buildLiquidBridge()` + `assembleLiquidFile()`

## Proving Points

1. Island unifies hydration boundary — one pattern for all Liquid DOM content
2. track() with bridge option handles all complex Liquid (image_url, conditions, snippets, multi-line)
3. Two primitives coexist in same component without interference
4. CSR code dramatically simplified — Island's CSR path is just `<Tag />`
5. No more manual DOM reconstruction in ShopifyImage/Video CSR
