# vite-plugin-react-shopify 设计文档

> 维护者视角的完整架构说明。本文档描述插件的设计理念、模块职责、构建流水线、数据流和关键实现细节。

---

## 目录

1. [概述](#概述)
2. [架构总览](#架构总览)
3. [模块职责](#模块职责)
4. [构建流水线](#构建流水线)
5. [数据流详解](#数据流详解)
6. [Vite 插件体系](#vite-插件体系)
7. [配置系统](#配置系统)
8. [入口扫描与虚拟模块](#入口扫描与虚拟模块)
9. [SSR 与 esbuild 打包](#ssr-与-esbuild-打包)
10. [Liquid 模板生成](#liquid-模板生成)
11. [CSS 处理策略](#css-处理策略)
12. [水合（Hydration）机制](#水合hydration机制)
13. [Runtime 模块](#runtime-模块)
14. [类型系统](#类型系统)
15. [测试策略](#测试策略)
16. [已知问题与设计权衡](#已知问题与设计权衡)
17. [扩展指南](#扩展指南)

---

## 概述

`vite-plugin-react-shopify` 是一个 Vite 插件，允许使用 React 组件编写 Shopify 主题的 Section、Block、Snippet 和 Template。核心思路是 **SSG（Static Site Generation）**：

1. **构建时**：React 组件在 Node 环境执行 SSR，生成包含 Liquid 表达式的 HTML
2. **输出**：将 HTML 包装成 Shopify Liquid 文件（`.liquid`），注入 `{% schema %}` 配置
3. **运行时**：客户端 JS 通过 `hydrateRoot` 接管 DOM，读取 Shopify 服务端渲染后的数据

```
React 源码 (.tsx) ──[构建]──▶ Liquid 模板 (.liquid) + 客户端 JS bundle
                                    │
                                    ▼
                          Shopify 服务端渲染 ──▶ 浏览器 hydration
```

**版本**：2.0.0 | **Vite**：^8.0.0 | **语言**：TypeScript (ESM)

---

## 架构总览

插件以 **Vite Plugin 数组** 的形式返回三个子插件，分别负责不同生命周期阶段：

```
vitePluginShopify(options)
  ├── shopifyConfig    (vite-plugin-shopify:config)    — Vite 构建配置注入
  ├── shopifyEntries   (vite-plugin-shopify:entries)   — 入口发现 + 虚拟模块生成
  └── shopifySSG       (vite-plugin-shopify:ssg)       — SSG 编译 + Liquid 输出
```

### 子插件生命周期

```
Vite 构建启动
  │
  ├─ config 阶段
  │   ├── shopifyConfig:  注入 resolve/alias、build.outDir、rolldownOptions
  │   └── shopifyEntries: 扫描入口文件，注册到 build.rollupOptions.input
  │
  ├─ resolveId/load 阶段
  │   ├── shopifyEntries:  提供虚拟入口模块（hydration 代码）
  │   └── shopifySSG:      提供 vite-plugin-shopify/runtime 重导出
  │
  └─ closeBundle 阶段
      └── shopifySSG:      读取 manifest → SSR 渲染 → 生成 .liquid 文件
                              └── writeImportMapSnippet: 输出 importmap snippet
```

---

## 模块职责

### 源码目录结构

```
src/
├── index.ts                     # 插件入口，组装三个子插件
├── types/                       # 类型定义（按领域拆分）
│   ├── index.ts                 # 统一 re-export
│   ├── options.ts               # 插件配置类型
│   ├── settings.ts              # 30+ Shopify Schema Setting 类型
│   ├── shopify.ts               # ShopifyMeta / Preset 等
│   └── ssg.ts                   # SSGEntry
├── core/                        # Vite 插件核心
│   ├── config.ts                # 构建配置注入
│   ├── entries.ts               # 入口扫描 + 虚拟模块
│   ├── entry-template.ts        # 虚拟模块模板字符串
│   ├── logger.ts                # 调试日志（基于 debug 库）
│   └── options.ts               # 选项解析与默认值
├── ssg/                         # SSG 编译流水线
│   ├── index.ts                 # SSG Vite 插件
│   ├── compiler.ts              # 编译编排（入口函数）
│   ├── bundler.ts               # esbuild 打包
│   ├── renderer.ts              # SSR 渲染
│   ├── css-manager.ts           # CSS 收集 + 共享 snippet 生成
│   ├── liquid-assembler.ts      # Liquid 模板组装
│   ├── liquid-paths.ts          # 输出路径计算
│   ├── scanner.ts               # 文件扫描
│   ├── schema.ts                # Shopify {% schema %} 生成
│   ├── post-process.ts          # HTML 后处理
│   └── hydration-fix.ts         # JSX 水合兼容性自动修复
├── runtime/                     # 客户端运行时代码
│   ├── index.ts                 # 运行时公共 API
│   ├── provider.ts              # LiquidDataContext
│   └── hooks.ts                 # useLiquid 等 React hooks
└── __tests__/                   # 单元测试
    ├── entries.test.ts
    ├── liquid.test.ts
    ├── post-process.test.ts
    └── hydration-fix.test.ts
```

### 模块依赖关系

```
index.ts
  ├── core/options.ts ─────── types/options.ts
  ├── core/logger.ts ──────── (外部: debug)
  ├── core/config.ts ──────── core/options.ts, core/logger.ts
  ├── core/entries.ts ─────── core/options.ts, core/entry-template.ts, ssg/scanner.ts
  └── ssg/index.ts ────────── core/options.ts, core/logger.ts, ssg/compiler.ts

ssg/compiler.ts
  ├── ssg/scanner.ts ──────── core/options.ts, types/ssg.ts
  ├── ssg/bundler.ts ──────── core/logger.ts, ssg/hydration-fix.ts
  ├── ssg/renderer.ts ─────── core/logger.ts, ssg/post-process.ts
  ├── ssg/css-manager.ts ─── core/options.ts, core/logger.ts
  ├── ssg/liquid-assembler.ts ── types/ssg.ts, ssg/schema.ts, ssg/liquid-paths.ts
  └── ssg/liquid-paths.ts ── types/ssg.ts

runtime/
  ├── index.ts ────────────── runtime/hooks.ts, runtime/provider.ts
  ├── provider.ts ─────────── (外部: react)
  └── hooks.ts ────────────── (外部: react), runtime/provider.ts
```

---

## 构建流水线

完整的 SSG 编译流水线从源码到输出分为 **6 个阶段**：

### 阶段 0：文件扫描 (`ssg/scanner.ts`)

```
frontend/sections/Hero.tsx  ──▶ SSGEntry { kebabName: "hero", targetType: "section", ... }
frontend/blocks/Card.tsx    ──▶ SSGEntry { kebabName: "card", targetType: "block", ... }
```

- 扫描 `sourceCodeDir` 下配置的 `directories`（默认 `sections`, `blocks`, `templates`, `snippets`）
- 匹配 `**/*.{tsx,jsx}` 文件
- 根据目录名推断 `targetType`（`TYPE_BY_DIR` 映射）
- 对文件名执行 `toKebabCase()` 转换

### 阶段 1：Vite 打包

- **入口模块**：`core/entries.ts` 为每个 entry 生成虚拟模块（hydration 代码），注入到 `build.rollupOptions.input`
- **构建配置**：`core/config.ts` 注入 outDir、alias（`~` → sourceDir）、manualChunks（react/react-dom 独立 chunk）
- **产物**：JS bundles + CSS + manifest.json

### 阶段 2：CSS 分析 (`ssg/css-manager.ts`)

```
manifest.json
  ├── collectCssFiles()       # 递归遍历 chunk 的 css[] + imports[]
  ├── analyzeCssDistribution() # 统计每个 CSS 文件被几个 entry 引用
  ├── generateSharedCssSnippets() # 引用 >1 的 CSS → 生成 .liquid snippet
  └── categorizeCss()         # 将每个 entry 的 CSS 分类为 inline / snippets
```

**共享 CSS 策略**：如果多个组件引用同一 CSS 文件，提取为 snippet（`{% render 'css-xxx' %}`），避免重复内联。

### 阶段 3：esbuild 打包 (`ssg/bundler.ts`)

```
entry.tsx ──[esbuild]──▶ .ssg-tmp/.ssg-entry-{timestamp}.mjs
```

- 使用**用户项目的 esbuild**（`createRequire` 动态加载）
- 配置：`format: "esm"`, `jsx: "automatic"`, `platform: "node"`
- **CSS 处理**：自定义插件拦截 `.css` / `.module.css`，替换为空模块或 Proxy
- **水合修复**：对每个 `.tsx/.jsx` 自动执行 `autoFixAdjacentText`
- 外部化依赖：react、react-dom、vite-plugin-react-shopify

### 阶段 4：SSR 渲染 (`ssg/renderer.ts`)

```
.ssg-entry-{timestamp}.mjs ──[import + renderToStaticMarkup]──▶ HTML 字符串
```

- 动态 `import()` 临时文件，获取 `default` 导出和 `shopifyMeta` 导出
- 设置 `globalThis.__shopify_ssg_liquid_track` 用于追踪 Liquid 表达式
- 调用 React 的 `createElement` + `renderToStaticMarkup`
- **后处理**：
  - `normalizeVoidElements` — 移除自闭合标签的 `/`（`<br/>` → `<br>`）
  - `normalizeStyleAttributes` — 规范化 inline style
  - `unwrapHtmlEntities` — 反转 HTML 实体（`&amp;` → `&`）
- 收集追踪到的 Liquid 表达式

### 阶段 5：Liquid 组装 (`ssg/liquid-assembler.ts`)

```
HTML + SSGEntry + CSS + 表达式 ──▶ .liquid 文件内容
```

- **Template 类型**：直接输出 HTML（不加外层结构）
- **Section 类型**：包装 `<section>` 标签 + `id/data-section-id/data-ssg-component` 属性
- **Block 类型**：包装 `<div>` 标签 + `id/data-section-id` + `{{ block.shopify_attributes }}`
- **Snippet 类型**：简单 `<div>` 包装，不生成 `{% schema %}`
- **JSON Bridge**：将追踪到的表达式序列化为 `<script type="application/json" data-ssg-liquid>`
- **CSS 注入**：inline CSS → `{% stylesheet %}`，shared CSS → `{% render 'css-xxx' %}`
- **Schema 注入**：`ssg/schema.ts` 生成 `{% schema %}...{% endschema %}`
- **Script 引用**：`<script type="module" src="{{ 'xxx.js' | asset_url }}">`

### 阶段 6：输出 (`ssg/liquid-paths.ts`)

```
sections/react-hero.liquid
blocks/react-card.liquid
templates/page.react-index.liquid
snippets/react-product-card.liquid
```

输出路径格式：`{themeRoot}/{type}s/{prefix}{kebabName}.liquid`

---

## 数据流详解

### Liquid 数据追踪机制

这是插件最核心的设计：**SSR 阶段自动发现组件需要哪些 Liquid 数据**。

```
SSR 渲染时:
  组件调用 useSectionSettings("title")
    └─▶ useLiquid("section.settings.title")
        └─▶ 检测到 globalThis.document === undefined（Node 环境）
            ├─ 将 "section.settings.title" 加入 __shopify_ssg_liquid_track Set
            └─ 返回 { value: "{{ section.settings.title }}" }

  渲染结束后：
    ├─ trackedExpressions = ["section.settings.title", ...]
    └─ 生成 JSON bridge: { "section.settings.title": {{ section.settings.title | json }} }
```

### JSON Bridge 模式

```html
<div data-ssg-component="hero">
  <script type="application/json" data-ssg-liquid>
  {
    "section.settings.title": {{ section.settings.title | json }},
    "section.settings.color": {{ section.settings.color | json }}
  }
  </script>
  <div data-ssg-hydrate>
    <!-- SSR 生成的 HTML，Liquid 表达式已被 Shopify 替换为实际值 -->
    <h1>{{ section.settings.title }}</h1>
  </div>
</div>
```

**关键点**：
- `data-ssg-liquid` 的 JSON 通过 `| json` 过滤器提供类型安全的序列化
- `data-ssg-hydrate` 包裹 React 渲染内容，hydration 时作为容器
- `data-ssg-component` 用于 hydration JS 的选择器匹配

### 客户端水合流程

```
1. hydration JS 加载
2. scan(document) — 查找所有 [data-ssg-component="xxx"]
3. 对每个匹配元素：
   a. readLiquidData(el)  — 从 :scope > script[data-ssg-liquid] 读取 JSON
   b. 查找 :scope > [data-ssg-hydrate] 容器
   c. hydrateRoot(container, <LiquidDataProvider value={data}><Component /></>)
4. 监听 shopify:section:load / shopify:section:unload 事件
```

**隔离性保证**：
- `:scope >` 选择器确保只读取当前 section/block 的数据，不穿透到嵌套组件
- `roots Map` 防止重复水合同一容器
- `unmount` 函数在 section unload 时清理 React 根节点

---

## Vite 插件体系

### 1. shopifyConfig (`core/config.ts`)

**插件名**：`vite-plugin-shopify:config`

**职责**：为 Vite 构建注入默认配置

**注入的配置**：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `base` | `"./"` | 相对路径基础 |
| `publicDir` | `false` | 禁用 public 目录 |
| `build.outDir` | `{themeRoot}/{buildDir}` | 输出到主题 assets |
| `build.assetsDir` | `""` | 不嵌套 assets 目录 |
| `build.manifest` | `true` | 生成 manifest.json |
| `build.rolldownOptions.output.manualChunks` | react / react-dom 独立 | 保持 React 稳定 chunk 名 |
| `resolve.alias` | `~` / `@` → sourceDir | 源码路径别名 |
| `server.cors` | localhost + .myshopify.com | Shopify 编辑器跨域 |

**Watch 模式检测**：`--watch` 参数 或 `SHOPIFY_DEV_WATCH=1` 环境变量

### 2. shopifyEntries (`core/entries.ts`)

**插件名**：`vite-plugin-shopify:entries`

**职责**：扫描入口文件，生成虚拟 hydration 模块

**虚拟模块 ID**：`\0shopify:entry:{kebabName}`

**生成的 hydration 代码**（`core/entry-template.ts`）：
- 导入 React 组件
- 创建 `readLiquidData` / `hydrate` / `unmount` / `scan` / `sweep` 函数
- 注册 `shopify:section:load` 和 `shopify:section:unload` 事件监听

### 3. shopifySSG (`ssg/index.ts`)

**插件名**：`vite-plugin-shopify:ssg`

**enforce**：`"post"`（在所有插件之后执行）

**职责**：
- `closeBundle` 钩子：读取 manifest → 执行 SSG 编译流水线 → 写入 `.liquid` 文件
- `resolveId/load`：为 `vite-plugin-shopify/runtime` 提供虚拟模块重导出
- `writeImportMapSnippet`：生成 `shopify-importmap.liquid`，包含 React 的 importmap

---

## 配置系统

### 选项解析 (`core/options.ts`)

所有用户选项通过 `resolveOptions()` 解析为 `ResolvedOptions`，提供完整的默认值：

```ts
// 默认值一览
{
  themeRoot: "./",
  sourceCodeDir: "frontend",
  snippetFile: "shopify-importmap.liquid",
  buildDir: "assets",
  debug: false,
  ssg: {
    directories: ["sections", "blocks", "templates", "snippets"],
    prefix: { template: "page.react-", section: "react-", block: "react-", snippet: "react-" },
    outputName: "",
    cssPrefix: "css",
  },
  importMap: {
    react: "{{ 'react.js' | asset_url }}",
    reactDomClient: "{{ 'react-dom.js' | asset_url }}",
  }
}
```

**assetRef 函数**：处理 `buildDir` 中的子路径（如 `buildDir: "assets/sub"` → 产物路径 `sub/filename.js`）

**importMap 默认值**：自动适配 `buildDir` 子目录

### Importmap Snippet

插件自动生成 `snippets/{snippetFile}` 文件：

```html
<script type="importmap">
{
  "imports": {
    "react": "{{ 'react.js' | asset_url }}",
    "react-dom/client": "{{ 'react-dom.js' | asset_url }}"
  }
}
</script>
```

用于避免 React 被打包到每个 entry chunk 中（配合 `manualChunks` 实现）。

---

## 入口扫描与虚拟模块

### 扫描逻辑 (`ssg/scanner.ts`)

```
sourceCodeDir/
  sections/     → targetType: "section"
  blocks/       → targetType: "block"
  templates/    → targetType: "template"
  snippets/     → targetType: "snippet"
```

**kebab-case 转换**：
```ts
toKebabCase("HelloWorld")    → "hello-world"
toKebabCase("ProductCard")   → "product-card"
toKebabCase("my_component")  → "my-component"
```

### 虚拟入口模块 (`core/entry-template.ts`)

每个 entry 生成独立的 hydration 入口。模块内联了所有逻辑（不依赖外部导入），确保每个 chunk 完全独立。

**选择器模式**：
```js
const SELECTOR = '[data-ssg-component="{kebabName}"]'
```

**为什么使用 `:scope >` 选择器**：
- Section 可能包含 Block，Block 也有自己的 `data-ssg-liquid`
- `:scope >` 限制查询范围为直接子元素，防止读取嵌套组件的数据

---

## SSR 与 esbuild 打包

### 打包器 (`ssg/bundler.ts`)

使用**用户项目中的 esbuild**（而非插件依赖），原因：
- 避免版本冲突
- 尊重用户的 esbuild 配置
- 通过 `createRequire` 动态解析

**自定义 esbuild 插件**：

1. **ssg-hydration-fix**：对每个 `.tsx/.jsx` 加载时自动执行 `autoFixAdjacentText`
2. **ssg-strip-css**：将 CSS 导入替换为空模块
   - `.module.css` → Proxy 对象（`obj.key` 返回 key 名）
   - `.css` → 空字符串

### 渲染器 (`ssg/renderer.ts`)

通过动态 `import()` 加载 esbuild 产物，执行 SSR：

```ts
const mod = await import("file://" + tmpFile);
const Component = mod.default;
const shopifyMeta = mod.shopifyMeta;

globalThis.__shopify_ssg_liquid_track = new Set();
const html = renderToStaticMarkup(createElement(Component));
// trackedExpressions 已被填充
```

**为什么需要 globalThis 变量**：
- `useLiquid` hook 在 SSR 时需要知道哪些表达式被访问
- 通过 `globalThis.__shopify_ssg_liquid_track` 在 hook 和编译器之间传递数据
- 避免污染组件 props 或 context 的复杂传递

**渲染后清理**：
```ts
delete globalThis.__shopify_ssg_liquid_track;
```

---

## Liquid 模板生成

### 组装器 (`ssg/liquid-assembler.ts`)

根据 `type` 生成不同结构的 Liquid：

#### Template
```
直接输出 HTML，不包裹任何结构。
注：Template 文件作为页面骨架，不需要 Section 外层。
```

#### Section
```html
<{tag}
  id="{{ section.id }}"
  data-section-id="{{ section.id }}"
  data-ssg-component="{kebabName}"
  class="{class}"
>
  [data-ssg-liquid bridge]
  <div data-ssg-hydrate>{html}</div>
  {% content_for 'blocks' %}    ← 仅当有子 blocks 时
</{tag}>
```

#### Block
```html
{%- doc -%}
  @name {name}
  @context theme-block
{%- enddoc -%}

<{tag}
  id="{{ block.id }}"
  data-section-id="{{ section.id }}"
  data-ssg-component="{kebabName}"
  {{ block.shopify_attributes }}
>
  [data-ssg-liquid bridge]
  <div data-ssg-hydrate>{html}</div>
  {% content_for 'blocks' %}
</{tag}>
```

#### Snippet
```html
<div data-ssg-component="{kebabName}">
  [data-ssg-liquid bridge]
  <div data-ssg-hydrate>
    {html}
  </div>
</div>
```
- **不生成 `{% schema %}`**（snippet 不支持 schema）
- **不生成 `<script>` 引用**（snippet 不加载 hydration JS）

### Schema 生成器 (`ssg/schema.ts`)

将 `ShopifyMeta` 对象序列化为 Shopify `{% schema %}` 块：

```json
{% schema %}
{
  "name": "Hero",
  "tag": "section",
  "class": "hero-wrapper",
  "limit": 1,
  "settings": [...],
  "blocks": [...],
  "presets": [...]
}
{% endschema %}
```

**空字符串默认值警告**：如果 setting 的 `default` 为空字符串，会输出警告（Shopify 不允许空默认值）。

### 路径解析 (`ssg/liquid-paths.ts`)

**默认命名模式**：
```
{themeRoot}/sections/react-{kebab}.liquid
{themeRoot}/blocks/react-{kebab}.liquid
{themeRoot}/templates/page.react-{kebab}.liquid
{themeRoot}/snippets/react-{kebab}.liquid
```

**自定义命名**（`ssg.outputName`）：
```
"{kebab}"         → hero.liquid
"{pascal}"        → Hero.liquid
"{type}-{kebab}"  → section-hero.liquid
```

---

## CSS 处理策略

### CSS 收集 (`ssg/css-manager.ts`)

```
manifest.json
  chunk: {
    "shopify:entry:hero": {
      "file": "hero-abc123.js",
      "css": ["hero-abc123.css"],     ← 直接关联
      "imports": ["shared-xyz789"]    ← 间接关联（递归收集）
    }
  }
```

**递归收集**：遍历 chunk 的 `css[]` 和 `imports[]`，收集所有关联的 CSS 文件。

### 共享 CSS 提取

**策略**：如果同一个 CSS 文件被 **>1 个 entry** 引用，则提取为独立 snippet。

```
hero.css    ── 引用次数: 1 → inline 到 hero.liquid
shared.css  ── 引用次数: 3 → 生成 snippets/css-shared.liquid
```

**生成的 snippet 格式**：
```liquid
{% stylesheet %}
.shared { color: var(--text); }
{% endstylesheet %}
```

**Snippet 命名**：`{cssPrefix}-{cssBaseName}`，默认 `css-shared`。文件名的 hash 部分会被 `getCssBaseName()` 移除。

### 内联 CSS

单次引用的 CSS 直接内联到组件 Liquid 文件中：
```liquid
{% stylesheet %}
.hero { padding: 2rem; }
{% endstylesheet %}
```

---

## 水合（Hydration）机制

### 入口模块模板 (`core/entry-template.ts`)

每个组件生成独立的 hydration 入口，核心函数：

```js
// 读取 Liquid 数据（仅读取自己的，不穿透嵌套）
function readLiquidData(el) {
  const script = el.querySelector(':scope > script[data-ssg-liquid]');
  if (!script) return {};
  try { return JSON.parse(script.textContent || '{}') } catch { return {} }
}

// 水合组件
function hydrate(el) {
  const h = el.querySelector(':scope > [data-ssg-hydrate]')
           || (el.matches('[data-ssg-hydrate]') ? el : null);
  if (!h || roots.has(h)) return;
  const liquidData = readLiquidData(el);
  roots.set(h, hydrateRoot(h,
    createElement(LiquidDataProvider, { value: liquidData },
      createElement(Component)
    )
  ));
}

// 卸载组件
function unmount(el) {
  const h = el.querySelector(':scope > [data-ssg-hydrate]')
           || (el.matches('[data-ssg-hydrate]') ? el : null);
  if (h && roots.has(h)) { roots.get(h).unmount(); roots.delete(h); }
}
```

### Shopify 编辑器事件

| 事件 | 触发时机 | 处理 |
|------|----------|------|
| `shopify:section:load` | 添加 section / 修改设置 | `scan(e.target)` — 查找并 hydrate 新组件 |
| `shopify:section:unload` | 移除 section | `sweep(e.target)` — unmount 组件 |

**`scan` vs `sweep`**：
- `scan` 同时处理自身和子元素（`querySelectorAll`）
- `sweep` 同样处理自身和子元素，防止嵌套组件残留

### 水合隔离

```
<section data-ssg-component="parent-section">
  <script data-ssg-liquid>{"parent": ...}</script>      ← :scope > 只读取这个
  <div data-ssg-hydrate>
    ...
    <div data-ssg-component="child-block">
      <script data-ssg-liquid>{"child": ...}</script>    ← 子组件自己的
      <div data-ssg-hydrate>...</div>
    </div>
  </div>
</section>
```

关键保证：
- `:scope >` 选择器确保不穿透
- 每个组件独立的 `roots Map`
- `data-ssg-liquid` JSON 各组件独立

---

## Runtime 模块

### 导出结构

```ts
// package.json exports
{
  "./runtime": {
    "types": "./dist/runtime/index.d.ts",
    "default": "./dist/runtime/index.js"
  }
}
```

### LiquidDataProvider (`runtime/provider.ts`)

```tsx
const LiquidDataContext = createContext<Record<string, any>>({});
const LiquidDataProvider = LiquidDataContext.Provider;
```

hydration 入口将 `readLiquidData()` 的结果注入 Provider，所有 hook 通过 `useContext` 读取。

### Hooks (`runtime/hooks.ts`)

**`useLiquid(expr)`** — 核心 hook：
```ts
// SSR 环境（Node）：
//   注册到 __shopify_ssg_liquid_track → 返回 "{{ expr }}"
// 浏览器环境：
//   从 LiquidDataContext 读取 → 返回实际值或 undefined
```

**`useSectionSettings(key)`** → `useLiquid("section.settings.KEY")`

**`useBlockSettings(key)`** → `useLiquid("block.settings.KEY")`

**`useSnippetParams(key)`** / **`useBlockParams(key)`** → `useLiquid("KEY")`

**工具函数**：
- `parseLiquidBoolean(value)` — SSR-safe 布尔解析
- `parseLiquidNumber(value, defaultVal)` — SSR-safe 数字解析

---

## 类型系统

### 类型文件组织

| 文件 | 内容 | 行数 |
|------|------|------|
| `types/options.ts` | `Options`, `SSGOptions`, `ImportMapOptions` | ~20 |
| `types/settings.ts` | 30+ Setting 接口、union types、工具类型 | ~260 |
| `types/shopify.ts` | `ShopifyBlockType`, `ShopifyMeta`, `PresetDefinition` | ~30 |
| `types/ssg.ts` | `SSGEntry` | ~10 |
| `types/index.ts` | 统一 re-export | ~50 |

### 关键类型

**ShopifyMeta**：
```ts
interface ShopifyMeta {
  type?: ShopifyBlockType;
  name: string;
  tag?: string;
  class?: string;
  limit?: number;
  params?: string[];
  settings?: SettingSchema[];
  blocks?: BlockDefinition[];
  max_blocks?: number;
  presets?: PresetDefinition[];
  enabled_on?: Record<string, string>[];
  disabled_on?: Record<string, string>[];
  templates?: string[];
}
```

**SettingSchema**：包含 30+ Shopify schema setting 类型的联合类型（`CheckboxSetting | TextSetting | ... | ParagraphSetting` 等）。

**InferSettings**：从 settings 数组推断类型：
```ts
const settings = [
  { type: "text", id: "title", default: "Hello" },
  { type: "checkbox", id: "show", default: true },
] as const;
type S = InferSettings<typeof settings>;
// { title: string; show: boolean }
```

### 编译产物中的类型导出

`src/index.ts` 通过 `export type` 重新导出所有公共类型，确保用户可以通过：
```ts
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
```
访问所有类型定义。

---

## 测试策略

### 测试文件组织

```
src/__tests__/
├── entries.test.ts          # entry 模板字符串的结构测试
├── liquid.test.ts           # Liquid 组装器 + 路径计算测试
├── post-process.test.ts     # HTML 后处理（entity/void 元素）测试
└── hydration-fix.test.ts    # JSX hydration 自动修复测试

src/runtime/
└── hooks.test.ts            # Runtime hooks 单元测试
```

### 测试配置

```ts
// vitest.config.ts
{
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  }
}
```

### 测试覆盖范围

| 测试文件 | 覆盖内容 | 测试数 |
|----------|----------|--------|
| `entries.test.ts` | hydration 入口模块结构验证 | 9 |
| `liquid.test.ts` | Liquid 模板组装、路径计算、各种 type | 17 |
| `post-process.test.ts` | HTML entity 反转、边界情况 | 8 |
| `hydration-fix.test.ts` | JSX text+expression 自动修复 | 12 |
| `hooks.test.ts` | Runtime hooks 功能 | 12 |

### 未覆盖区域（需要关注）

- **集成测试**：完整的 SSG 编译流程（scan → bundle → render → output）
- **esbuild 打包测试**：需要 mock esbuild 或提供 fixture 项目
- **SSR 渲染测试**：需要 React 运行时环境
- **CSS 管理测试**：manifest 解析、共享 CSS 提取逻辑
- **Vite 插件端到端测试**：完整的 build → verify 流程

---

## 已知问题与设计权衡

### 1. 相邻文本+表达式水合问题

**问题**：JSX 中 `<span>text{expr}text</span>` 会生成多个文本节点，而 React hydration 期望单一节点，导致水合不匹配。

**当前方案**：`hydration-fix.ts` 在构建时自动检测并转换为模板字面量：
```tsx
// 自动修复
<span>text{expr}text</span> → <span>{`text${expr}text`}</span>
```

**局限性**：
- 仅处理单行模式；跨行的需要手动修复
- 包含子 JSX 元素的不会自动修复
- 正则匹配可能遗漏某些边界情况

### 2. useState 初始化值不匹配

**问题**：SSR 时 hook 返回 `"{{ expr }}"` 字符串，`useState(Number("{{ expr }}"))` = `NaN`；客户端水合时读取到的是实际数字，造成不匹配。

**当前方案**：文档要求用户使用固定默认值 + `useEffect` 同步：
```tsx
const [count, setCount] = useState(0);
useEffect(() => { setCount(parseLiquidNumber(s.initial, 0)); }, []);
```

### 3. 条件渲染结构不匹配

**问题**：`{value && <Element />}` 在 SSR 时 `"{{ expr }}"` 始终 truthy，水合时可能为 falsy，导致 DOM 结构不匹配。

**推荐方案**：使用 `hidden` 属性替代条件渲染：
```tsx
<section hidden={!parseLiquidBoolean(showBannerRaw)}>...</section>
```

### 4. Global state 污染

SSR 渲染使用 `globalThis.__shopify_ssg_liquid_track` 和 `globalThis.__shopify_ssg_target` 传递数据。这是有意为之：
- **优点**：不需要修改组件签名或 context 传递
- **风险**：并发渲染（当前不支持）或渲染异常未清理时可能残留

### 5. esbuild 依赖

插件依赖用户项目中的 esbuild（通过 `createRequire` 动态加载）。如果用户未安装 esbuild，SSR 会静默跳过（仅生成 hydration JS，不生成 Liquid）。

### 6. 仅支持 ESM

整个项目是纯 ESM（`"type": "module"`），不支持 CJS 消费。

---

## 扩展指南

### 添加新的 Shopify Setting 类型

1. 在 `src/types/settings.ts` 中添加接口定义：
   ```ts
   export interface NewTypeSetting extends BaseSettingSchema {
     type: "new_type";
     customField: string;
   }
   ```
2. 将其加入 `InputSettingSchema` union 类型
3. 如果需要在 schema 输出中添加额外字段，在 `src/ssg/schema.ts` 的 `serializeSetting` 中添加对应的条件分支
4. 在 `src/types/index.ts` 中添加 re-export

### 添加新的目标类型（新目录）

1. 在 `src/ssg/scanner.ts` 的 `TYPE_BY_DIR` 中添加映射
2. 在 `src/core/options.ts` 的默认 `ssg.directories` 中添加目录名
3. 在 `src/ssg/liquid-assembler.ts` 中添加对应的模板构建函数
4. 在 `src/ssg/liquid-paths.ts` 的 `typeToDir` 中添加路径映射
5. 更新 `src/types/shopify.ts` 中的 `ShopifyBlockType`

### 添加新的构建后处理步骤

在 `src/ssg/compiler.ts` 的 `compileEntry` 函数中，在 `renderEntry` 和 `assembleLiquidFile` 之间插入新的处理逻辑。

### 添加新的 Vite 配置注入

在 `src/core/config.ts` 的 `config()` 方法的 `generated` 对象中添加新配置字段。

### 运行时扩展

在 `src/runtime/` 中添加新的 hook 或工具函数，通过 `src/runtime/index.ts` 导出。
在 `src/ssg/index.ts` 的 `load` 钩子中更新 runtime re-export 列表。

### 调试

```bash
# 启用全部调试日志
DEBUG=vite-plugin-shopify:* npx vite build

# 启用特定模块
DEBUG=vite-plugin-shopify:ssg:compiler npx vite build
DEBUG=vite-plugin-shopify:ssg:bundler npx vite build

# 通过选项启用
vitePluginShopify({ debug: true })
```

各个 logger namespace：
- `vite-plugin-shopify:config`
- `vite-plugin-shopify:entries`
- `vite-plugin-shopify:ssg`
- `vite-plugin-shopify:ssg:compiler`
- `vite-plugin-shopify:ssg:bundler` (继承自 bundler.ts)
- `vite-plugin-shopify:ssg:renderer` (来自 renderer.ts 的 logger namespace 实际是 `ssg:renderer`)
- `vite-plugin-shopify:ssg:css`
- `vite-plugin-shopify:schema-gen`
- `vite-plugin-shopify:hydration-fix`
