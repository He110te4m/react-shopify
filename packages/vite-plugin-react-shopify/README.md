# vite-plugin-react-shopify

用 React 组件编写 Shopify 主题的 Section、Block、Snippet 和 Template。构建时通过 SSG 将 React 组件编译为 Shopify Liquid 文件，运行时由 React 进行 hydration。

## 背景

Shopify 主题开发长期依赖 Liquid 模板语言 + 原生 JS，存在几个痛点：

**AI 开发成本高**。主流 AI 模型对 Liquid 的训练数据不足，每次会话需要注入大量 Liquid 语法、filter、对象模型等上下文，Token 消耗大且容易出错，大量优质 Context 被浪费在语法上。React/TypeScript 生态完善，模型理解更准确。

**无法做单元测试**。Liquid 模板文件无法独立运行测试，逻辑正确性只能在 Shopify 环境中验证，调试周期长。React 组件可完整写单元测试，CI 中即可发现问题。

**学习曲线和产物质量**。Liquid 语法与主流前端框架差异大，新开发者上手成本高。原生 JS 缺乏模块系统和 tree-shaking，产物体积难以控制。React 的 JSX 语法、组件化模型、生态工具链在这些方面有显著优势。

本插件通过 SSG（Static Site Generation）在构建时把 React 组件预渲染为 Liquid 模板，保留与 Shopify 生态的完全兼容，同时让开发者用上 React 全栈工具链。

---

## 目录

1. [安装](#安装)
2. [使用](#使用)
3. [目录结构](#目录结构)
4. [组件开发](#组件开发)
5. [数据读取 API](#数据读取-api)
6. [CSS 样式](#css-样式)
7. [配置选项](#配置选项)
8. [开发工作流](#开发工作流)
9. [水合注意事项](#水合注意事项)
10. [常见问题](#常见问题)

---

## 安装

```bash
pnpm add vite-plugin-react-shopify
```

此外还需要安装 React 和 Vite（peer dependency）：

```bash
pnpm add react react-dom vite
pnpm add -D @types/react @types/react-dom typescript
```

---

## 使用

前提：已有 Shopify 主题（包含 `layout/`、`sections/`、`templates/` 等目录）。

```bash
# 1. 安装依赖
pnpm add vite-plugin-react-shopify react react-dom vite
pnpm add -D @types/react @types/react-dom typescript
```

```ts
// 2. vite.config.ts
import vitePluginShopify from "vite-plugin-react-shopify";

export default {
  plugins: [
    vitePluginShopify({
      sourceCodeDir: "frontend", // React 源码目录，默认 "frontend"，可改为 "react" 等
    }),
  ],
};
```

[`template/`](https://github.com/He110te4m/react-shopify/tree/main/template) 提供了 `frontend/` 骨架（可重命名为 `sourceCodeDir` 的值）、`tsconfig.json`、`_gitignore` 等样板文件，可直接复制到主题目录：

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/He110te4m/react-shopify.git _tmp
cd _tmp && git sparse-checkout set template && cd ..
cp -r _tmp/template/* my-shopify-theme/
# 如果 sourceCodeDir 不是 "frontend"，重命名模板目录，并同步修改 tsconfig.json 的 include 路径
mv my-shopify-theme/frontend my-shopify-theme/react
rm -rf _tmp
```

在 `layout/theme.liquid` 的 `<head>` 中添加：

```liquid
{% render 'shopify-importmap' %}
```

将 `template/_gitignore` 内容追加到主题 `.gitignore`。

编写组件：

```tsx
// {sourceCodeDir}/sections/HelloWorld.tsx
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

构建：

```bash
pnpm dev   # → vite build --watch，配合 shopify theme dev 使用
```

构建后生成 `sections/react-hello-world.liquid`，在 Shopify 管理后台「添加 Section」即可找到。

### 文件命名冲突

插件生成的文件名格式为 `<prefix><组件名-kebab>.liquid`，默认 prefix：

| 类型 | prefix | 示例 |
|------|--------|------|
| section | `react-` | `react-hello-world.liquid` |
| block | `react-` | `react-text-block.liquid` |
| snippet | `react-` | `react-my-snippet.liquid` |
| template | `page.react-` | `page.react-index.liquid` |

如需修改，通过 `ssg.prefix` 配置：

```ts
vitePluginShopify({
  ssg: { prefix: { section: "r-", block: "r-", snippet: "r-", template: "page.r-" } },
});
```

---

---

## 目录结构

```
my-theme/
├── frontend/                  ← React 源码
│   ├── sections/
│   │   ├── HeroBanner.tsx
│   │   └── HeroBanner.css
│   ├── blocks/
│   │   └── TextBlock.tsx
│   ├── snippets/
│   │   └── ProductCard.tsx
│   ├── templates/
│   │   └── index.tsx
│   └── components/            ← 共享 React 组件
│       └── SharedCard.tsx
├── sections/                  ← 生成的 Liquid + 原生 Liquid
│   ├── react-hero-banner.liquid   ← 由插件生成
│   └── header.liquid              ← 原生 Liquid
├── blocks/
│   ├── react-text-block.liquid    ← 由插件生成
│   └── text.liquid                ← 原生 Liquid
├── snippets/
│   ├── react-product-card.liquid  ← 由插件生成
│   ├── css-SharedCard.liquid      ← 自动提取的共享 CSS
│   └── shopify-importmap.liquid   ← 自动生成的 importmap
├── templates/
│   └── page.react-index.liquid    ← 由插件生成
├── assets/                    ← Vite 构建产物（可通过 buildDir 配置子目录）
│   └── build/
│       ├── react.js
│       ├── react-dom.js
│       ├── hero-banner-xxx.js
│       └── manifest.json
├── layout/
│   └── theme.liquid           ← 需手动添加 {% render 'shopify-importmap' %}
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 组件开发

### shopifyMeta 导出

每个 React 组件文件必须导出一个 `shopifyMeta` 对象，定义 Shopify Schema：

```tsx
import type { ShopifyMeta } from "vite-plugin-react-shopify";

export const shopifyMeta = {
  // === 基本信息 ===
  name: "组件名称",               // 必填，≤ 25 字符
  type: "section",                // 可选，覆盖目录推断
  tag: "section",                 // 可选，外层 HTML 标签（默认 "div"）
  class: "custom-class",          // 可选，外层 CSS 类名
  limit: 1,                       // 可选，同一页面最多出现次数

  // === Settings ===
  settings: [
    { type: "text", id: "title", label: "Title", default: "Hello" },
    { type: "checkbox", id: "show_banner", label: "Show Banner", default: false },
  ],

  // === Blocks（子块嵌套） ===
  blocks: [{ type: "@theme" }],
  max_blocks: 10,

  // === Presets（在管理后台添加时的预设） ===
  presets: [
    { name: "Hero (Light)", category: "Banners" },
  ],

  // === 其他 ===
  enabled_on: { templates: ["index", "product"] },
  disabled_on: { templates: ["cart"] },
} satisfies ShopifyMeta;
```

### 默认导出

必须有一个 `default export` 作为 React 组件：

```tsx
export default function MySection() {
  return <div>...</div>;
}
```

### 类型映射

插件根据组件文件所在的目录自动推断类型：

| 源码路径 | 推断类型 | 生成文件 |
|----------|----------|----------|
| `frontend/sections/X.tsx` | `section` | `sections/react-x.liquid` |
| `frontend/blocks/X.tsx` | `block` | `blocks/react-x.liquid` |
| `frontend/templates/X.tsx` | `template` | `templates/page.react-x.liquid` |
| `frontend/snippets/X.tsx` | `snippet` | `snippets/react-x.liquid` |

可在 `shopifyMeta.type` 中显式指定覆盖。

---

## 数据读取 API

所有 Shopify Liquid 数据通过 runtime hooks 读取，导入路径为 `vite-plugin-react-shopify/runtime`。

### API 总览

```tsx
import {
  useLiquidValue,
  useLiquidValues,
  useSectionSettings,
  useBlockSettings,
  useSnippetParams,
  useBlockParams,
  parseLiquidBoolean,
  parseLiquidNumber,
  LiquidDataProvider,
  LiquidDataContext,
} from "vite-plugin-react-shopify/runtime";
```

| Hook | 签名 | 说明 |
|------|------|------|
| `useLiquidValue(expr)` | `[string \| undefined, setter]` | 读取任意 Liquid 表达式 |
| `useLiquidValue(expr, "number")` | `[number, setter]` | 读取并解析为数字 |
| `useLiquidValue(expr, "boolean")` | `[boolean, setter]` | 读取并解析为布尔 |
| `useLiquidValues(map, types?)` | 推断类型对象 | 批量读取多个表达式 |
| `useSectionSettings(key)` | `{ value: string \| undefined }` | 读取 Section setting |
| `useBlockSettings(key)` | `{ value: string \| undefined }` | 读取 Block setting |
| `useSnippetParams(key)` | `{ value: string \| undefined }` | 读取 Snippet 参数 |
| `useBlockParams(key)` | `{ value: string \| undefined }` | 读取 Block 参数 |

### 辅助函数

| 函数 | 说明 |
|------|------|
| `parseLiquidBoolean(value)` | 安全解析布尔值（`""` → false，`"false"` → false） |
| `parseLiquidNumber(value, defaultVal?)` | 安全解析数字（NaN → defaultVal） |

### 使用示例

**读取 Section Settings：**

```tsx
export default function ProductBanner() {
  const { value: title } = useSectionSettings("title");
  return <h1>{title}</h1>;
}
```

**读取任意 Liquid 值：**

```tsx
export default function ProductPrice() {
  const [price] = useLiquidValue("product.price");
  const [comparePrice] = useLiquidValue("product.compare_at_price");
  return (
    <div>
      <span>{price}</span>
      {comparePrice && <s>{comparePrice}</s>}
    </div>
  );
}
```

**带类型解析：**

```tsx
export default function Counter() {
  const [initial] = useLiquidValue("section.settings.initial_count", "number");
  const [show] = useLiquidValue("section.settings.show_banner", "boolean");

  return (
    <div>
      <p>Initial: {initial}</p>
      {show && <p>Banner visible</p>}
    </div>
  );
}
```

**批量读取：**

```tsx
export default function ProductInfo() {
  const p = useLiquidValues(
    { name: "product.title", desc: "product.description" },
    { desc: "string" }
  );
  return (
    <div>
      <h2>{p.name}</h2>
      <div dangerouslySetInnerHTML={{ __html: p.desc || "" }} />
    </div>
  );
}
```

### 数据流 / 水合流程

```
1. SSR 阶段（构建时 Node.js）
   useLiquidValue("section.settings.title")
   → 返回字符串 "{{ section.settings.title }}"   ← Liquid 模板变量
   → 同时追踪该表达式到 __shopify_ssg_liquid_track

2. Liquid 组装
   → 生成 <script type="application/json" data-ssg-liquid>
     { "section.settings.title": {{ section.settings.title | json }} }

3. Shopify 服务端渲染
   → Liquid 引擎将表达式替换为实际值
   → JSON bridge 包含实际数据

4. 客户端 hydration
   → LiquidDataProvider 接收 JSON bridge
   → useLiquidValue 从 context 读取实际值
   → hydrateRoot 完成 React 水合
```

---

## Settings 设置类型

### 基本输入类型

| 类型 | 额外字段 | 说明 |
|------|----------|------|
| `checkbox` | `default`（`boolean`） | 复选框 |
| `number` | `placeholder` | 数字输入 |
| `radio` | `options`（必填） | 单选框 |
| `range` | `min`（必填）、`max`（必填）、`step`、`unit` | 范围滑块 |
| `select` | `options`（必填） | 下拉选择 |
| `text` | `placeholder` | 单行文本 |
| `textarea` | `placeholder` | 多行文本 |

### 专用输入类型

`article`、`article_list`、`blog`、`collection`、`collection_list`、`color`、`color_background`、`color_scheme`、`color_scheme_group`、`font_picker`、`html`、`image_picker`、`inline_richtext`、`link_list`、`liquid`、`metaobject`、`metaobject_list`、`page`、`product`、`product_list`、`richtext`、`text_alignment`、`url`、`video`、`video_url`

完整类型定义可从 `vite-plugin-react-shopify` 导入：

```ts
import type { TextSetting, SelectSetting, RangeSetting } from "vite-plugin-react-shopify";
```

### 侧边栏元素

不保存值，仅用于在管理后台侧边栏中展示信息：

```tsx
settings: [
  { type: "header", content: "Layout Settings" },
  { type: "paragraph", content: "Choose how this section displays." },
  { type: "line_break" },
  { type: "select", id: "layout", label: "Layout", ... },
] satisfies SettingSchema[]
```

---

## Presets 预设

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

- Section 必须有至少一个 preset 才能在管理后台通过「添加 Section」找到
- `category` 用于在添加面板中分组
- `settings` 覆盖 setting 的默认值

---

## Block 嵌套

Section 可包含子 Block：

```tsx
export const shopifyMeta = {
  name: "Product Grid",
  blocks: [{ type: "@theme" }],  // "@theme" 接受主题中所有已注册的 block
  max_blocks: 10,
} satisfies ShopifyMeta;
```

- `"@theme"` 接受当前主题中所有已注册的 block 类型
- 也可指定具体 block 类型：`blocks: [{ type: "react-text-block" }]`
- 插件自动在 Section 模板中插入 `{% content_for 'blocks' %}`

---

## Snippet

Snippet 通过 `params` 传参（而非 `settings`）：

```tsx
// frontend/snippets/ProductCard.tsx
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useSnippetParams } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  type: "snippet",
  name: "Product Card",
  params: ["title", "price"],
} satisfies ShopifyMeta;

export default function ProductCard() {
  const { value: title } = useSnippetParams("title");
  const { value: price } = useSnippetParams("price");
  return (
    <div>
      <h3>{title}</h3>
      <span>{price}</span>
    </div>
  );
}
```

调用方式：

```liquid
{% render 'react-product-card', title: product.title, price: product.price %}
```

---

## CSS 样式

### 组件级 CSS

创建与组件同名的 CSS 文件，在组件中导入即可。CSS 会自动内联到 Liquid 的 `{% stylesheet %}` 块中：

```css
/* frontend/sections/HeroBanner.css */
.hero { display: grid; padding: 2rem; }
```

```tsx
import "./HeroBanner.css";
export default function HeroBanner() {
  return <div className="hero">...</div>;
}
```

### 共享 CSS

被多个组件同时使用的 CSS 文件会自动提取为独立的 snippet（如 `snippets/css-SharedCard.liquid`），避免代码重复。

### CSS Modules

暂不支持 CSS Modules（`.module.css`），建议使用 BEM 或其他命名约定。

---

## 配置选项

```ts
import type { Options } from "vite-plugin-react-shopify";

vitePluginShopify({
  // === 路径配置 ===
  themeRoot: ".",                         // 主题根目录，默认 "./"
  sourceCodeDir: "frontend",              // React 源码目录，默认 "frontend"
  buildDir: "assets",                     // 构建产物输出目录，默认 "assets"

  // === 调试 ===
  debug: false,                           // 详细日志，也可用环境变量 DEBUG="vite-plugin-shopify:*"

  // === 生成配置 ===
  snippetFile: "shopify-importmap.liquid",// importmap snippet 文件名
  ssg: {
    directories: ["sections", "blocks", "templates", "snippets"],
    prefix: {
      template: "page.react-",             // template 前缀
      section: "react-",                   // section 前缀
      block: "react-",                     // block 前缀
      snippet: "react-",                   // snippet 前缀
    },
    outputName: "",                        // 自定义输出文件名模板
    cssPrefix: "css",                      // 共享 CSS snippet 前缀
  },

  // === 依赖映射 ===
  importMap: {
    react: "{{ 'react.js' | asset_url }}",
    reactDomClient: "{{ 'react-dom.js' | asset_url }}",
  },
});
```

### outputName 模板变量

设置 `ssg.outputName` 可自定义输出文件名，支持以下变量：

| 变量 | 说明 | 示例 |
|------|------|------|
| `{type}` | 组件类型 | `section` |
| `{kebab}` | kebab-case 组件名 | `hero-banner` |
| `{pascal}` | PascalCase 组件名 | `HeroBanner` |
| `{target}` | 目标目录名 | `sections` |

```ts
// 示例：去掉 react- 前缀
ssg: { outputName: "{kebab}.liquid" }
```

---

## 开发工作流

### 开发模式

```bash
# 终端 1: Vite 构建监听
pnpm dev

# 终端 2: Shopify CLI（需要 Shopify CLI 已安装并登录）
shopify theme dev
```

Vite 监听文件变化 → 增量构建 → 写入磁盘 → Shopify CLI 检测变化 → 推送主题 → 热更新。

### 生产构建

```bash
pnpm build   # → vite build
```

### 调试

```bash
DEBUG=vite-plugin-shopify:* pnpm dev
```

---

## 水合注意事项

> 详细原理见 `docs/hydration-issues.md`。以下是开发时必须遵守的规范。

### 1. JSX 中相邻文本 + 表达式

相邻文本和表达式必须用模板字面量合并：

```tsx
// ❌ 水合失败：相邻文本节点不匹配
<button>-{step}</button>
<li>title = {title}</li>

// ✅ 模板字面量
<button>{`-${step}`}</button>
<li>{`title = ${title}`}</li>
```

> 插件内置了 `hydration-fix` 模块，在构建时会**自动修复**大多数此类问题。但推荐在源码层面直接使用模板字面量。

### 2. useState 初始化

不要依赖 Liquid 值初始化 useState：

```tsx
// ❌ SSR 时 Number("{{ expr }}") = NaN
const [count, setCount] = useState(Number(s.initial) || 0);

// ✅ 固定默认值 + useEffect 同步
const [count, setCount] = useState(0);
useEffect(() => { setCount(parseLiquidNumber(s.initial, 0)); }, []);
```

> 使用 `useLiquidValue(expr, "number")` 可避免此问题，它已在内部处理了 SSR/客户端的同步。

### 3. 条件渲染

避免 `{cond && <Element />}`，用 `hidden` 属性代替：

```tsx
// ❌ SSR 时表达式字符串始终 truthy → 结构不匹配
{showBanner && <Banner />}

// ✅ DOM 结构不变，仅切换属性
<section hidden={!parseLiquidBoolean(showBannerRaw)}>...</section>
```

### 4. 内联颜色值

用 CSS 自定义属性代替内联颜色：

```tsx
// ❌ 浏览器将 hex 规范化为 rgb → 不匹配
<div style={{ backgroundColor: color }} />

// ✅ CSS 变量不归一化
<div style={{ "--accent": color } as React.CSSProperties} />
```

```css
/* 配套 CSS */
.accent-bg { background-color: var(--accent, #6c63ff); }
```

---

## 常见问题

### Q: 构建后看不到生成的 Liquid 文件？

检查终端是否有错误日志，特别是：
- `shopifyMeta.name` 是否超过 25 字符
- 是否有 setting 的 `default` 为空字符串 `""`

### Q: 添加新 Section 后管理后台找不到？

Section 需要至少一个 `presets` 条目。检查 `shopifyMeta.presets`。

### Q: 页面水合报错（Minified React error #418）？

水合不匹配。常见原因见[水合注意事项](#水合注意事项)，或逐个排查：

1. 检查是否有相邻文本+表达式（场景 4）
2. 检查是否有内联颜色值（场景 2）
3. 检查 useState 是否依赖 Liquid 值（场景 5）
4. 检查是否有条件渲染导致 DOM 结构差异（场景 3）

### Q: 如何让 React 组件与原生 Liquid 文件共存？

插件只生成带 `react-` 前缀的文件，不会覆盖已有的原生 Liquid 文件。你可以在模板和 Section Group 中自由混合使用。

### Q: 如何修改构建产物输出路径？

通过 `buildDir` 配置：

```ts
vitePluginShopify({
  buildDir: "assets/react-app",  // 输出到 assets/react-app/
});
```

### Q: 生成的 JS 文件太大怎么办？

生产构建会自动压缩。Vendor chunks（`react.js`、`react-dom.js`）被提取为独立文件，可被浏览器缓存。

### Q: HTML 富文本内容如何渲染？

```tsx
const { value: html } = useSectionSettings("richtext_content");
return <div dangerouslySetInnerHTML={{ __html: html || "" }} />;
```

---

## 相关文档

- [水合问题详解](docs/hydration-issues.md)
- [架构设计文档](packages/vite-plugin-react-shopify/docs/design.md)
- [Shopify Theme Architecture](https://shopify.dev/docs/storefronts/themes/architecture)
