# vite-plugin-react-shopify

使用 React 组件编写 Shopify 主题的 Section、Block、Snippet 和 Template。在构建时通过 SSG（Static Site Generation）将 React 组件编译为 Shopify Liquid 文件，运行时由 React 进行水合（hydration）。

## 安装

```bash
pnpm add vite-plugin-react-shopify
```

## 快速开始

```ts
// vite.config.ts
import vitePluginShopify from "vite-plugin-react-shopify";

export default {
  plugins: [
    vitePluginShopify({
      themeRoot: ".",           // 主题根目录，默认 "./"
      sourceCodeDir: "frontend", // 源码目录，默认 "frontend"
    }),
  ],
};
```

```tsx
// frontend/sections/HelloWorld.tsx
import type { ShopifyMeta } from "vite-plugin-react-shopify";

export const shopifyMeta = {
  name: "Hello World",
  presets: [{ name: "Hello World" }],
} satisfies ShopifyMeta;

export default function HelloWorld() {
  return <h1>Hello, World!</h1>;
}
```

构建后生成 `sections/react-hello-world.liquid`。

### 开发

使用 `vite build --watch` 进行本地开发。Vite 8 的 Rolldown 内置增量构建缓存，文件变更时仅重新构建受影响的模块。

```bash
# 终端 1: 启动 Vite 构建监听
pnpm dev    # → vite build --watch

# 终端 2: 启动 Shopify 主题开发
shopify theme dev
```

Vite 监听文件变化 → 增量构建 → 写入磁盘 → Shopify CLI 检测到变化 → 推送主题 → 编辑器热更新。watch 模式下产物不压缩、附带 inline sourcemap，方便在浏览器中调试。

```json
// package.json
{
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build"
  }
}
```

---

## 目录结构

```
my-theme/
├── frontend/                 ← React 源码
│   ├── sections/
│   │   └── HelloWorld.tsx
│   ├── blocks/
│   │   └── TextBlock.tsx
│   ├── snippets/
│   │   └── MySnippet.tsx
│   └── templates/
│       └── index.tsx
├── sections/                 ← 生成的 Liquid + 原生 Liquid
├── blocks/
├── snippets/                 ← 生成的 Snippet Liquid + importmap + 共享 CSS
├── templates/
└── assets/                   ← Vite 构建产物（可通过 buildDir 配置子目录）
```

源码放在 `frontend/` 下，按 Shopify 类型分目录。构建后生成对应的 `.liquid` 文件到主题根目录的 `sections/`、`blocks/`、`templates/` 下。

---

## 组件约定

每个 React 组件必须导出两样东西：

### 1. `shopifyMeta` — Shopify Schema 定义

```tsx
export const shopifyMeta = {
  name: "组件名称",           // 必填，在 Shopify 编辑器中显示的名称
  type: "section",            // 可选，覆盖目录推断的类型（"section"|"block"|"template"|"snippet"）
  tag: "section",             // 可选，外层 HTML 标签，默认 "div"
  class: "custom-class",      // 可选，外层附加的 CSS 类名
  limit: 1,                   // 可选，每页最大数量
  max_blocks: 10,             // 可选，最大子 block 数
  settings: [...],            // 可选，设置项
  blocks: [...],              // 可选，接受的子 block 类型
  presets: [...],             // 可选，编辑器预设
  enabled_on: {...},          // 可选，启用条件
  disabled_on: {...},         // 可选，禁用条件
  templates: [...],           // 可选，适用的模板
} satisfies ShopifyMeta;
```

### 2. `default export` — React 组件

```tsx
export default function MyComponent(props) {
  return <div>...</div>;
}
```

### 类型推断

文件名和目录决定目标类型：

| 源码路径 | 目标类型 | 生成文件 |
|----------|----------|----------|
| `frontend/sections/X.tsx` | `section` | `sections/react-x.liquid` |
| `frontend/blocks/X.tsx` | `block` | `blocks/react-x.liquid` |
| `frontend/templates/X.tsx` | `template` | `templates/page.react-x.liquid` |
| `frontend/snippets/X.tsx` | `snippet` | `snippets/react-x.liquid` |

可通过 `shopifyMeta.type` 覆盖。

---

## 设置 (Settings)

使用 `SettingSchema` 类型定义设置项。`SettingSchema` 是根据 `type` 字段判别（discriminated union）的联合类型 —— 每种 type 只接受 Shopify 文档中合法的字段，无效字段会在编译时报错：

```tsx
import type { SettingSchema } from "vite-plugin-react-shopify";

const settings = [
  {
    type: "text",
    id: "title",
    label: "Title",
    default: "Hello",
  },
  {
    type: "select",
    id: "layout",
    label: "Layout",
    default: "grid",
    options: [
      { value: "grid", label: "Grid" },
      { value: "list", label: "List" },
    ],
  },
  {
    type: "range",
    id: "columns",
    label: "Columns",
    default: 3,
    min: 1,
    max: 6,
    step: 1,
  },
] satisfies SettingSchema[];

// 也可以直接引用具体类型：
import type { SelectSetting, RangeSetting } from "vite-plugin-react-shopify";
```

### 基本输入类型

| 类型 | 额外字段 | `default` |
|------|----------|-----------|
| `checkbox` | — | 可选 `boolean` |
| `number` | `placeholder` | 可选 `number` |
| `radio` | `options`（必填） | 可选 `string` |
| `range` | `min`（必填）、`max`（必填）、`step`、`unit` | **必填** `number` |
| `select` | `options`（必填） | 可选 `string` |
| `text` | `placeholder` | 可选 `string` |
| `textarea` | `placeholder` | 可选 `string` |

### 专用输入类型

| 类型 | 额外字段 |
|------|----------|
| `article` | —（不支持 `default`） |
| `article_list` | `limit` |
| `blog` | —（不支持 `default`） |
| `collection` | —（不支持 `default`） |
| `collection_list` | `limit` |
| `color` | — |
| `color_background` | — |
| `color_scheme` | — |
| `color_scheme_group` | `definition`（必填）、`role`（必填） |
| `font_picker` | —（`default` **必填** `string`） |
| `html` | `placeholder` |
| `image_picker` | —（不支持 `default`） |
| `inline_richtext` | — |
| `link_list` | —（`default` 限制为 `"main-menu"` / `"footer"`） |
| `liquid` | — |
| `metaobject` | `metaobject_type`（必填） |
| `metaobject_list` | `metaobject_type`（必填）、`limit` |
| `page` | —（不支持 `default`） |
| `product` | —（不支持 `default`） |
| `product_list` | `limit` |
| `richtext` | — |
| `text_alignment` | —（`default` 限制为 `"left"` / `"center"` / `"right"`） |
| `url` | — |
| `video` | —（不支持 `default`） |
| `video_url` | `accept`（必填）、`placeholder` |

### 侧边栏类型（非输入，仅显示信息）

`header`、`paragraph`、`line_break`。与输入类型不同，侧边栏类型不保存值，仅用于组织和描述设置项。使用 `content` 字段代替 `id`/`label`：

```tsx
const settings = [
  { type: "header", content: "Typography", info: "Customize text styles below." },
  { type: "font_picker", id: "heading_font", label: "Heading font", default: "helvetica_n4" },
  { type: "paragraph", content: "Set your brand colors for buttons and accents." },
  { type: "color", id: "accent_color", label: "Accent color", default: "#000000" },
  { type: "line_break" },
  { type: "checkbox", id: "dark_mode", label: "Enable dark mode", default: false },
] satisfies SettingSchema[];

Setting 的 `id` 会作为 React 组件的 prop 名传入。Shopify 编辑器修改 setting 后，水合层会从 `data-ssg-props` JSON bridge 读取最新值传给组件。设置值通过 `useShopifySettings()` hook 读取。Bridge 按需包含 render body 中实际访问的字段，非全量输出。

---

## 预设 (Presets)

预设让组件可以在编辑器中通过"添加 Section/Block"面板直接添加：

```tsx
export const shopifyMeta = {
  name: "Hero Banner",
  presets: [
    { name: "Hero (Light)", category: "Banners" },
    {
      name: "Hero (Dark)",
      category: "Banners",
      settings: { bg_color: "#000", text_color: "#fff" },
    },
  ],
} satisfies ShopifyMeta;
```

---

## 子 Block（嵌套）

Section 或 Block 可以声明接受的子 block 类型：

```tsx
export const shopifyMeta = {
  name: "Group",
  blocks: [{ type: "@theme" }], // 接受所有主题 block
} satisfies ShopifyMeta;
```

- `"@theme"` 接受当前主题中所有已注册的 block
- `"类型名"` 只接受特定类型的 block（如 `"text"` 匹配 `blocks/text.liquid`）
- 插件会自动在生成的 Liquid 中插入 `{% content_for 'blocks' %}`

---

## Snippet

Snippet 是无 Schema 的 Liquid 代码片段，通过 `params` 传参（而非 `settings`）。适合抽取可复用的展示逻辑，通过 `{% render %}` 调用：

```tsx
// frontend/snippets/ProductCard.tsx
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useShopifyParams } from "vite-plugin-react-shopify/runtime/settings";

export const shopifyMeta = {
  type: "snippet",
  name: "Product Card",
  params: ["title", "price", "image"],
} satisfies ShopifyMeta;

export default function ProductCard() {
  const p = useShopifyParams<{ title?: string; price?: string; image?: string }>();
  return (
    <div className="product-card">
      <h3>{p.title}</h3>
      <span>{p.price}</span>
    </div>
  );
}
```

生成 `snippets/react-product-card.liquid`，在主题中通过 `{% render 'react-product-card', title: 'Hello', price: '$10' %}` 使用。

Snippet 与 Section/Block 的核心区别：

| | Section/Block | Snippet |
|---|---|---|
| 数据传入 | `settings`（有 Schema） | `params`（无 Schema） |
| `{% schema %}` | ✅ | ❌ |
| 编辑器可见 | ✅ | ❌ |
| 子 Block | ✅（Block 支持） | ❌ |
| 包含方式 | 自动加载 | `{% render 'name', param: val %}` |

---

## CSS 样式

使用 CSS Module 为组件添加样式。CSS 会在构建时被内联到生成的 Liquid 的 `{% stylesheet %}` 块中，由 Shopify 统一注入到 `<head>`，避免 FOUC 和额外 HTTP 请求。

```css
/* frontend/sections/Hero.module.css */
.hero {
  display: grid;
  padding: 2rem;
}
.hero-title {
  font-size: 3rem;
  font-weight: 700;
}
```

```tsx
// frontend/sections/Hero.tsx
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <div className={styles["hero"]}>
      <h1 className={styles["hero-title"]}>Title</h1>
    </div>
  );
}
```

生成的 Liquid 中会包含：

```liquid
{% stylesheet %}
._hero_abc123{display:grid;padding:2rem}
._hero-title_abc123{font-size:3rem;font-weight:700}
{% endstylesheet %}
```

> **注意**：SSG 预渲染的 HTML 使用未经过 Vite hash 处理的类名。浏览器加载后 React 水合会替换为正确的 hash 类名。这是 CSS Module + SSG 的已知权衡。

---

## 配置选项

```ts
vitePluginShopify({
  // === 路径配置 ===
  themeRoot: ".",              // 主题根目录
  sourceCodeDir: "frontend",   // React 源码目录（相对于 themeRoot）
  snippetFile: "shopify-importmap.liquid", // importmap 片段文件名
  buildDir: "assets",          // Vite 构建产物输出目录（相对于 themeRoot）

  // === 构建配置 ===

  // === 调试 ===
  debug: false,                // 启用详细日志输出

  // === SSG 配置 ===
  ssg: {
    directories: ["sections", "blocks", "templates", "snippets"], // 扫描的目录
    prefix: {                  // 生成文件的命名前缀
      template: "page.react-", // templates → page.react-xxx.liquid
      section: "react-",       // sections   → react-xxx.liquid
      block: "react-",         // blocks     → react-xxx.liquid
      snippet: "react-",       // snippets   → react-xxx.liquid
    },
    outputName: "",            // 自定义输出模板，留空使用前缀规则
    cssPrefix: "css",          // 共享 CSS snippet 命名前缀，默认 "css"
  },

  // === Import Map 配置 ===
  importMap: {
    react: "{{ 'react.js' | asset_url }}",                       // React 本地 chunk 路径
    reactDomClient: "{{ 'react-dom.js' | asset_url }}",          // ReactDOM 本地 chunk 路径
  },
});
```

---

## 命名约定

### 默认命名规则

| 源码文件 | 目标类型 | 生成文件 |
|----------|----------|----------|
| `frontend/sections/MySection.tsx` | section | `sections/react-my-section.liquid` |
| `frontend/blocks/MyBlock.tsx` | block | `blocks/react-my-block.liquid` |
| `frontend/templates/Index.tsx` | template | `templates/page.react-index.liquid` |
| `frontend/snippets/MySnippet.tsx` | snippet | `snippets/react-my-snippet.liquid` |

- 组件文件名通过 `toKebabCase` 转换为 kebab-case：
  - `HelloWorld` → `hello-world`
  - `FAQSection` → `faq-section`
- JS 产物自动包含 content hash（如 `assets/build/hello-world-aBc123.js`），共享 chunk 始终带 hash 以避免跨构建缓存冲突

### 自定义命名（`outputName`）

```ts
ssg: {
  outputName: "{target}s/{kebab}"  // 按类型分目录，不添加前缀
}
```

支持占位符：`{type}`、`{kebab}`、`{pascal}`、`{target}`。

---

## 水合（Hydration）与编辑器事件

### 水合流程

1. **SSG 预渲染**：构建时 React 组件渲染为静态 HTML，嵌入 `<div data-ssg-hydrate>`
2. **Settings 透传**：Liquid 中 `<script type="application/json" data-ssg-props>` 按需包含组件 render body 中实际访问的 settings 字段，而非全量 `{{ section.settings | json }}`。详见下方[注意事项](#注意事项)第 10 项
3. **Hydration JS**：Vite 为每个组件生成独立的 hydration chunk，读取 settings JSON 并调用 `hydrateRoot`

### 编辑器事件

Hydration 脚本自动监听 Shopify 编辑器的 Section 生命周期事件：

| 事件 | 行为 |
|------|------|
| `shopify:section:load` | Section 被添加或重新渲染时，重新 hydrate 组件 |
| `shopify:section:unload` | Section 被删除或即将重新渲染时，unmount React 根节点 |

当用户在编辑器中修改 setting 时：Shopify 重新渲染 Section HTML → 触发 `unload`（清理旧 root）→ 触发 `load`（用新 props 重新 hydrate）。

---

## 运行时

### Liquid 组件

在 JSX 中嵌入原始 Liquid 代码：

```tsx
import { Liquid } from "vite-plugin-react-shopify/runtime";

export default function Section() {
  return (
    <div>
      <Liquid>{`{% if section.settings.show_title %}`}</Liquid>
      <h1>Title</h1>
      <Liquid>{`{% endif %}`}</Liquid>
    </div>
  );
}
```

### Import Map

React 和 ReactDOM 在构建时被分离为独立 chunk（`react.js`、`react-dom.js`），存储在 `assets/` 目录中。插件自动生成 `snippets/shopify-importmap.liquid`，在主题 `layout/theme.liquid` 的 `<head>` 中引入：

```liquid
{% render 'shopify-importmap' %}
```

React chunk 文件名不含 hash（`react.js` 固定不变），仅在升级 React 版本时更新，避免了升级前的缓存失效问题。其他业务 chunk 始终带 hash 以避免跨构建缓存冲突。

---

## 调试

插件提供了两种方式启用详细日志输出，方便诊断构建问题。

### 方式一：插件选项

```ts
vitePluginShopify({
  debug: true,
});
```

### 方式二：环境变量

```bash
DEBUG=vite-plugin-shopify:* npx vite build
```

两种方式效果相同，都会输出详细的构建过程信息。

### Debug 输出示例

启用 debug 模式后，构建过程会输出：

```
vite-plugin-shopify:entries scanned 5 entries: {"section":3,"block":2}
vite-plugin-shopify:ssg:compiler found 5 entries to compile
vite-plugin-shopify:ssg:compiler entry counter has 1 CSS files
vite-plugin-shopify:ssg:compiler entry hello-world has 1 CSS files
vite-plugin-shopify:ssg:compiler generated shared CSS snippet css-SharedCard (used by 2 entries)
vite-plugin-shopify:ssg:compiler compiling counter (type=section, css inline=0, css snippets=1)
vite-plugin-shopify:ssg:compiler bundling counter via esbuild
vite-plugin-shopify:ssg:compiler esbuild bundle took 53ms
...
[vite-plugin-shopify] Starting SSG compilation...
[vite-plugin-shopify] Compiled 5 entries
[vite-plugin-shopify] SSG compilation complete
```

### 日志级别

| 级别 | 触发条件 | 可见性 |
|------|----------|--------|
| `info` | 始终可见 | 构建阶段摘要、完成计数 |
| `warn` | 始终可见 | 缺少依赖、跳过的组件 |
| `error` | 始终可见 | 编译失败的组件及堆栈 |
| `debug` | 仅 debug 模式 | 入口扫描结果、CSS 分发、esbuild 耗时、配置详情 |

### 诊断场景

- **组件未被识别** → 开启 debug，检查 `scanned entries` 输出，确认文件和目录命名
- **CSS 未生效** → 开启 debug，检查 `has CSS files` 和 `css inline/snippets` 统计
- **SSG 渲染失败** → `error` 级别自动输出完整错误堆栈
- **构建缓慢** → 开启 debug，检查每个组件的 `esbuild bundle took Xms`

---

## 注意事项

1. **React / ReactDOM 本地打包**：构建时 React 和 ReactDOM 被分离为独立 chunk（`react.js`、`react-dom.js`），与其他业务代码一起存储在 `assets/` 中。无需依赖外部 CDN，版本与 `package.json` 同步
2. **CSS Module hash 差异**：SSG 预渲染的 HTML 使用原始类名，水合后才会替换为 hash 类名。如需完美匹配，建议使用全局 CSS 而非 CSS Module，或接受短暂的样式跳跃
3. **SSG 渲染生成 Liquid 模板**：构建时的 SSG 渲染将 settings/params 访问映射为 Liquid tag（如 `{{ section.settings.title }}`），由 Shopify 服务端在实际请求时解析为真实值。因此预渲染的 HTML 模板中显示的是 Liquid 变量语法，而非组件的默认值
4. **Template 类型不包裹**：`type: "template"` 的组件 HTML 直接输出，不添加 section/block 外层结构，适用于整页模板
5. **Section 必须有预设才能通过编辑器添加**：没有 `presets` 的 section 需要手动在 JSON 模板中引用，编辑器无法直接添加
6. **`{% content_for 'blocks' %}` 自动插入**：当 `shopifyMeta.blocks` 非空时，插件自动在生成的 Liquid 中插入子 block 渲染标签
7. **构建产物默认输出到 `assets/`**：如需与其他静态资源隔离，可设置 `buildDir: "assets/build"` 将产物输出到子目录，然后在 `.gitignore` 中添加 `assets/build/` 忽略该目录
8. **Watch 模式自动关闭压缩**：`vite build --watch` 时自动设置 `minify: false` 并启用 inline sourcemap，方便在浏览器中调试。生产构建（`vite build`）则使用正常压缩
9. **增量构建依赖 Rolldown 缓存**：watch 模式下 Rolldown 的 `ScanStageCache` 自动缓存模块图，文件变更时仅重新扫描变更模块，大幅加速构建。首次启动执行全量构建，后续为增量构建
10. **Settings 按需追踪（useEffect 边缘场景）**：构建时的 SSG 渲染会追踪组件 render body 中实际访问的 settings 字段，只将这些字段的 JSON bridge 注入到生成的 Liquid 中（非全量 `{{ section.settings | json }}`）。这意味着：
    - ✅ render body 中直接访问的字段（包括条件渲染中的访问）会被正确追踪
    - ✅ `Object.keys(settings)` / `Object.entries(settings)` 等遍历访问会被追踪
    - ⚠️ **仅在 `useEffect` / `useLayoutEffect` 回调中访问、从未在 render body 中出现的字段，不会被追踪** — 因为 SSR 阶段不执行 effects，Proxy 的 `get` trap 不会触发
    - 这种写法在实际项目中极为罕见，正常场景下 settings 总会先出现在 render body 中（条件判断、内容渲染等）。如确实需要在 effect-only 场景中访问未被追踪的 setting，可以显式在 render body 中做一次空访问（如 `void s.fieldName`）来触发追踪
11. **Hydration 中的 `||` 兜底值问题**：避免在 settings/params 上使用 `||` 操作符提供兜底值。SSR 阶段 useShopifySettings/useShopifyParams 返回的 Proxy 会将属性访问映射为 Liquid tag 字符串（如 `"{{ section.settings.title }}"`），这些字符串**永远 truthy**，`||` 永远不会触发兜底逻辑。但 hydration 阶段从 bridge JSON 取到的是真实值（可能为空字符串、`null` 等 falsy 值），`||` 会触发兜底，导致 SSR 和服务端输出不一致，引发 hydration mismatch 错误。
    ```tsx
    // ❌ 错误：SSR 时 Liquid tag 字符串永远 truthy，兜底无效 → mismatch
    const title = s.title || "默认标题";

    // ✅ 正确：直接使用原始值
    const title = s.title;
    ```
    同样适用于 `&&` 条件渲染中的隐式 truthy 检查。如需兜底，应在 setter 或 effect 中处理，而非 render body 中。12. **无效 HTML 嵌套导致 mismatch**：`<ul>` / `<ol>` / `<table>` 等元素有严格的子元素约束。例如 `<ul>` 直接嵌套另一个 `<ul>` 是无效 HTML，浏览器解析时会自动"修复" DOM 结构，与 React 的虚拟 DOM 产生差异，导致 hydration mismatch。确保嵌套列表使用 `<li><ul>...</ul></li>` 结构。
