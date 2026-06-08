# vite-plugin-react-shopify 架构设计

`vite-plugin-react-shopify` 让 Shopify 主题用 React 编写 Section、Block、Snippet 和 Template。它不是把 React 应用直接部署到 Shopify，而是在构建时把 React 树预渲染成 Liquid 模板，再让 Shopify Liquid 在服务端填充真实数据，最后由浏览器端 React 对可交互部分执行 hydration。

本文描述当前实现，而不是早期 MVP 计划。

## 目标

- React 负责组件组织、TypeScript 类型、交互逻辑和构建生态。
- Liquid 负责 Shopify 数据、schema、section/block/snippet/template 运行环境。
- 构建产物保持 Shopify 主题原生形态：`.liquid`、`assets/*.js`、`snippets/*.liquid`。
- Hydration 尽量稳定，避免 Liquid 服务端渲染结果和 React 首次客户端 render 不一致。
- 对 Liquid-owned DOM 使用 island 隔离，避免 React 在 hydration 时替换 Shopify 生成的复杂 DOM。

## 总览

```text
React source (.tsx)
  │
  ├─ Vite build
  │   ├─ browser entry chunks
  │   ├─ CSS assets
  │   └─ manifest.json
  │
  ├─ SSG render in Node
  │   ├─ renderToStaticMarkup(Component)
  │   ├─ track Liquid expressions
  │   ├─ collect Liquid code blocks
  │   └─ collect island placeholders
  │
  └─ Liquid assembly
      ├─ sections/react-*.liquid
      ├─ blocks/react-*.liquid
      ├─ snippets/react-*.liquid
      ├─ snippets/css-*.liquid
      └─ snippets/shopify-importmap.liquid

Shopify request
  │
  ├─ Liquid renders data and island DOM
  └─ Browser loads entry script
      ├─ read JSON bridge
      ├─ capture island DOM without mutating it
      └─ hydrateRoot(...)
```

核心分层：

| 层 | 目录 | 职责 |
|----|------|------|
| Vite 插件层 | `src/core/` | 配置注入、入口扫描、虚拟 hydration entry 生成 |
| SSG 层 | `src/ssg/` | 扫描、esbuild bundle、SSR render、Liquid 组装、CSS 分析 |
| Runtime 层 | `src/runtime/` | `useLiquid`、`Island`、`BlockSlot`、`ShopifyImage`、`ShopifyVideo` |
| 类型层 | `src/types/` | 插件配置、Shopify schema、setting 类型 |
| 验证层 | `src/validate/` | `shopifyMeta` 和 `BlockSlot` 使用约束 |
| 修复层 | `src/hydration-fix/` | JSX 相邻文本和表达式的自动修复 |

## Vite 插件组成

`src/index.ts` 返回四个子插件：

```text
vitePluginShopify(options)
  ├─ hydrationFix   vite-plugin-shopify:hydration-fix
  ├─ shopifyConfig  vite-plugin-shopify:config
  ├─ shopifyEntries vite-plugin-shopify:entries
  └─ shopifySSG     vite-plugin-shopify:ssg
```

### `hydrationFix`

文件：`src/hydration-fix/vite-plugin.ts`

职责：在构建和 SSG bundle 阶段修复 JSX 中相邻文本与 Liquid 表达式造成的 hydration 风险。

### `shopifyConfig`

文件：`src/core/config.ts`

职责：给用户项目注入适合 Shopify theme 的 Vite 默认配置。

关键配置：

- `build.outDir` 默认是 `{themeRoot}/{buildDir}`，默认 `assets`。
- `build.assetsDir` 默认空字符串，避免在 Shopify `assets/` 里再嵌套一层。
- `build.manifest` 默认开启，SSG 依赖 manifest 查找 entry chunk 和 CSS。
- `manualChunks` 将 `react` 和 `react-dom` 拆成稳定 chunk，配合 importmap 复用。
- `resolve.alias` 提供 `~` 和 `@` 指向 `sourceCodeDir`。

### `shopifyEntries`

文件：`src/core/entries.ts`、`src/core/entry-template.ts`

职责：扫描 React 入口文件，为每个 entry 注册一个 Vite 虚拟模块。

入口文件来自：

```text
frontend/sections/*.tsx   -> section
frontend/blocks/*.tsx     -> block
frontend/snippets/*.tsx   -> snippet
frontend/templates/*.tsx  -> template
```

虚拟模块负责浏览器端 hydration：

- 找到当前组件 wrapper：`[data-ssg-component="{kebabName}"]`
- 读取当前 wrapper 直属的 JSON bridge：`:scope > script[data-ssg-liquid]`
- 捕获当前 hydration root 内的 island DOM。
- 调用 `hydrateRoot()`。
- 响应 Shopify 编辑器事件：`shopify:section:load` / `shopify:section:unload`。

### `shopifySSG`

文件：`src/ssg/index.ts`

职责：Vite build 完成后执行 SSG 编译。

它在 `closeBundle` 阶段读取 manifest，然后调用 `compileAllEntries()`：

```text
manifest.json
  -> scan entries
  -> analyze CSS distribution
  -> bundle entry for Node SSR
  -> render React to static HTML
  -> assemble Liquid file
  -> write generated .liquid files
  -> write importmap snippet
```

## SSG 编译流水线

### 1. 扫描入口

文件：`src/ssg/scanner.ts`

扫描 `sourceCodeDir` 下配置的目录，生成 `SSGEntry`：

```ts
type SSGEntry = {
  filePath: string;
  componentName: string;
  kebabName: string;
  targetType: "section" | "block" | "snippet" | "template";
  meta: ShopifyMeta;
};
```

`kebabName` 同时用于：

- 生成 Liquid 文件名。
- 生成虚拟 entry id。
- 生成 `data-ssg-component`。
- 从 Vite manifest 找 entry chunk。

### 2. Browser bundle

Vite 正常构建浏览器 bundle。每个 React entry 都会有一个对应的 hydration JS 文件。

React 和 ReactDOM 被拆到稳定文件：

```liquid
<script type="importmap">
{
  "imports": {
    "react": "{{ 'react.js' | asset_url }}",
    "react-dom/client": "{{ 'react-dom.js' | asset_url }}"
  }
}
</script>
```

该 snippet 由 `src/core/options.ts` 和 `src/ssg/index.ts` 生成，默认输出到 `snippets/shopify-importmap.liquid`。

### 3. CSS 分析

文件：`src/ssg/css-manager.ts`

CSS 从 Vite manifest 中读取。策略：

- 单 entry 引用的 CSS 内联到该 entry 的 Liquid 文件。
- 多 entry 共享的 CSS 提取为 `snippets/css-*.liquid`。

生成的 CSS snippet 使用 Shopify 的 `{% stylesheet %}`：

```liquid
{% stylesheet %}
.shared-card { display: grid; }
{% endstylesheet %}
```

### 4. Node SSR bundle

文件：`src/ssg/bundler.ts`

SSG 需要在 Node 中执行 React 组件，因此每个 entry 会被 esbuild 单独打包成临时 ESM 文件。

关键点：

- 使用用户项目里的 `esbuild`，避免插件内置版本和项目冲突。
- 外部化 `react`、`react-dom` 和插件 runtime。
- CSS import 在 Node SSR 中被替换为空模块。
- JSX 相邻文本修复通过 `hydration-fix` 在 load 阶段执行。

### 5. React SSR render

文件：`src/ssg/renderer.ts`

SSR 前会设置一组 `globalThis` registry：

| key | 用途 |
|-----|------|
| `__shopify_ssg_target` | 当前 entry 类型 |
| `__shopify_ssg_liquid_track` | 兼容旧追踪集合 |
| `__shopify_ssg_tracked` | 当前表达式和 bridge options |
| `__shopify_ssg_liquid_blocks` | `useLiquidCode()` 注入的 Liquid 代码块 |
| `__shopify_ssg_island_counter` | SSG 阶段 island 顺序 key |

然后执行：

```ts
renderToStaticMarkup(createElement(Component));
```

SSR 输出 HTML 后会做后处理：

- 规范 void elements。
- 规范 inline style。
- 反转 React 转义过的 Liquid 字符。

### 6. Liquid 组装

文件：`src/ssg/liquid-assembler.ts`

每个 entry 输出一个 Shopify 原生 Liquid 文件。

Section 输出结构：

```liquid
<div data-ssg-component="hello-world">
  <script type="application/json" data-ssg-liquid>
  {
    "section.settings.title": {{ section.settings.title | json }}
  }
  </script>

  <div data-ssg-h>
    ...SSR HTML...
  </div>
</div>

<script type="module" src="{{ 'hello-world-abc123.js' | asset_url }}"></script>

{% schema %}
...
{% endschema %}
```

Block 输出结构：

```liquid
{%- doc -%}
  @name Block name
  @context theme-block
{%- enddoc -%}

<div id="{{ block.id }}" data-ssg-component="text-block" {{ block.shopify_attributes }}>
  <script type="application/json" data-ssg-liquid>...</script>
  <div data-ssg-h>...</div>
</div>
```

Snippet 输出结构：

```liquid
<div data-ssg-component="product-card">
  <script type="application/json" data-ssg-liquid>...</script>
  <div data-ssg-h>...</div>
</div>
```

Snippet 不生成 schema。是否生成 script 取决于是否存在对应 browser entry asset。

## Runtime 架构

Runtime 入口：`src/runtime/index.ts`

当前公共能力：

- `useLiquid()` / `useLiquidCode()`
- `Island`
- `BlockSlot`
- `ShopifyImage`
- `ShopifyVideo`
- `LiquidDataProvider` / `LiquidDataContext`

### ShopifyContext

文件：`src/runtime/ShopifyContext.ts`

`ShopifyContext` 是 SSG 和浏览器端的统一抽象：

```ts
type ShopifyPhase = "ssg" | "hydrating" | "mounted";

interface ShopifyContext {
  phase: ShopifyPhase;
  read(path: string): unknown;
  track(path: string, opts?: TrackOptions): void;
  inject(code: string): void;
}
```

SSG 阶段：

- `read(path)` 返回 `{{ path }}`。
- `track(path, opts)` 记录 bridge 需要输出的 Liquid 表达式。
- `inject(code)` 把原始 Liquid 代码加入当前 entry。

浏览器阶段：

- `read(path)` 从 `LiquidDataContext` 读取 Shopify 已经渲染并 JSON 序列化后的值。
- `track()` 和 `inject()` 是 no-op。

### useLiquid

文件：`src/runtime/useLiquid.ts`

`useLiquid()` 是 React 读取 Liquid 数据的主 API。

SSG：

```ts
const [title] = useLiquid("section.settings.title");
// title === "{{ section.settings.title }}"
```

Liquid bridge：

```liquid
<script type="application/json" data-ssg-liquid>
{
  "section.settings.title": {{ section.settings.title | json }}
}
</script>
```

浏览器首 render：

```ts
const [title] = useLiquid("section.settings.title");
// title === bridgeData["section.settings.title"]
```

`useLiquid()` 支持类型转换：

- `string`
- `number`
- `boolean`
- `json`
- `html`

也支持自定义 bridge：

```ts
const [imageUrl] = useLiquid("section.settings.image", {
  type: "string",
  bridge: "{{ section.settings.image | image_url: width: 800 | json }}",
});
```

### useLiquidCode

`useLiquidCode()` 用于把原始 Liquid 代码注入到生成文件中，并可附带追踪表达式。

```ts
useLiquidCode(`{%- liquid
  assign is_eager = section.index < 4
-%}`, ["section.index"]);
```

## Island 架构

Island 解决的问题：React SSG 阶段只能输出 Liquid 表达式，不能知道 Shopify Liquid 最终会生成什么 DOM。典型例子：

```liquid
{{ section.settings.image | image_url: width: 1200 | image_tag }}
```

这个表达式最终可能生成完整 `<img>`，包含 `srcset`、`sizes`、`width`、`height`、`loading` 等属性。React 在 SSG 阶段无法复刻这些 DOM。如果浏览器端 React 用空节点或不同 DOM hydrate，就会出现 mismatch、DOM 替换、reflow 或闪烁。

当前实现采用 **non-mutating DOM capture island**：hydration 前只读取 Liquid 已渲染的 DOM 字符串，不把页面上的 DOM 替换成占位符。

### 核心不变量

- SSG 和客户端 island 顺序必须一致。
- 每个 island 有稳定 `data-ssg-i` key。
- hydration 前不得清空或替换 Liquid 已渲染 DOM。
- 客户端首 render 必须输出和当前 DOM 等价的 `dangerouslySetInnerHTML`。
- Island 内部 DOM 属于 Liquid/Shopify，不属于 React。
- Island hydrate 后通过 `React.memo(() => true)` 永久跳过后续 re-render。

### SSG 阶段

文件：`src/runtime/Island.tsx`

`Island` 在 SSG 阶段递增全局 counter，输出带 key 的 custom element：

```html
<shopify-island data-ssg-i="i0">
  {{ section.settings.image | image_url: width: 1200 | image_tag }}
</shopify-island>
```

这里的 `{{ ... }}` 仍然是 Liquid 表达式。React SSG 完成后，它会被写进 `.liquid` 文件。

### Shopify Liquid 阶段

Shopify 服务端请求页面时会执行 Liquid，最终浏览器收到的是：

```html
<shopify-island data-ssg-i="i0">
  <img src="..." srcset="..." width="1200" height="800" loading="lazy">
</shopify-island>
```

此时页面已经能正常显示，但还没有 React 交互能力。

### Hydration 前捕获

文件：`src/core/entry-template.ts`

每个 hydration entry 在调用 `hydrateRoot()` 前执行 `captureIslands(h)`：

```js
function captureIslands(el) {
  const nodes = el.querySelectorAll('[data-ssg-i]');
  const alsoSelf = el.matches && el.matches('[data-ssg-i]');
  const all = alsoSelf ? [el, ...nodes] : Array.from(nodes);
  const html = {};

  for (const node of all) {
    if (node.closest('[data-ssg-h]') !== el) continue;
    const key = node.getAttribute('data-ssg-i');
    if (!key || html[key] !== undefined) continue;
    html[key] = node.innerHTML;
  }

  return html;
}
```

重点：这个函数只读 `innerHTML`，不写 `innerHTML`。

捕获结果放进当前 hydration root 的 provider value：

```js
const liquidData = readLiquidData(el);
liquidData.__ssg_islands = captureIslands(h);
liquidData.__ssg_island_counter = { count: 0 };

hydrateRoot(h,
  createElement(LiquidDataProvider, { value: liquidData }, createElement(Component))
);
```

这样同一页面多个相同 section 各自有独立 island map，`i0` 不会跨 section 冲突。

### 客户端首 render

`Island` 浏览器端从 `LiquidDataContext` 读取 captured HTML：

```ts
const counter = liquidData.__ssg_island_counter ?? { count: 0 };
const key = `i${counter.count++}`;
const html = liquidData.__ssg_islands?.[key] ?? "";

return createElement("shopify-island", {
  "data-ssg-i": key,
  suppressHydrationWarning: true,
  dangerouslySetInnerHTML: { __html: html },
});
```

React hydrate 时看到的 virtual DOM 和浏览器当前 DOM 等价，因此不需要把真实 DOM 替换成占位符，也不会因为 island 本身引发 reflow。

### 为什么不用空 island

早期设计考虑过客户端渲染空节点：

```html
<shopify-island></shopify-island>
```

这个方案不能保证 React hydration 不处理内部 DOM。React 仍可能发现 server/client children 不一致并替换内容。对于图片、视频、子 block 这种会影响布局的 DOM，替换会导致闪烁和 CLS。

当前方案选择“客户端首 render 复用真实 HTML”，而不是“客户端空 island”。

### 为什么不用 sentinel 替换

另一个方案是 hydration 前将 island DOM 替换为 `__SSG_ISLAND__`，再在 `useLayoutEffect` 中恢复。该方案能让 React 首 render 精确匹配 sentinel，但会在用户可见页面上先删除真实 DOM，再恢复，图片和 block 会产生明显 reflow。

当前实现明确避免 hydration 前 DOM mutation。

## BlockSlot 架构

文件：`src/runtime/BlockSlot.tsx`

`BlockSlot` 是 Section 内声明 child blocks 插入位置的 React 组件。

SSG 输出：

```liquid
<shopify-block-slot data-ssg-i="__blocks__">
  {% content_for 'blocks' %}
</shopify-block-slot>
```

Shopify 渲染后，`{% content_for 'blocks' %}` 会变成 child block DOM。该 DOM 同样是 Liquid-owned DOM，不应由父 Section 的 React render 重新生成。

因此 `BlockSlot` 复用 island capture 机制，但使用固定 key：

```text
data-ssg-i="__blocks__"
```

客户端首 render：

```tsx
<shopify-block-slot
  data-ssg-i="__blocks__"
  dangerouslySetInnerHTML={{ __html: capturedBlocksHtml }}
/>
```

父 Section hydrate commit 后，`BlockSlot` 派发：

```js
new CustomEvent("ssg:blocks:ready", { bubbles: true })
```

被 Section 管理的 child block entry 使用 listen 模式，等待这个事件后再扫描并 hydrate 自己。这样可以保证：

- 父 Section 先 hydrate。
- Shopify child blocks DOM 已经稳定存在。
- 子 Block 再 hydrate 自己的 root。
- Section bridge 和 Block bridge 不互相读取。

## ShopifyImage / ShopifyVideo

`ShopifyImage` 和 `ShopifyVideo` 是 `Island` 的专用封装。

`ShopifyImage` 在 SSG 阶段拼接 Liquid image filter：

```liquid
{{ section.settings.image | image_url: width: 1200 | image_tag: loading: 'lazy' }}
```

它还可以注入自动 eager/lazy 逻辑：

- `section.index < 4` 时 eager/high/preload。
- `section.index < 8` 时 medium priority。
- 其他情况 lazy/low。

浏览器端 `ShopifyImage` 不重建 `<img>`，只通过 `Island` 保留 Shopify 已生成的真实 `<img>`。

`ShopifyVideo` 同理，保留 Shopify `video_tag` 生成的 `<video>`、`source`、poster 等 DOM。

## 数据隔离

### JSON bridge 隔离

每个 generated wrapper 只读取直属 bridge：

```js
el.querySelector(':scope > script[data-ssg-liquid]')
```

这避免父 Section 读取子 Block 的 bridge。

### Hydration root 隔离

每个 wrapper 只 hydrate 自己直属的 `data-ssg-h`：

```js
el.querySelector(':scope > [data-ssg-h]')
```

### Island capture 隔离

`captureIslands(h)` 会过滤 nested hydration root：

```js
if (node.closest('[data-ssg-h]') !== h) continue;
```

这避免父 Section 捕获子 Block 内部 island，防止不同 root 都使用 `i0` 时发生数据串扰。

## Hydration 生命周期

普通 Section：

```text
1. Browser receives Liquid-rendered HTML
2. Entry script runs scan(document)
3. hydrate(wrapper)
4. readLiquidData(wrapper)
5. captureIslands(hydrationRoot)
6. hydrateRoot(hydrationRoot, Provider + Component)
7. React binds events
```

Section + Block：

```text
1. Parent section script loads
2. Managed block scripts load in listen mode
3. Parent section hydrate starts
4. BlockSlot renders captured child block DOM
5. BlockSlot dispatches ssg:blocks:ready
6. Child block entries scan event target
7. Child blocks hydrate their own roots
```

Shopify editor：

- `shopify:section:load` -> scan and hydrate new DOM。
- `shopify:section:unload` -> unmount React root and delete from `roots Map`。

## 已知设计权衡

### React SSG 仍不能执行 Liquid

SSG 阶段拿不到真实 Shopify 数据，因此所有需要运行时 Liquid 的值必须通过 `useLiquid()`、`useLiquidCode()` 或 `Island` 表达。

### Island 顺序是协议

普通 island 使用自增 key：`i0`、`i1`、`i2`。这要求 SSG 阶段和客户端首 render 的 React tree 顺序一致。不要在客户端首 render 中用浏览器状态改变 island 数量或顺序。

### Island 内部不适合 React 子交互

Island 内部 DOM 属于 Liquid/Shopify。React 不会为 island 内部元素绑定事件。需要交互的 DOM 应该放在 React tree 中；需要 Liquid 生成的复杂 DOM 才放进 Island。

### `dangerouslySetInnerHTML` 是刻意选择

这里使用 `dangerouslySetInnerHTML` 不是为了绕过 React，而是为了让 React 在 hydration 时看到和当前 DOM 等价的 HTML 字符串，并在 `memo(() => true)` 后冻结这棵 Liquid-owned subtree。

### 并发 SSG 不支持

SSR 追踪依赖 `globalThis` registry，因此当前编译按 entry 顺序执行，不支持多个 entry 并发 SSR。

## 扩展建议

### 新增 Liquid-owned DOM 组件

优先基于 `Island`：

```tsx
export function ShopifySomething({ expr }: { expr: string }) {
  return <Island expression={`{{ ${expr} | some_filter }}`} />;
}
```

如果需要为 bridge 提供数据，配合 `useLiquid()` 的 `bridge` option。

### 新增数据 hook

保持 hook 最终委托给 `useLiquid()`，不要直接读取 `globalThis` 或 DOM。

### 新增 block 插槽能力

保持 `BlockSlot` 的事件顺序：父 hydrate commit 后再通知子 block hydrate。不要让 block entry 在模块加载时立即扫描全局 DOM，否则会早于父 Section commit。

### 调试

```bash
DEBUG=vite-plugin-shopify:* pnpm build
```

常用 namespace：

- `vite-plugin-shopify:config`
- `vite-plugin-shopify:entries`
- `vite-plugin-shopify:ssg`
- `vite-plugin-shopify:ssg:compiler`
- `vite-plugin-shopify:ssg:renderer`
- `vite-plugin-shopify:ssg:css`
