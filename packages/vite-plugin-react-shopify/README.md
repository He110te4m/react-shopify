# vite-plugin-react-shopify

使用 React 组件编写 Shopify 主题的 Section、Block 和 Template。在构建时通过 SSG（Static Site Generation）将 React 组件编译为 Shopify Liquid 文件，运行时由 React 进行水合（hydration）。

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

---

## 目录结构

```
my-theme/
├── frontend/                 ← React 源码
│   ├── sections/
│   │   └── HelloWorld.tsx
│   ├── blocks/
│   │   └── TextBlock.tsx
│   └── templates/
│       └── index.tsx
├── sections/                 ← 生成的 Liquid + 原生 Liquid
├── blocks/
├── templates/
├── snippets/
│   └── shopify-importmap.liquid  ← 自动生成的 importmap
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
  type: "section",            // 可选，覆盖目录推断的类型
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

Setting 的 `id` 会作为 React 组件的 prop 名传入。Shopify 编辑器修改 setting 后，水合层会读取 `{{ section.settings | json }}` 将最新值传给组件。设置值通过 `useShopifySettings()` hook 读取。

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

  // === 调试 ===
  debug: false,                // 启用详细日志输出

  // === SSG 配置 ===
  ssg: {
    directories: ["sections", "blocks", "templates"], // 扫描的目录
    prefix: {                  // 生成文件的命名前缀
      template: "page.react-", // templates → page.react-xxx.liquid
      section: "react-",       // sections   → react-xxx.liquid
      block: "react-",         // blocks     → react-xxx.liquid
    },
    outputName: "",            // 自定义输出模板，留空使用前缀规则
  },

  // === Import Map 配置 ===
  importMap: {
    react: "https://esm.sh/react@19",
    reactDomClient: "https://esm.sh/react-dom@19/client",
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

- 组件文件名通过 `toKebabCase` 转换为 kebab-case：
  - `HelloWorld` → `hello-world`
  - `FAQSection` → `faq-section`

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
2. **Settings 透传**：Liquid 中 `<script type="application/json" data-ssg-props>` 包含 `{{ section.settings | json }}`
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

插件自动生成 `snippets/shopify-importmap.liquid`，包含 React 和 ReactDOM 的 CDN import map。在主题 `layout/theme.liquid` 的 `<head>` 中引入：

```liquid
{% render 'shopify-importmap' %}
```

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
vite-plugin-shopify:ssg:compiler generated shared CSS snippet react-css-SharedCard (used by 2 entries)
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

1. **React / ReactDOM 不打包进 bundle**：通过 import map 从 CDN 加载，避免重复打包和体积膨胀
2. **CSS Module hash 差异**：SSG 预渲染的 HTML 使用原始类名，水合后才会替换为 hash 类名。如需完美匹配，建议使用全局 CSS 而非 CSS Module，或接受短暂的样式跳跃
3. **SSG 使用默认 props 渲染**：构建时的预渲染使用组件的默认 prop 值，编辑器中修改 setting 后会通过水合更新
4. **Template 类型不包裹**：`type: "template"` 的组件 HTML 直接输出，不添加 section/block 外层结构，适用于整页模板
5. **Section 必须有预设才能通过编辑器添加**：没有 `presets` 的 section 需要手动在 JSON 模板中引用，编辑器无法直接添加
6. **`{% content_for 'blocks' %}` 自动插入**：当 `shopifyMeta.blocks` 非空时，插件自动在生成的 Liquid 中插入子 block 渲染标签
7. **构建产物默认输出到 `assets/`**：如需与其他静态资源隔离，可设置 `buildDir: "assets/build"` 将产物输出到子目录，然后在 `.gitignore` 中添加 `assets/build/` 忽略该目录
