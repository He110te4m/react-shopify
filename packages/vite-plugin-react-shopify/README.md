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
      themeRoot: ".",            // 主题根目录，默认 "./"
      sourceCodeDir: "frontend", // 源码目录，默认 "frontend"
    }),
  ],
};
```

```tsx
// frontend/sections/HelloWorld.tsx
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useSectionSettings } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Hello World",
  settings: [
    { type: "text", id: "title", label: "Title", default: "Hello, World!" },
  ],
  presets: [{ name: "Hello World" }],
} satisfies ShopifyMeta;

export default function HelloWorld() {
  const { value: title } = useSectionSettings("title");
  return <h1>{title}</h1>;
}
```

构建后生成 `sections/react-hello-world.liquid`。

### 开发

```bash
# 终端 1: 启动 Vite 构建监听
pnpm dev    # → vite build --watch

# 终端 2: 启动 Shopify 主题开发
shopify theme dev
```

Vite 监听文件变化 → 增量构建 → 写入磁盘 → Shopify CLI 检测到变化 → 推送主题 → 编辑器热更新。

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
├── snippets/
├── templates/
└── assets/                   ← Vite 构建产物（可通过 buildDir 配置子目录）
```

---

## Settings 和 Liquid 数据读取

### 核心 API

所有 Liquid 数据的读取通过统一的基础 hook `useLiquid(expr)`：

```tsx
import {
  useLiquid,
  useLiquidValues,
  useSectionSettings,
  useBlockSettings,
  useSnippetParams,
  useBlockParams,
} from "vite-plugin-react-shopify/runtime";
```

| Hook | 用途 | 内部等价于 |
|------|------|-----------|
| `useLiquid(expr)` | 读取任意 Liquid 表达式 | — |
| `useLiquidValues({ key: expr })` | 批量读取多个表达式 | N 次 `useLiquid` |
| `useSectionSettings(key)` | Section setting | `useLiquid("section.settings.KEY")` |
| `useBlockSettings(key)` | Block setting | `useLiquid("block.settings.KEY")` |
| `useSnippetParams(key)` | Snippet param | `useLiquid("KEY")` |
| `useBlockParams(key)` | Block param | `useLiquid("KEY")` |

所有 hook 返回 `{ value: string | undefined }`（`useLiquidValues` 返回 `{ values: Record }`）。

```tsx
export default function ProductBanner() {
  const { value: title } = useSectionSettings("title");
  const { value: price } = useLiquid("product.price");
  const { values: p } = useLiquidValues({
    name: "product.title",
    desc: "product.description",
  });

  return (
    <div>
      <h1>{title}</h1>
      <span>{price}</span>
      <p>{p.name}</p>
      <div dangerouslySetInnerHTML={{ __html: p.desc || "" }} />
    </div>
  );
}
```

### 工具函数

```ts
import { parseLiquidBoolean, parseLiquidNumber } from "vite-plugin-react-shopify/runtime";

// SSR-safe: Liquid 表达式字符串 → 默认值；客户端 → 实际解析
const count = parseLiquidNumber(s.initial, 0);
const show = parseLiquidBoolean(s.show_banner);
```

### 水合流程

1. **SSR**：hook 返回 `{{ expr }}` 字符串，同时注册表达式到追踪器
2. **Liquid 组装**：生成统一 `<script type="application/json" data-ssg-liquid>` JSON bridge
3. **Shopify 渲染**：Liquid 引擎替换表达式为实际值，bridge JSON 包含序列化后的值
4. **客户端水合**：`LiquidDataProvider` 接收 bridge JSON → hook 通过 `useContext` 读取

---

## 组件约定

每个 React 组件必须导出：

### 1. `shopifyMeta` — Shopify Schema 定义

```tsx
export const shopifyMeta = {
  name: "组件名称",
  type: "section",            // 可选，覆盖目录推断
  tag: "section",             // 可选，外层 HTML 标签，默认 "div"
  class: "custom-class",      // 可选，外层 CSS 类名
  limit: 1,
  max_blocks: 10,
  settings: [...],
  blocks: [...],
  presets: [...],
} satisfies ShopifyMeta;
```

### 2. `default export` — React 组件

```tsx
export default function MyComponent() {
  return <div>...</div>;
}
```

### 类型推断

| 源码路径 | 目标类型 | 生成文件 |
|----------|----------|----------|
| `frontend/sections/X.tsx` | `section` | `sections/react-x.liquid` |
| `frontend/blocks/X.tsx` | `block` | `blocks/react-x.liquid` |
| `frontend/templates/X.tsx` | `template` | `templates/page.react-x.liquid` |
| `frontend/snippets/X.tsx` | `snippet` | `snippets/react-x.liquid` |

---

## 设置 (Settings)

```tsx
import type { SettingSchema } from "vite-plugin-react-shopify";

const settings = [
  { type: "text", id: "title", label: "Title", default: "Hello" },
  { type: "select", id: "layout", label: "Layout", default: "grid",
    options: [{ value: "grid", label: "Grid" }, { value: "list", label: "List" }] },
  { type: "range", id: "columns", label: "Columns", default: 3, min: 1, max: 6, step: 1 },
] satisfies SettingSchema[];
```

### 基本输入类型

| 类型 | 额外字段 |
|------|----------|
| `checkbox` | `default`（`boolean`） |
| `number` | `placeholder` |
| `radio` | `options`（必填） |
| `range` | `min`（必填）、`max`（必填）、`step`、`unit` |
| `select` | `options`（必填） |
| `text` | `placeholder` |
| `textarea` | `placeholder` |

### 专用输入类型

`article`、`article_list`、`blog`、`collection`、`collection_list`、`color`、`color_background`、`color_scheme`、`color_scheme_group`、`font_picker`、`html`、`image_picker`、`inline_richtext`、`link_list`、`liquid`、`metaobject`、`metaobject_list`、`page`、`product`、`product_list`、`richtext`、`text_alignment`、`url`、`video`、`video_url`

### 侧边栏类型

`header`、`paragraph`、`line_break`。使用 `content` 字段，不保存值。

---

## 预设 (Presets)

```tsx
export const shopifyMeta = {
  name: "Hero Banner",
  presets: [
    { name: "Hero (Light)", category: "Banners" },
    { name: "Hero (Dark)", category: "Banners",
      settings: { bg_color: "#000", text_color: "#fff" } },
  ],
} satisfies ShopifyMeta;
```

---

## 子 Block（嵌套）

```tsx
export const shopifyMeta = {
  name: "Group",
  blocks: [{ type: "@theme" }],
} satisfies ShopifyMeta;
```

- `"@theme"` 接受当前主题中所有已注册的 block
- 插件自动插入 `{% content_for 'blocks' %}`

---

## Snippet

通过 `params` 传参（而非 `settings`）：

```tsx
// frontend/snippets/ProductCard.tsx
import { useSnippetParams } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  type: "snippet",
  name: "Product Card",
  params: ["title", "price"],
} satisfies ShopifyMeta;

export default function ProductCard() {
  const { value: title } = useSnippetParams("title");
  const { value: price } = useSnippetParams("price");
  return <div><h3>{title}</h3><span>{price}</span></div>;
}
```

调用方式：`{% render 'react-product-card', title: 'Hello', price: '$10' %}`

---

## CSS 样式

使用普通 CSS 文件为组件添加样式。CSS 会在构建时被内联到 Liquid 的 `{% stylesheet %}` 块中。多个组件共享的 CSS 自动提取为 snippet：

```css
/* frontend/sections/Hero.css */
.hero { display: grid; padding: 2rem; }
```

```tsx
import "./Hero.css";
export default function Hero() { return <div className="hero">...</div>; }
```

---

## 配置选项

```ts
vitePluginShopify({
  themeRoot: ".",                         // 主题根目录
  sourceCodeDir: "frontend",              // React 源码目录
  snippetFile: "shopify-importmap.liquid",// importmap 片段文件名
  buildDir: "assets",                     // 构建产物输出目录
  debug: false,                           // 详细日志
  ssg: {
    directories: ["sections", "blocks", "templates", "snippets"],
    prefix: {
      template: "page.react-",
      section: "react-",
      block: "react-",
      snippet: "react-",
    },
    outputName: "",                       // 自定义输出模板
    cssPrefix: "css",                     // 共享 CSS snippet 前缀
  },
  importMap: {
    react: "{{ 'react.js' | asset_url }}",
    reactDomClient: "{{ 'react-dom.js' | asset_url }}",
  },
});
```

---

## 水合与编辑器事件

### 水合流程

1. **SSG 预渲染**：React 组件渲染为含 Liquid 表达式的 HTML，Liquid 组装器生成 `data-ssg-liquid` JSON bridge
2. **Liquid 渲染**：Shopify 服务端替换表达式为实际值
3. **Hydration JS**：Vite 为每个组件生成独立 hydration chunk，读取 JSON bridge 并调用 `hydrateRoot`

### 编辑器事件

| 事件 | 行为 |
|------|------|
| `shopify:section:load` | 重新 hydrate 组件 |
| `shopify:section:unload` | unmount React 根节点 |

---

## 调试

```bash
DEBUG=vite-plugin-shopify:* npx vite build
```

---

## 开发规范

> 详见 `docs/hydration-issues.md`

### JSX 子节点中相邻文本+表达式

**必须使用模板字面量包裹**：

```tsx
// ❌ 水合失败：相邻文本节点不匹配
<button>-{step}</button>
<li>title = {title}</li>

// ✅ 模板字面量
<button>{`-${step}`}</button>
<li>{`title = ${title}`}</li>
```

### useState 初始化

**不能依赖 `useLiquid` 返回值**：

```tsx
// ❌ SSR 时 Number("{{ expr }}") = NaN → 不匹配
const [count, setCount] = useState(Number(s.initial) || 0);

// ✅ 固定默认值 + useEffect 同步
const [count, setCount] = useState(0);
useEffect(() => { setCount(parseLiquidNumber(s.initial, 0)); }, []);
```

### 条件渲染

**不用 `{value && <Element />}`**，用 `hidden` 属性：

```tsx
// ❌ SSR 时表达式字符串始终 truthy → 结构不匹配
{showBanner && <Banner />}

// ✅ DOM 结构不变，仅切换属性
<section hidden={!parseLiquidBoolean(showBannerRaw)}>...</section>
```

### inline style 颜色值

**用 CSS 自定义属性代替内联颜色**：

```tsx
// ❌ 浏览器规范化 hex → rgb → 不匹配
<div style={{ backgroundColor: color }} />

// ✅ CSS 变量不归一化
<div style={{ "--accent": color } as React.CSSProperties} />
// CSS: .accent { background-color: var(--accent); }
```

---

## 注意事项

- **SSR 渲染生成 Liquid 模板**：构建时的 SSG 渲染将 settings/params 访问映射为 Liquid tag（如 `{{ section.settings.title }}`），由 Shopify 服务端解析为真实值
- **Template 类型不包裹**：`type: "template"` 的 HTML 直接输出，不添加 section/block 外层结构
- **Section 必须有预设才能通过编辑器添加**
- **构建产物默认输出到 `assets/`**：可通过 `buildDir` 配置子目录
- **Watch 模式**：`vite build --watch` 时自动关闭压缩并启用 inline sourcemap
- **Settings 按需追踪**：SSR 阶段追踪组件 render body 中实际访问的 Liquid 表达式，只将访问过的表达式注入 `data-ssg-liquid` JSON bridge
