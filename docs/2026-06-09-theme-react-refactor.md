# Shopify Theme React 重构方案

> 更新时间：2026-06-09
>
> 范围：用 `vite-plugin-react-shopify` 支撑 Shopify 主题以 React 编写 section、block、snippet，并通过 SSG 输出 Shopify 原生 Liquid 文件。
>
> 当前判断：插件已经可以启动并推进 Dawn 重构。剩余主要是主题侧工程量；插件侧只保留少量按需增强项。

---

## 1. 总体目标

把主题 UI 从 Liquid 模板迁移到 React/TypeScript，同时保持 Shopify 主题产物形态：

- `sections/*.liquid`
- `blocks/*.liquid`
- `snippets/*.liquid`
- `templates/*.json`
- `assets/*`

重构后仍应满足：

- Shopify Theme Editor 可用。
- section/block schema 行为保持兼容。
- 原主题静态资源保留，不因为 React 构建清空 `assets/`。
- 页面首次渲染仍由 Shopify Liquid 输出 HTML，React 只做 hydration 和交互接管。

---

## 2. 当前插件侧能力

### 2.1 SSG 到 Liquid

插件会扫描 React 源码目录：

- `frontend/sections/*.tsx`
- `frontend/blocks/*.tsx`
- `frontend/snippets/*.tsx`
- `frontend/templates/*.tsx`

然后生成对应 Shopify 文件：

- `sections/react-*.liquid`
- `blocks/react-*.liquid`
- `snippets/react-*.liquid`
- `templates/page.react-*.liquid`

React entry 会在构建阶段 SSG，输出初始 HTML，浏览器端再 hydrate。

### 2.2 Liquid 数据读取

核心 API：

```tsx
const [title] = useLiquid<string>("section.settings.title");
const [price] = useLiquid<number>("product.price", { type: "number" });
```

机制：

- SSG 阶段返回 Liquid 占位符。
- 生成 JSON bridge。
- Shopify 服务端执行 Liquid。
- 浏览器端从 bridge 读取真实值并 hydrate。

结论：主题侧不需要再设计 `useSectionSettings` / `useBlockSettings` / `useThemeSettings` 等专用 hook，统一用 `useLiquid`。

### 2.3 原始 Liquid 注入

核心 API：

```tsx
useLiquidCode(`{%- liquid
  assign price_cents = product.price
-%}`, ["product.price"]);
```

适合：

- 独立 Liquid 计算块。
- 独立 `{% style %}` 块。
- 需要插入但不包裹 React children 的 Liquid 片段。

不适合：

- `{% form %}...{% endform %}` 这类必须包裹 React children 的结构。
- `{% paginate %}...{% endpaginate %}` 这类控制列表上下文的结构。

### 2.4 Liquid-owned DOM 边界

插件提供 `Island`，用于让 Liquid 生成复杂 DOM，但 React 不接管内部节点。

已封装的组件：

- `ShopifyImage`
- `ShopifyVideo`
- `BlockSlot`
- `StaticBlock`

这些能力解决了：

- Shopify `image_tag` / `video_tag` 生成的复杂 DOM。
- React 19 自动 preload `<img>` 导致的结构风险。
- section 内 child blocks 的 Shopify-owned DOM。
- fixed-position static block。

### 2.5 Theme Block 与嵌套

插件已支持 Theme Block：

```tsx
export const shopifyMeta = {
  blocks: [{ type: "@theme" }, { type: "@app" }],
};

export default function Section() {
  return <BlockSlot />;
}
```

每个 block 是独立 React entry，有自己的 JSON bridge 和 hydration root。

需要继续实测的场景：

- Section -> Block -> Nested Block。
- Theme Editor 中 add/remove/reorder nested block。
- 多层 `BlockSlot` 的 hydrate 顺序。

这不是当前启动迁移的阻塞，但在大量布局 block 迁移前应该单独做端到端验证。

### 2.6 Static Block

插件已支持：

```tsx
<StaticBlock
  type="react-hero-banner"
  id="hero-1"
  data={{ accent: { liquid: "section.settings.accent_color" } }}
/>
```

适合：

- slideshow controls。
- header logo/menu 等固定位置私有块。
- 父 section 需要固定插入某个 block 的场景。

### 2.7 第三方库 No-SSG

插件已支持 client-only 隔离：

```tsx
const ReviewsWidget = clientOnly(
  () => import("../components/ReviewsWidget.client"),
  { fallback: <div>Loading reviews...</div> },
);
```

要求：

- 浏览器专用代码放到 `.client.tsx` 文件，或使用 `?client-only` 动态 import。
- 不要静态 import 顶层访问 `window` / `document` 的第三方库。

适合：

- 评论组件。
- 地图。
- 图表。
- A/B 测试 SDK。
- 不支持 Node SSG 的第三方 UI 库。

### 2.8 构建产物与 assets 策略

Shopify `assets/` 不支持嵌套子目录，所以插件默认把 Vite chunk 输出到 `assets/` 根目录。

插件已支持：

```ts
vitePluginShopify({
  buildDir: "assets",
  chunkPrefix: "react-shopify-",
});
```

构建前插件会：

- 读取上一轮 `.vite/manifest.json`，删除旧构建登记过的 JS/CSS。
- 删除同 `chunkPrefix` 的 orphan `.js` / `.css` / `.map`。
- 不清空整个 `assets/`。
- 不删除原主题图片、字体、SVG、原生 JS/CSS。

主题 `.gitignore` 应只忽略插件产物，例如：

```gitignore
assets/.vite/
assets/react-shopify-*.js
assets/react-shopify-*.js.map
assets/react-shopify-*.css
assets/react-shopify-*.css.map
```

---

## 3. 插件侧仍需关注的点

### 3.1 i18n：不是必须依赖 Shopify i18n

多语言有两条路线：

### 路线 A：继续使用 Shopify `t` filter

做法：

- React SSG 输出 Liquid 翻译表达式。
- Shopify 服务端执行 `{{ 'key' | t }}`。
- React hydration 通过 bridge 或 Island 复用结果。

优点：

- 复用 Shopify 原生 locale 文件。
- Theme Editor / schema 的 `t:` 语义天然兼容。
- 服务端 HTML 文案一开始就是当前语言。
- SEO 和无 JS 场景更稳。

缺点：

- React 端动态切换语言能力弱。
- 翻译变量、pluralization、复杂格式化会继续受 Liquid filter 约束。
- UI 文案如果在 React client state 中变化，需要额外 bridge 或重新请求。

### 路线 B：使用业界 React i18n

可选库：

- `react-i18next`
- `next-intl` 的非 Next 思路不直接适配，但理念可借鉴。
- `intl-messageformat`
- 自研轻量 `t(key, vars)`。

做法：

- 将 `locales/*.json` 转换为 React i18n 字典。
- 初始 locale 从 Liquid 注入：`request.locale.iso_code`。
- React SSR/SSG 阶段需要知道默认语言字典。
- 客户端按当前语言加载对应 bundle。

优点：

- React 组件内使用自然。
- 变量插值、pluralization、fallback、namespace 更成熟。
- 不需要到处写 Liquid `t` 表达式。
- 与普通 React 测试体系更兼容。

缺点：

- 需要构建期生成或复制 locale 字典。
- 需要确保 SSG HTML 和客户端首 render 使用同一 locale。
- 初始 locale 如果处理不好会 hydration mismatch。
- 可能增加 JS 体积。
- Shopify Admin schema 的 `t:` 仍然必须保留给 Shopify 使用，不能完全替代。

### 当前建议

不要把 i18n 当成插件硬阻塞。更合理的策略是混合：

- schema 的 `label` / `name` / `info` 继续保留 Shopify `t:`，因为它们给 Theme Editor 使用。
- 前台 UI 文案优先使用 React i18n。
- 初期可以先做主题侧轻量 i18n，不必马上做插件内置 i18n 系统。
- 如果多个主题都要复用，再把 locale 生成器下沉到插件。

因此 i18n 不是“插件必须先实现，否则不能重构”的问题。它是主题侧架构选择。

最低可行方案：

```tsx
// frontend/i18n/index.ts
import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

const dictionaries = { en, "zh-CN": zhCN };

export function t(locale: string, key: string, vars?: Record<string, string | number>) {
  const value = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
  return interpolate(value, vars);
}
```

插件侧只需要提供一个稳定的 locale 读取方式即可：

```tsx
const [locale] = useLiquid<string>("request.locale.iso_code");
```

如果后续发现 locale 字典生成、pluralization、动态加载重复出现，再抽成插件能力。

### 3.2 Hydration rules：不是阻塞，按需维护即可

当前插件已有 `hydration-fix`，自动修复相邻文本 + 表达式问题。

它已经覆盖最常见、最机械、最适合自动修复的一类问题：

```tsx
// 自动修复前
<button>-{step}</button>

// 修复后
<button>{`-${step}`}</button>
```

其余 hydration rules 不适合一开始做成大型框架。原因：

- 条件渲染是否危险取决于业务状态。
- inline style 是否 mismatch 取决于属性和值。
- `useState(initial)` 是否危险取决于 initial 是否来自 Liquid。
- Date/Intl 本地化风险无法自动修复。
- 第三方库副作用已经有 `clientOnly` 处理路径。

建议：

- 保持 `hydration-fix` 作为自动修复插件持续维护。
- 每次迁移中遇到可稳定识别的问题，再加一条 rule。
- rule 默认 warn，不要一开始 fail build。
- 不把 hydration-rules 作为 Dawn 迁移启动前置条件。

优先补的 rule：

- `useState()` 非字面量初始化 warning。
- JSX 中直接写 Liquid 标记 warning。
- `<img>` 直接使用 Liquid `src/srcSet` warning，建议改 `ShopifyImage`。

### 3.3 CSS Modules

当前迁移不需要 CSS Modules。

Dawn 迁移应保留原 className 和 BEM 结构，使用普通 CSS 文件：

```tsx
import "./ImageBanner.css";
```

CSS Modules 类名 SSR/CSR 同步仍有风险，但只要迁移策略禁止 `.module.css`，它不是实际障碍。

### 3.4 Form 与 Paginate

这两个不是插件当前要解决的问题。

`{% form %}` 问题：

- Liquid form 需要包裹 children。
- 当前 `useLiquidCode` 不适合包裹 React tree。
- 推荐主题侧用 React `<form>` + Shopify endpoint 提交，或暂缓迁移复杂 form。

`{% paginate %}` 问题：

- React SSG 阶段拿不到 Liquid 数组。
- 不应在 React 端实现 Shopify 分页。
- 推荐保持分页由 Liquid 控制，React 负责 item/card UI。

结论：form/paginate 是主题实现策略，不是短期插件必做 API。

---

## 4. 主题侧工作

### 4.1 目录结构

推荐：

```text
frontend/
├── sections/
├── blocks/
├── snippets/
├── components/
├── hooks/
├── utils/
├── styles/
├── icons/
├── i18n/
└── lib/
```

### 4.2 资源策略

原则：原 `assets/` 永久保留，React 侧复制或内化所需资源。

CSS：

- 保留 Dawn 原 className。
- 每个 React section/block/snippet import 自己的 CSS。
- 共享 CSS 放 `frontend/styles/`。
- 不用 CSS Modules。

JS：

- 原 Dawn JS 不直接删除。
- 逐步把行为迁到 `frontend/lib` 和 `frontend/hooks`。
- 每完成一组 React 替代后，再从 `theme.liquid` 移除对应 `<script>` 引用。

SVG：

- 原 `assets/*.svg` 保留。
- React 侧可以生成 `Icon` registry 或手工封装常用图标。

### 4.3 Theme Block 策略

Dawn section block 建议迁为 Theme Block：

- `Heading`
- `Text`
- `Buttons`
- `Slide`
- `Column`
- `Row`
- `Article`
- Product 相关 blocks

父 section 只负责布局：

```tsx
export const shopifyMeta = {
  blocks: [{ type: "@theme" }, { type: "@app" }],
};

export default function ImageBanner() {
  return (
    <section className="banner">
      <BlockSlot />
    </section>
  );
}
```

具体内容由 block entry 自己负责：

```tsx
export default function HeadingBlock() {
  const [heading] = useLiquid<string>("block.settings.heading");
  return <h2 className="banner__heading">{heading}</h2>;
}
```

### 4.4 多语言策略

建议主题侧先实现 React i18n，而不是等待插件内置 i18n。

做法：

- 保留 Shopify schema 的 `t:`。
- 前台 React UI 用 `frontend/i18n`。
- 初始 locale 用 `useLiquid("request.locale.iso_code")` 获取。
- locale 字典先手工导入或脚本生成。

后续如果 i18n 代码在多个主题重复，再抽为插件能力。

### 4.5 复杂区块处理策略

简单 section：可以直接迁移。

中等 section：先迁 layout + media + block slot。

复杂 section：每个单独设计。

复杂项包括：

- header
- footer
- main-product
- featured-product
- cart-drawer
- main-cart-items
- main-collection-product-grid
- predictive-search
- facets
- card-product

这些复杂项的主要难点在主题业务逻辑，不在插件基础设施。

---

## 5. 推荐执行顺序

### 阶段 1：插件能力验收

目标：确认当前插件能力足够稳定。

任务：

- 保留 `react-shopify-example` 的 `ClientOnlyThirdParty` 示例。
- 增加 nested block 端到端示例。
- 增加一个 React i18n 主题侧最小示例。
- 确认 `assets/` 不被清空，旧 chunk 清理正确。

### 阶段 2：基础设施

目标：为 Dawn 迁移建立主题侧基础层。

任务：

- `frontend/styles`
- `frontend/utils/classes.ts`
- `frontend/utils/parsers.ts`
- `frontend/i18n`
- `frontend/icons`
- `frontend/lib` 基础工具

### 阶段 3：简单 section

目标：迁移低风险 section，验证模式。

适合先做：

- main-page
- main-404
- rich-text
- image-banner
- video
- collection-list

每个 section 必须验证：

- build 通过。
- Theme Editor 可添加。
- hydration 无 error。
- schema setting 数量和默认值接近原版。
- 与 Dawn 原版视觉接近。

### 阶段 4：Theme Blocks

目标：沉淀可复用 block。

优先：

- Heading
- Text
- Buttons
- Image
- Slide
- Column
- Row

### 阶段 5：复杂 section/snippet

目标：逐个攻克业务逻辑重的区域。

每个复杂项单独 PR，不批量迁移。

---

## 6. 当前判断

### 已经能支持

- React 写 section/block/snippet。
- Liquid 数据 bridge。
- Liquid-owned DOM。
- Shopify image/video。
- dynamic Theme Block。
- static block。
- app block 容器。
- third-party browser-only 组件。
- Shopify assets 根目录构建产物隔离和清理。

### 不是阻塞，但要按需维护

- hydration rules。
- React i18n 的封装程度。
- nested block 的深层端到端覆盖。
- 复杂 snippet 在 Liquid loop 中多实例 hydration 的验证。

### 不建议插件短期解决

- 通用 `useForm`。
- 通用 `usePaginate`。
- CSS Modules SSR/CSR 同步。
- React 端复刻 Shopify 所有 Liquid filter。

---

## 7. 验收标准

每个迁移单元完成时至少满足：

- `pnpm typecheck` 通过。
- `pnpm test` 通过。
- `pnpm build` 通过。
- 浏览器 console 无 hydration error。
- Shopify Theme Editor 可正常添加、删除、重排。
- React 版本视觉接近 Dawn 原版。
- 不修改或删除原 Dawn `assets/` 对照资源。
- 新增 Vite chunk 都带 `chunkPrefix`。

---

## 8. 最小决策清单

当前推荐决策：

- 插件侧不再先做大型 API 设计。
- i18n 先主题侧实现 React i18n，后续再决定是否抽到插件。
- hydration-fix 持续按需增强，不作为迁移阻塞。
- form/paginate 不做通用插件 API，复杂 section 单独处理。
- CSS Modules 禁用，使用普通 CSS + Dawn className。
- Theme Block 是 Dawn block 重构主路线。
- `assets/` 永久保留，插件 chunk 用前缀隔离。
