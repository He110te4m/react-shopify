# `examples/react-dawn/` React 迁移计划

> 更新时间：2026-06-09
>
> 依据：[theme-react-refactor](./2026-06-09-theme-react-refactor.md)

当前状态：已有 Dawn v15.4.1 完整 Liquid 代码 + 1 个 Demo `TodoList` React section + `vite-plugin-react-shopify` 集成。

执行原则：这份计划是迁移路线图，不是一次性批量改造清单。每一类 Shopify 语义（Theme Block、form、paginate、product card、多实例 snippet hydration）都必须先做最小验证，再扩大迁移范围。

长期目标：迁移后的代码应该像 React 主题项目，而不是 Liquid 主题外面包一层 React。React 迁移单元必须拥有自己的组件、样式和交互边界；Liquid 和 Dawn 原文件只作为 Shopify runtime 边界、对照实现和迁移来源，不作为偷懒复用层。

---

## 0. 现状

| 项目 | 状态 |
|------|------|
| 插件集成 | ✅ `vite-plugin-react-shopify` 已配置，`pnpm build` 可产出 |
| React Section | 仅 `frontend/sections/TodoList.tsx`（Demo，非 Dawn 业务） |
| React Block | 无 |
| React Snippet | 无 |
| React 基础设施 | `frontend/components/`, `snippets/`, `templates/` 均为空 |
| 孤文件 | `sections/react-dawn-smoke-test.liquid` 存在但源文件 `DawnSmokeTest.tsx` 缺失 |
| React 产物 | `sections/react-todo-list.liquid` + `assets/react-shopify-*.js` 存在 |
| Liquid Section | 54 个，19 个含 `blocks` 定义 |
| Liquid Snippet | 38 个 |
| CSS | `assets/` 下 60+ CSS 文件，约 150 SVG icons |

---

## 1. 阶段 0：现状清理

**目标：** 移除 Demo 和孤儿文件，确认构建基线。

**任务：**

1. 删除 `sections/react-dawn-smoke-test.liquid`
2. 将 `frontend/sections/TodoList.tsx` 移至 `frontend/__examples__/`
3. 删除对应产物 `sections/react-todo-list.liquid`
4. 清理所有旧 React 产物：`assets/react-shopify-*.js` / `.css` / `.map`
5. 删除 `snippets/shopify-importmap.liquid`
6. 清理 `assets/.vite/manifest.json` 中旧 entry，或删除 `assets/.vite/` 后重建
7. 确保 `pnpm build` 后无 React entry 产物（确认空基线）

**验收：**

- `pnpm build` 通过，无 React entry 产物
- `pnpm typecheck` 通过
- `sections/react-*.liquid`、`blocks/react-*.liquid`、`snippets/react-*.liquid` 不再残留

---

## 2. 阶段 1：基础设施搭建

**目标：** 建立 `frontend/` 共享层，支撑后续 section/block 迁移。

### 2.1 样式归属策略

React 迁移单元必须拥有自己的同名 CSS 文件。迁移时允许从 Dawn 原 `assets/*.css` 复制相关规则作为初始版本，但 React entry 不应长期直接 import 原 `assets/section-*.css` 或其他 Dawn 独立 CSS 文件。

示例：

```text
assets/section-image-banner.css          # 原 Dawn CSS，保留给 Liquid 对照使用
frontend/sections/ImageBanner.tsx        # React section
frontend/sections/ImageBanner.css        # 复制并整理后的 React section CSS

assets/component-card.css                # 原 Dawn CSS，保留给 Liquid 对照使用
frontend/snippets/ProductCard.tsx        # React snippet
frontend/snippets/ProductCard.css        # React snippet CSS
```

规则：

- 保留 Dawn 原 `assets/base.css` 由 `layout/theme.liquid` 全局加载，直到所有 Liquid 对照路径不再依赖它。
- React section/block/snippet import 自己旁边的同名 CSS 文件。
- 迁移初期可以复制 Dawn CSS 相关规则，但复制后归 React 组件维护。
- 保留 Dawn BEM className 以降低视觉回归，但不要把原 Dawn CSS 文件当 React 组件样式依赖。
- 每个迁移单元完成时，应裁剪明显无用的选择器，避免整份 CSS 原样搬运。
- 共享样式必须有明确复用场景，不能因为“原来在 base.css 里”就进入共享层。
- Liquid 动态样式值只能进入 CSS custom properties；普通样式必须写在 CSS 文件中。

### 2.2 `frontend/styles/`

`frontend/styles/` 只放真正跨组件复用的 React 共享样式，不承接整份 Dawn `base.css`。

`frontend/styles/` 只放 React 迁移需要的最小共享样式：

```
frontend/styles/
├── utilities.css      # React-only 工具类；不要复制整份 base.css
└── shared.css         # 多个 React section 共享且 Dawn 没有覆盖的 class
```

禁止事项：

- 不要在 React entry 中直接 `import "../../assets/section-image-banner.css"`。
- 不要把整份 Dawn section CSS 无筛选复制到 `frontend/styles/shared.css`。
- 不要用 `useLiquidCode` 注入整块普通组件 CSS。

允许事项：

- 从 Dawn CSS 复制相关选择器到组件同名 CSS。
- 保留原 className 和 BEM 命名。
- 将 padding、颜色、宽度等 Liquid setting 映射为 CSS variables。

### 2.3 `frontend/utils/classes.ts`

BEM class 拼接工具：

```ts
b("banner")                        // → "banner"
b("banner", { heading: true })     // → "banner banner--heading"
b("banner", { mix: "grid__item" }) // → "banner grid__item"
```

### 2.4 `frontend/utils/parsers.ts`

公共解析函数：

```ts
parseMultiline(html: string): string
parseMediaSize(val: string): { width: number; height: number }
parseColorScheme(val: string): string
```

### 2.5 `frontend/i18n/`

最小可行 React i18n。不要在阶段 1 强制完成 22 种语言字典生成；前几个 section 优先复用 Shopify `t` filter，降低 hydration 和文案差异风险。

```
frontend/i18n/
├── index.ts              # t(locale, key, vars?)
├── generate.ts           # 暂缓：大量 React-only 文案出现后再实现
└── locales/
    └── en.json           # 自动生成
```

- schema 的 `t:` 保留给 Shopify Theme Editor 使用
- 前台静态文案优先用 Shopify `t` filter；React-only 动态文案再用 `frontend/i18n`
- 初始 locale 通过 `useLiquid("request.locale.iso_code")` 获取

```ts
// frontend/i18n/index.ts
import en from "./locales/en.json";

const dictionaries: Record<string, Record<string, string>> = { en };

export function t(locale: string, key: string, vars?: Record<string, string | number>) {
  const template = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
  return interpolate(template, vars);
}
```

### 2.6 `frontend/icons/`

Icon registry，封装常用 SVG icon：

```
frontend/icons/
├── index.tsx      # Icon 组件 + IconName 类型
└── icons.ts       # icon 名称常量
```

```tsx
<Icon name="cart" />
<Icon name="close" />
<Icon name="search" />
<Icon name="arrow" />
<Icon name="hamburger" />
<Icon name="play" />
<Icon name="caret" />
// ... 按需从 assets/*.svg 封装
```

### 2.7 `frontend/lib/`

从 `assets/global.js` 提取基础工具函数（TypeScript 重写）：

```
frontend/lib/
├── debounce.ts
├── throttle.ts
├── trapFocus.ts
├── mediaQuery.ts
└── index.ts
```

### 2.8 `.gitignore` 补充确认

确认已包含以下 ignore 规则：

```gitignore
assets/.vite/
assets/react-shopify-*.js
assets/react-shopify-*.js.map
assets/react-shopify-*.css
assets/react-shopify-*.css.map
sections/react-*.liquid
blocks/react-*.liquid
snippets/react-*.liquid
snippets/css-*.liquid
templates/page.react-*.liquid
snippets/shopify-importmap.liquid
```

**验收：**

- `pnpm typecheck` + `pnpm build` 通过
- `frontend/` 目录结构就绪
- 样式归属规则明确：React entry 不直接 import Dawn 原 `assets/section-*.css`
- i18n 最小 API 可用；字典生成脚本不作为阶段 1 阻塞

## 3. 阶段 1.5：关键能力 Spike

**目标：** 在迁移真实 Dawn section 前，先验证高风险插件能力和主题边界。

**任务：**

1. 新增最小 `Heading` / `Text` / `Button` Theme Blocks
2. 新增一个 `BlockSlot` section，验证 add/remove/reorder block
3. 新增 nested block 最小示例，验证多层 `BlockSlot` hydrate 顺序
4. 新增一个 React snippet 多实例示例，验证 Liquid loop 中多 hydration root
5. 验证 `useLiquid("'key' | t")`、`useLiquid("routes.all_products_collection_url")` 等表达式输出

**验收：**

- Theme Editor 可添加、删除、重排 block
- nested block hydrate 无 console error
- 多实例 snippet hydrate 无重复 id / bridge 冲突
- `pnpm typecheck` + `pnpm build` 通过

## 4. 阶段 2：简单 Section 迁移

**原则：**

- 每 section 单独 PR
- 保留 Dawn BEM className
- 每个 React section 拥有同名 CSS 文件，例如 `ImageBanner.css`
- 可从 Dawn 原 CSS 复制相关规则作为初始版本，但 React entry 不直接 import 原 `assets/section-*.css`
- 原 `sections/*.liquid` 不删除（并存对照）

**迁移产出模式：**

```
frontend/sections/ImageBanner.tsx      ← React 组件
frontend/sections/ImageBanner.css      ← 从 assets/section-image-banner.css 复制并整理后的组件样式
sections/react-image-banner.liquid     ← 插件自动生成
assets/react-shopify-image-banner-*.js ← 插件自动生成
```

### 迁移列表（按复杂度递增）

| # | Section | 行数 | 复杂度 | 涉及能力 |
|---|---------|------|--------|----------|
| 1 | `main-404` | 23 | ★ | Shopify `t` filter + `routes`，无 schema/settings |
| 2 | `main-page` | 58 | ★★ | `page.title` / `page.content` + padding settings + animation class |
| 3 | `rich-text` | 355 | ★★ | 3 个 block types（heading/text/button），需前置 Theme Blocks |
| 4 | `video` | 255 | ★★ | `ShopifyVideo` Island，video setting，deferred media 逻辑需核对 |
| 5 | `image-banner` | 507 | ★★★ | `picture` + `image_tag` → `ShopifyImage`，3 个 block types |
| 6 | `collection-list` | 308 | ★★★ | blocks（collection），`image_tag`，collection object bridge |

执行顺序建议先做 `main-404` 和 `main-page`，验证 Shopify 对象、routes、translation filter、CSS variables，以及必要时最小 scoped `{% style %}`。`rich-text` 必须在阶段 1.5 的 Theme Blocks 验证通过后开始。

### rich-text 迁移示例

```tsx
// frontend/sections/RichText.tsx
import "./RichText.css";
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid, BlockSlot } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";

const settings = [
  { type: "select", id: "color_scheme", label: "Color scheme", default: "background-1", options: [...] },
  { type: "select", id: "full_width", label: "Full width", default: "true", options: [...] },
  { type: "header", content: "Desktop layout" },
  { type: "select", id: "desktop_content_position", label: "Content position", default: "center", options: [...] },
  { type: "select", id: "desktop_text_alignment", label: "Text alignment", default: "center", options: [...] },
  { type: "select", id: "desktop_content_alignment", label: "Content alignment", default: "center", options: [...] },
  { type: "header", content: "Mobile layout" },
  { type: "select", id: "mobile_content_alignment", label: "Mobile content alignment", default: "center", options: [...] },
  { type: "select", id: "mobile_text_alignment", label: "Mobile text alignment", default: "center", options: [...] },
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Rich Text (React)",
  settings,
  blocks: [{ type: "@theme" }],
  presets: [{ name: "Rich Text", category: "Text" }],
  class: "section",
} satisfies ShopifyMeta;

export default function RichText() {
  const [colorScheme] = useLiquid<string>("section.settings.color_scheme");
  const [fullWidth] = useLiquid<string>("section.settings.full_width");
  // ...

  return (
    <div className={clsx("rich-text", "color-scheme", colorScheme, { "rich-text--full-width": fullWidth === "true" })}>
      <BlockSlot />
    </div>
  );
}
```

**每 section 验证清单：**

- [ ] `pnpm build` 通过
- [ ] `sections/react-*.liquid` 产物正确，`{% schema %}` 对应 `shopifyMeta`
- [ ] Theme Editor 可添加 section，schema setting 数量/默认值一致
- [ ] 浏览器 console 无 hydration error
- [ ] 视觉与 Dawn 原版接近
- [ ] React section import 自己的同名 CSS，不直接 import Dawn 原 `assets/section-*.css`
- [ ] CSS 中普通样式在 CSS 文件内，Liquid setting 只通过 CSS variables 注入
- [ ] 原 `sections/*.liquid` 未被修改或删除

---

## 5. 阶段 3：Theme Blocks 沉淀

**目标：** 将阶段 1.5 和阶段 2 中验证过的 block 逻辑沉淀为可复用 `@theme` block。

注意：`Heading` / `Text` / `Button` 是 `rich-text` 的前置条件，不应等到 `rich-text` 完成后才开始。

| Block | 来源 section | 所属文件 |
|-------|-------------|----------|
| `Heading` | rich-text, image-banner, multicolumn | `frontend/blocks/Heading.tsx` |
| `Text` | rich-text, image-banner, multicolumn, collage | `frontend/blocks/Text.tsx` |
| `Button` / `Buttons` | rich-text, image-banner, multicolumn | `frontend/blocks/Button.tsx` 或 `Buttons.tsx` |
| `Image` | collage, multicolumn | `frontend/blocks/Image.tsx` |
| `Slide` | slideshow | `frontend/blocks/Slide.tsx` |
| `Column` | multicolumn | `frontend/blocks/Column.tsx` |
| `Row` | multirow | `frontend/blocks/Row.tsx` |

### Block 实现模式

```tsx
// frontend/blocks/Heading.tsx
import type { ShopifyMeta, SettingSchema } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import { clsx } from "../utils/classes";

const settings = [
  { type: "inline_richtext", id: "heading", label: "Heading", default: "Talk about your brand" },
  { type: "select", id: "heading_size", label: "Heading size", default: "h1", options: [
    { value: "h2", label: "Small" },
    { value: "h1", label: "Medium" },
    { value: "h0", label: "Large" },
    { value: "hxl", label: "Extra large" },
    { value: "hxxl", label: "Extra extra large" },
  ]},
] as const satisfies SettingSchema[];

export const shopifyMeta = {
  name: "Heading (React)",
  settings,
} satisfies ShopifyMeta;

export default function Heading() {
  const [text] = useLiquid<string>("block.settings.heading");
  const [size] = useLiquid<string>("block.settings.heading_size");

  return <h2 className={clsx("rich-text__heading", size)}>{text}</h2>;
}
```

**验收：**

- [ ] 每个 block 独立 build 为 `blocks/react-*.liquid`
- [ ] 在父 section `BlockSlot` 中正确渲染
- [ ] Theme Editor 可 add/remove/reorder block

注意：Theme Block 的 Shopify `type` 来自生成后的 `/blocks/*.liquid` 文件名，例如 `blocks/react-heading.liquid` 对应可被父级引用的 `{ "type": "react-heading" }`。不要在 block 自己的 `shopifyMeta` 里写 `type: "@theme"` 或 `type: "block"`。`@theme` / `@app` 只用于父级 `blocks` 允许列表。

---

## 6. 阶段 4：中等复杂度 Section

| # | Section | 行数 | 难点 |
|---|---------|------|------|
| 1 | `multicolumn` | 455 | blocks + `image_tag` + responsive grid 布局 |
| 2 | `multirow` | 中等 | blocks + `image_tag` |
| 3 | `image-with-text` | 中等 | blocks + `image_tag` + 多种 layout |
| 4 | `collapsible-content` | 中等 | `{% accordion %}` 交互 → React `useState` |
| 5 | `newsletter` | 中高 | `{% form 'customer' %}` — 默认暂缓或保留 Liquid-owned form |
| 6 | `contact-form` | 中高 | `{% form 'contact' %}` — 默认暂缓或保留 Liquid-owned form |
| 7 | `featured-collection` | 中等 | Liquid collection loop + product cards |

### Form 类处理策略

`newsletter` / `contact-form` 的 `{% form %}` 无法用 `useLiquidCode` 包裹 React children。不要默认假设 React `<form>` 能完整替代 Shopify `{% form %}`，因为 Liquid form 还负责 action、hidden input、errors、posted_successfully 等语义。

**默认方案：** React 接管外层 layout，form 区域保留 Liquid-owned DOM，或暂缓迁移。

**可选 Spike：** 单独验证 React `<form>` 直提交 Shopify endpoint 是否能覆盖当前 section 行为。

```tsx
// React 端
<form onSubmit={handleSubmit}>
  <input type="email" name="contact[email]" />
  <button type="submit">Subscribe</button>
</form>
```

如果 endpoint、错误回显、成功状态或 bot protection 语义无法等价，保持 Liquid form，不进入 React 全量迁移。

## 7. 阶段 5：复杂 Section（逐个攻坚）

每个复杂 section 单独 PR，需先写 design doc。

| # | Section | 行数 | 核心难点 |
|---|---------|------|----------|
| 1 | `collage` | 432 | 6 种 block types，复杂 grid，`image_tag` |
| 2 | `slideshow` | 591 | `slide` blocks，slider JS，autoplay，`StaticBlock` for controls |
| 3 | `footer` | 545 | 5 种 block types（link_list, brand_info, newsletter, image, text） |
| 4 | `header` | 658 | menu drawer，dropdown，mega menu，search，cart icon，`StaticBlock` |
| 5 | `main-product` | 2268 | variant picker，media gallery，buy buttons，quantity，pickup availability，price，complementary products |
| 6 | `featured-product` | 大 | 类似于 `main-product` 但简化 |
| 7 | `main-collection-product-grid` | 大 | facets + pagination（Liquid 保留）+ product cards |
| 8 | `main-cart-items` | 中等 | cart line items loop |
| 9 | `cart-drawer` | 复杂 | drawer UI + cart state + `{% form %}` |

### 复杂项处理策略

| Section | 策略 |
|---------|------|
| **collage** | React 接管 layout + block slot；`ShopifyImage` Island 处理 `image_tag` |
| **slideshow** | React 接管 slider 交互 + slide blocks；`StaticBlock` 固定 controls |
| **footer** | React 接管 block 布局 + 社交图标；Liquid 保留 newsletter form |
| **header** | `StaticBlock` 或 Liquid-owned DOM 保留 mobile drawer/menu/localization form；React 只接管验证过的静态部分 |
| **main-product** | React 接管 variant selector UI + media gallery 交互（zoom/magnify）；Liquid 保留 `{% form %}` buy buttons + price |
| **main-collection-product-grid** | React 接管 product card/item UI + facets 交互；Liquid 保留 pagination |

---

## 8. 阶段 6：Snippets 迁移

按复杂度和耦合度分批：

### 第 1 批：纯展示（优先迁）

| Snippet | 说明 |
|---------|------|
| `icon-accordion.liquid`, `icon-with-text.liquid` | 已有 `Icon` registry 替代 |
| `social-icons.liquid` | 纯展示，列表渲染 |
| `unit-price.liquid` | 可做独立 spike，确认 product/variant context 后再迁 |

### 第 2 批：卡片组件

| Snippet | 说明 |
|---------|------|
| `price.liquid` | 价格、compare-at、unit price、badges 耦合较多，先 spike 后迁 |
| `article-card.liquid` | 文章卡片，被多处引用 |
| `card-collection.liquid` | 集合卡片 |
| `card-product.liquid` | 产品卡片，引用最广，且含 quick add / price / badges，跟随 collection/product section |

### 第 3 批：Variant / Form 耦合

| Snippet | 说明 |
|---------|------|
| `buy-buttons.liquid` | 与 `{% form %}` 耦合，跟随 `main-product` |
| `product-variant-picker.liquid` | 跟随 `main-product` |
| `product-variant-options.liquid` | 跟随 `main-product` |
| `quantity-input.liquid` | 跟随 `main-product` |

### 第 4 批：纯 Liquid 控制（不迁）

| Snippet | 说明 |
|---------|------|
| `facets.liquid` | 分面筛选，Liquid 保留 |
| `pagination.liquid` | 分页，Liquid 保留 |
| `price-facet.liquid` | 价格分面，Liquid 保留 |
| `meta-tags.liquid` | SEO/head 输出，Liquid 保留 |

### 暂缓迁移（跟随复杂 section）

| Snippet | 跟随 |
|---------|------|
| `header-drawer.liquid`, `header-mega-menu.liquid`, `header-dropdown-menu.liquid`, `header-search.liquid` | header |
| `cart-drawer.liquid`, `cart-notification.liquid` | cart |
| `product-media-gallery.liquid`, `product-media.liquid`, `product-media-modal.liquid`, `product-thumbnail.liquid` | main-product |

---

## 9. 原 Dawn JS 逐步移除策略

每完成一组 React 替代后，从 `layout/theme.liquid` 移除对应 `<script>` 引用：

原则：只移除已经没有 Liquid 对照路径依赖的 JS。只要某个原 Liquid section/snippet 仍可能被 Theme Editor 使用，就不要删除它依赖的全局自定义元素或脚本。

| 完成项 | 可移除的 JS |
|--------|------------|
| slideshow React | `SlideshowComponent` script |
| product media gallery | `product-modal.js`, `media-gallery.js`, `magnify.js` |
| product variant picker | `product-form.js`, `product-info.js`, `product-model.js` |
| header 静态部分 | `details-disclosure.js`, `details-modal.js`（确认不再需要后） |
| cart drawer | `cart-drawer.js`, `cart.js` |
| facets | `facets.js` |
| search / predictive search | `search-form.js`, `predictive-search.js` |
| animations | `animations.js`（需确认 React 端是否实现 scroll reveal） |

保留不迁：
- `global.js` 中的 `QuantityInput`、`MenuDrawer`、`HeaderDrawer`、`ModalDialog` 等自定义元素（由 `StaticBlock` 继续使用）
- `pubsub.js`（pub/sub 事件总线供 Liquid 组件间通信）

---

## 10. 工时估算

| 阶段 | 估算 | 备注 |
|------|------|------|
| 阶段 0：清理 | 0.5d | |
| 阶段 1：基础设施 | 3-5d | 不把 22 语言字典生成作为阻塞 |
| 阶段 1.5：关键能力 Spike | 2-4d | nested block、多实例 hydration、Theme Editor 验证 |
| 阶段 2：简单 section (6个) | 6-9d | `main-page`、`video`、`collection-list` 可能超过 1d |
| 阶段 3：Theme Blocks (7个) | 5-7d | 前 3 个 block 需提前完成 |
| 阶段 4：中等 section (7个) | 12-16d | form 类默认暂缓或保留 Liquid DOM |
| 阶段 5：复杂 section (9个) | 25-40d | main-product / header / cart 单独可能 5d+ |
| 阶段 6：Snippets | 8-12d | price/card-product 需 spike，不按纯展示估算 |
| 阶段 7：原 JS 移除 | 3-5d | 逐项验证、移除、回归 |
| **总计** | **~65-95d** | 取决于 form/product/card 迁移深度 |

---

## 11. 风险项

| # | 风险 | 缓解措施 |
|---|------|----------|
| 1 | **form/paginate 迁与不迁边界** | form 默认保留 Liquid-owned DOM 或暂缓；React `<form>` 只作为单独 spike |
| 2 | **CSS 归属不清** | 每个 React 迁移单元必须有同名 CSS；Dawn CSS 只作为复制来源和 Liquid 对照依赖，不能被 React entry 直接 import |
| 3 | **nested block 端到端** | 多层 `BlockSlot`（如 `slideshow > slide`）需在阶段 2/3 前期验证 |
| 4 | **原 Dawn JS 逐步移除** | 每步后需回归测试，确保 Liquid 对照版本仍正常 |
| 5 | **22 种语言字典生成** | 不作为早期阻塞；先复用 Shopify `t` filter，后续再做脚本 |
| 6 | **hydration mismatch** | 遵循 `hydration-fix` 规则，每 section 验证时重点检查 console |
| 7 | **第三方库冲突** | 保留 `clientOnly` 处理 browser-only 组件，不在 SSG 阶段 import |
| 8 | **product/card/price 耦合** | `card-product`、`price` 被多处 section/snippet 引用，先 spike，避免过早替换公共 snippet |
| 9 | **SEO/head 输出** | `meta-tags.liquid` 保持 Liquid，不迁到 React snippet |

---

## 12. 验收标准

每个阶段完成时：

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] 浏览器 console 无 hydration error
- [ ] Shopify Theme Editor 可正常添加、删除、重排
- [ ] 新增 Vite chunk 都带 `chunkPrefix`（`react-shopify-`）
- [ ] `assets/` 中原 Dawn 资源未被清空或覆盖
- [ ] React 版本视觉接近 Dawn 原版
- [ ] React section/block/snippet 拥有同名 CSS 文件，不直接依赖 Dawn 原独立 CSS 文件
- [ ] 样式符合 React-first 原则：普通 CSS 在 CSS 文件，Liquid 只提供 CSS variables 或 Shopify runtime 边界
- [ ] 原 `sections/*.liquid` 未被修改或删除
