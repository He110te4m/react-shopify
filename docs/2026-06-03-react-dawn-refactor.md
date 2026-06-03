# react-dawn 彻底 React 重构方案

> 评审报告 · v2(2026-06-03 修订)
> v1 → v2 主要变化:资源全部内化到 React、Section Block 升级为 Theme Block、新增 image-banner 迁移范例、i18n 切换到 React、10 项决策已确认
> 范围:`examples/react-dawn/` 全部 67 section + 39 snippet + 20 template,以及为支撑迁移所需的 `packages/vite-plugin-react-shopify` 扩展
> 原则:保留全部原生 Dawn 资源作对照,React 版本以独立 module 形式生成,原 section/snippet/block 文件全程不修改

---

## 0. 当前状态盘点

### 0.1 仓库现状

| 项目 | 数量 / 规模 |
|---|---|
| 原生 Liquid section | 67 个,合计 ~21,265 行 |
| 原生 Liquid snippet | 39 个,合计 ~6,129 行 |
| 原生 Liquid template | 20 个 JSON |
| 原生 Liquid theme block | 0(全部为 section block 形式) |
| `assets/` 下的 CSS | 64 个,合计 ~440KB(`base.css` 单独 80KB) |
| `assets/` 下的 JS | 32 个,合计 ~280KB(`global.js` 44KB 居首) |
| `assets/` 下的 SVG | 95 个图标 + 3 个装饰 |
| `locales/` | 51 个语言文件 |
| `config/settings_schema.json` | 1455 行(主题全局 setting) |
| **孤儿 `react-*.liquid`** | **已删除**(2026-06-03) |
| **`assets/build/` 残留** | **已删除**(2026-06-03) |
| **`assets/*.css` / `assets/*.js` / `assets/*.svg`** | **永久保留**(作为 React 版本的 diff 对照快照,迁移后**不删除**) |

### 0.2 文件树概览(react-dawn 当前)

```
examples/react-dawn/
├── .gitignore / .shopifyignore / .theme-check.yml   ← 保持不动
├── config/settings_schema.json                       ← 保持不动
├── locales/*.json (51 个)                            ← 保持不动(仅作为 i18n 构建源)
├── layout/
│   ├── theme.liquid                                  ← 需精简
│   └── password.liquid                               ← 保持不动(不迁移)
├── sections/                  67 native
├── snippets/                  39 native
├── templates/                 20 JSON
├── assets/                    64 CSS + 32 JS + 95 SVG  ← **永久保留**作 diff 对照(React 内化版本经 Vite 处理,但原文件不动)
├── frontend/                  ★ 目标 React 源码目录
│   ├── components/
│   ├── icons/
│   ├── sections/
│   ├── blocks/
│   ├── snippets/
│   ├── i18n/                  ★ 新增,见 §13
│   ├── styles/
│   ├── hooks/
│   └── utils/
├── vite.config.ts             ← 保持
├── tsconfig.json              ← 保持
├── package.json               ← 保持(workspace 引用)
└── pnpm-workspace.yaml        ← 保持
```

---

## 1. 迁移铁律

1. **零修改原生 section/snippet/template** — 评审时可随时用 diff 工具对比 React 版本与 Dawn 原版的产出 HTML,任何 UX 行为不一致都属 bug。
2. **资源内化 + 原文件永久保留** — CSS、JS、SVG、icon 全部内化到 React 模块,由 Vite/esbuild 构建处理、压缩、tree-shake;**`assets/` 目录的文件永久保留作为 diff 对照快照**,任何阶段都不删除、不归档、不移动。
3. **Section Block 优先升级为 Theme Block** — Dawn 的 section block 多数是"通用 UI 元素"(heading/text/buttons/slide/row/column),跨多个 section 复用。React 版本应使用 Theme Block 形式以发挥复用价值。
4. **翻译走 React i18n,不走 Liquid t filter** — 初始语言从 `request.locale.iso_code` 注入;`locales/*.json` 编译为 i18n 表打入 chunk。
5. **插件可扩展** — `packages/vite-plugin-react-shopify` 是自有依赖,阶段 1 进行增量扩展,所有 API 改动都附带单测。

---

## 2. 资源迁移策略(总览)

| 资源类型 | v1 策略 | **v2 策略(已修正,assets 永久保留)** |
|---|---|---|
| `component-*.css` / `section-*.css` / `template-*.css` | 保留 assets 短期,逐步删除 | **全部内化为同名 React 组件的 `.css` import**,由 Vite 处理;**`assets/` 原文件永久保留**作 diff 对照;`base.css` 80KB 拆分为 `frontend/styles/tokens.css`(CSS 变量)+ 组件级 + theme.liquid 保留的 layout 段 |
| `base.css` | 拆为 tokens.css + 组件 CSS | 同上 |
| `global.js` (44KB) | 短期保留,长期重写 | **重写为 `frontend/lib/global.ts`**(pub-sub、SectionId、focus trap 等工具);**`assets/global.js` 永久保留**,`theme.liquid` 中的 `<script>` 引用逐步移除但源文件不动 |
| `cart.js` / `cart-drawer.js` / `cart-notification.js` 等 | 短期保留兜底 | **重写为 `useCart` / `useCartDrawer` / `useCartNotification` hook**;**`assets/*.js` 全部永久保留**;`theme.liquid` 的 `<script>` 引用全部移除 |
| `product-info.js` (16.8KB) 等业务 JS | 同上 | **重写为 `useProductInfo` / `useProductForm` / `useMediaGallery` hook**;**原 JS 永久保留** |
| SVG icons (95 个) | 内化为 `.tsx` 组件 | **改为按需 import 的 `Icon` 组件**(见 §3.2),原始 svg 在 `frontend/icons/svg-source/` 与 `assets/*.svg` **两处都保留** |
| 字体文件 (woff2) | 保留在 assets | **保留在 `assets/`,theme.liquid 引用**(字体由 Shopify font picker 配置,Dawn 的逻辑不变) |
| `image_picker` 图片 | 走 `useImageTag` | 同上 |
| 翻译 `t:` filter | 走 `useT` | **改为 React i18n**(见 §13),`locales/*.json` 由 Vite 插件转换为 `frontend/i18n/{locale}.json`,运行时按当前 locale 加载;`locales/*.json` 原始翻译文件**永久保留**作 i18n 构建源 |
| `placeholder_svg_tag` / `inline_asset_content` / `font_face` filter | 加入跟踪 | 跟踪实现保留为 `useAsset` / `usePlaceholderSvg` / `useFontFace` hook(以兼容 Dawn 风格的 schema 设置) |

> **v1 → v2 → v3 关键变化**:
> - v1:逐步删除 assets
> - v2:全部内化,assets 归档/删除
> - **v3(当前)**:全部内化到 React,**`assets/` 全部永久保留**作 diff 对照。React 版本与 Dawn 原版可逐文件 diff 对比,验证行为一致性。
> 任何阶段都不删除、移动、重命名 `assets/` 下的文件。

---

## 3. frontend/ 目标目录结构

```
frontend/
├── styles/                        # 共享 CSS (被插件自动提取为 snippets/css-*.liquid)
│   ├── tokens.css                 # CSS 变量 (从 base.css 提取,搭配 theme.liquid 注入值)
│   ├── layout.css                 # page-width / section-padding 工具类
│   ├── typography.css             # 标题/正文 typography
│   ├── forms.css                  # field/button/select 基础
│   └── animation.css              # scroll-trigger / cascade / hover
│
├── icons/                         # 95 个 svg → 1 个 Icon 组件 + 资源数据
│   ├── Icon.tsx                   # ★ 核心: <Icon name="caret" /> 通用组件
│   ├── registry.ts                # 名称 → SVG 路径/内容的映射(由 Vite 插件生成)
│   ├── svg-source/                # 原始 svg 保留目录(便于 diff,只读)
│   │   ├── caret.svg
│   │   ├── arrow.svg
│   │   └── ... (95 个)
│   └── index.ts                   # 统一 export
│
├── components/                    # 跨 section 复用的纯展示组件
│   ├── Button.tsx
│   ├── Heading.tsx
│   ├── Image.tsx
│   ├── Video.tsx
│   ├── Price.tsx
│   ├── Rte.tsx
│   ├── Pagination.tsx
│   ├── Form.tsx
│   ├── Disclosure.tsx
│   ├── QuantityInput.tsx
│   ├── SwatchInput.tsx
│   ├── ProductCard.tsx
│   ├── CollectionCard.tsx
│   ├── ArticleCard.tsx
│   ├── PredictiveSearch.tsx
│   ├── Facets.tsx
│   ├── LocalizationForm.tsx
│   ├── Modal.tsx
│   ├── DeferredMedia.tsx
│   ├── MediaGallery.tsx
│   ├── VariantPicker.tsx
│   ├── ShareButton.tsx
│   ├── SocialIcons.tsx
│   ├── HeaderDrawer.tsx
│   ├── MegaMenu.tsx
│   └── DropdownMenu.tsx
│
├── hooks/                         # 业务级 hooks
│   ├── useColorScheme.ts
│   ├── useSectionPadding.ts
│   ├── usePageWidth.ts
│   ├── useCart.ts
│   ├── useProductVariants.ts
│   ├── usePredictiveSearch.ts
│   ├── useLocale.ts               # ★ 取代 useT,见 §13
│   ├── useLocalization.ts
│   ├── useMediaQuery.ts
│   └── useAnimation.ts
│
├── lib/                           # ★ 新增,基础设施(原 global.js 重写)
│   ├── pubsub.ts                  # 原 pubsub.js
│   ├── section-id.ts              # 原 global.js 中的 SectionId
│   ├── focus-trap.ts              # 原 global.js
│   ├── cart-api.ts                # 原 cart.js 的 fetch 封装
│   ├── constants.ts               # 原 constants.js
│   └── index.ts
│
├── i18n/                          # ★ 新增,见 §13
│   ├── index.ts                   # 导出 useT / useLocale / LocaleProvider
│   ├── LocaleProvider.tsx
│   └── locales/                   # 由 Vite 插件生成(en.json / zh-CN.json / ...)
│
├── utils/
│   ├── classes.ts
│   ├── images.ts
│   ├── money.ts
│   ├── form.ts
│   └── url.ts
│
├── sections/                      # 67 个 .tsx
│   └── *.tsx
│
├── blocks/                        # ★ Theme Blocks,见 §5(40+ 个)
│   └── *.tsx
│
└── snippets/                      # 39 个 .tsx
    └── *.tsx
```

---

## 4. 关键基础设施

### 4.1 Icon 组件(取代 95 个分散 svg)

**目标**:用 `<Icon name="caret" />` 统一引用,所有 svg 内联在 React bundle 中(经 Vite 处理为 React.createElement 节点或 base64)。

```tsx
// frontend/icons/Icon.tsx
import type { IconName } from './registry';
import { renderIcon } from './registry';

interface IconProps {
  name: IconName;
  className?: string;
  width?: number;
  height?: number;
  ariaLabel?: string;
}

export function Icon({ name, className, width = 16, height = 16, ariaLabel }: IconProps) {
  return renderIcon(name, { className, width, height, 'aria-label': ariaLabel });
}
```

**构建时**:Vite 插件扫描 `frontend/icons/svg-source/*.svg`,生成:
- `registry.ts`:类型 `IconName = 'caret' | 'arrow' | ...`(95 个字面量类型)
- `renderIcon(name, props)`:返回对应 React 节点(SVG 内联,避免运行时 fetch)

**使用示例**:
```tsx
import { Icon } from '~/icons';

// 替代 {{ 'icon-caret.svg' | inline_asset_content }}
<Icon name="caret" className="svg-wrapper" />

// 替代 {{ 'icon-arrow.svg' | asset_url }}
<img src={iconUrl('arrow')} alt="" />
```

**辅助函数**(在 `frontend/utils/icon-url.ts`):
```ts
// SSR: 返回 {{ 'icon-arrow.svg' | asset_url }}
// Client: 返回已 hydrate 的资源 URL
export function iconUrl(name: IconName): string {
  // 由 useIconUrl hook 替代,SSR 输出 Liquid 表达式
  return useIconUrl(name);
}
```

### 4.2 内化 CSS 的策略

- 每个 React section/block/snippet 直接 `import './Xxx.css'`
- Vite 编译为独立 CSS chunk,通过 SSG 装配:
  - 单 section 使用 → 内联到 `{% stylesheet %}` 块
  - 2+ section 共享 → 自动提取为 `snippets/css-*.liquid`(插件现有能力,无需改)
- Dawn 的 CSS 类名**保留不变**:`.button--primary`, `.banner__content`, `.multicolumn-card` 等。这样 Dawn 现有的非 React 区域(layout, password, settings 面板)仍能匹配
- `base.css` 的处置:
  - 字体 / 颜色变量(`:root { --color-... }`) → `frontend/styles/tokens.css`,由 theme.liquid `{% style %}` 块从 `settings.*` 注入实际值
  - 重置、布局基础(`*, *::before { box-sizing: inherit }` 等) → `frontend/styles/base-reset.css`,由 `theme.liquid` `<head>` 一次性引入
  - 字体加载(`{{ settings.type_body_font | font_face: ... }}`) → 保留在 `theme.liquid` 的 `{% style %}` 块

### 4.3 内化 JS 的策略

- `frontend/lib/` 提供原 `global.js` / `pubsub.js` / `constants.js` 的 TypeScript 重写
- 业务 JS(`cart.js`, `product-info.js` 等)重写为 `frontend/hooks/useXxx.ts`
- 原始 `assets/*.js` 在所有依赖它的 section 迁移到 React 后,同步从 `theme.liquid` 移除 `<script>` 引用,文件归档(不删,作为"对照快照")
- `global.js` 中的 `subscribe/publish` 改名为 `on/emit`,符合 TS 风格(或不改,保持 API 兼容)

### 4.4 theme.liquid 精简(终态)

```liquid
<!doctype html>
<html class="js" lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="canonical" href="{{ canonical_url }}">

    {%- if settings.favicon != blank -%}
      <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
    {%- endif -%}

    <title>{{ page_title }}{%- if current_tags %} – tagged "{{ current_tags | join: ', ' }}"{% endif -%}
           {%- if current_page != 1 %} – Page {{ current_page }}{% endif -%}</title>

    {% if page_description %}
      <meta name="description" content="{{ page_description | escape }}">
    {% endif %}

    {% render 'meta-tags' %}
    {% render 'shopify-importmap' %}

    {# ★ 基础重置 CSS(原 base.css 的 box-sizing/body reset 段) #}
    <link rel="stylesheet" href="{{ 'base-reset.css' | asset_url }}">

    {# ★ 字体 + 颜色 token(原 base.css 的 :root 段) #}
    {% style %}
      {{ settings.type_body_font | font_face: font_display: 'swap' }}
      ...
      :root {
        --font-body-family: {{ settings.type_body_font.family }}, {{ settings.type_body_font.fallback_families }};
        ...
      }
    {% endstyle %}

    {# ★ i18n 初始 locale 注入(见 §13) #}
    <script>
      window.__SHOPIFY_I18N__ = {
        locale: {{ request.locale.iso_code | json }},
        shopCurrency: {{ cart.currency.iso_code | default: shop.currency | json }},
        moneyFormat: {{ shop.money_format | json }},
      };
    </script>

    {# ★ 基础设施(原 global.js / pubsub.js / constants.js 已重写为 frontend/lib/) #}
    {# 由 importmap 加载的 React entry 内部会导入这些 #}

    {# ★ Animations(滚动动画) — Dawn 行为不变,保留为外部脚本 #}
    {%- if settings.animations_reveal_on_scroll -%}
      <script src="{{ 'animations.js' | asset_url }}" defer="defer"></script>
    {%- endif -%}

    {{ content_for_header }}
  </head>

  <body class="gradient{% if settings.animations_hover_elements != 'none' %} animate--hover-{{ settings.animations_hover_elements }}{% endif %}">
    <a class="skip-to-content-link button visually-hidden" href="#MainContent">
      {{ 'accessibility.skip_to_text' | t }}
    </a>

    {% sections 'header-group' %}
    <main id="MainContent" class="content-for-layout focus-none" role="main" tabindex="-1">
      {{ content_for_layout }}
    </main>
    {% sections 'footer-group' %}
  </body>
</html>
```

**theme.liquid 净删除清单**(只删除 `<link>` / `<script>` 引用,**`assets/` 源文件永久保留**):
- ❌ `constants.js` / `pubsub.js` / `global.js` / `details-disclosure.js` / `details-modal.js` / `search-form.js` 的 `<script>` 引用 — 重写到 `frontend/lib/`,`assets/*.js` 文件不动
- ❌ `cart-drawer.js` / `cart-notification.js` / `predictive-search.js` / `localization-form.js` 的 `<script>` 引用 — 重写到 React hook
- ❌ `component-cart-drawer.css` / `component-cart-items.css` / `component-cart.css` / `component-discounts.css` / `component-totals.css` / `component-predictive-search.css` / `component-localization-form.css` / `component-price.css` 等的 `<link>` 引用 — 内化到 React 组件,`assets/*.css` 文件不动
- ❌ `window.shopUrl` / `window.routes` / `window.cartStrings` / `window.variantStrings` / `window.quickOrderListStrings` / `window.accessibilityStrings`(50+ 行 `<script>`) — 改由 React 从 LiquidDataProvider 读取
- ❌ `component-cart-items.css` / `component-cart-drawer.css` 等"media=print onload"trick 加载的 CSS(被 Dawn 用来减少阻塞),改由 React 接管

**保留**:
- ✅ `base.css` 的 80KB 中,字体加载 + 颜色 token 段 → `{% style %}` 内联
- ✅ `animations.js`(滚动动画,React 端不易重写)
- ✅ `{% render 'meta-tags' %}`(不迁移,见 §11)
- ✅ `password.liquid` 整体(不迁移,见 §11)
- ✅ **`assets/` 下所有文件永久保留**(不删、不移、不归档)

---

## 5. Block 类型决策(核心架构变更)

### 5.1 Dawn 当前情况

Dawn **没有任何 Theme Block** — 全部以"section block"形式定义在 section 的 `{% schema %}` 内。这意味着:
- 同一逻辑(如 `heading`、`text`)在多个 section 重复定义(代码重复严重)
- 商家无法在 `image-banner` 里插入 `rich-text` 里的 `caption` block
- 嵌套能力受限(section block 不支持嵌套)

### 5.2 决策原则

| 决策 | 适用 | React 实现 |
|---|---|---|
| **Theme Block(动态)** | block 在 2+ section 复用;block 接受 merchant 自定义 | `frontend/blocks/Xxx.tsx` + 插件生成 `blocks/react-xxx.liquid` + 父 section 用 `{ type: "@theme" }` 接受 |
| **Theme Block(私有 `_` 前缀)** | block 只在一个 section 内部用,但需要嵌套 | 同上,命名 `_xxx.tsx`;父 section/block 用 `{ type: "_xxx" }` 引用 |
| **Theme Block(静态)** | block 位置固定 + 需要从父级接收数据 | `frontend/blocks/Xxx.tsx` + 父级用 `useStaticBlock({ type: "xxx", id: "...", data: {...} })` |
| **App Block** | 允许商家插入第三方 app 提供的 block | `{ type: "@app" }` + `<AppBlock>` 组件 |
| **Section Block(保留)** | block 仅在 1 个 section 用,且简单 | 维持现状,定义在 section schema 内,plugins 现状已支持 |

### 5.3 Dawn 各 block 决策清单

| Block 名 | 出现于 | 决策 | React 路径 |
|---|---|---|---|
| `heading` | image-banner, rich-text, multirow, multicolumn, slideshow, collapsible-content, newsletter, ...(8+ sections) | **Theme Block(动态)** | `frontend/blocks/Heading.tsx` |
| `text` / `caption` | rich-text, image-banner, multirow, ... | **Theme Block(动态)** | `frontend/blocks/Text.tsx` |
| `button` / `buttons` | image-banner, rich-text | **Theme Block(动态)** | `frontend/blocks/Buttons.tsx` |
| `slide` | slideshow | **Theme Block(动态)** | `frontend/blocks/Slide.tsx` |
| `column` | multicolumn | **Theme Block(动态)** | `frontend/blocks/Column.tsx` |
| `item` | multirow | **Theme Block(动态)** | `frontend/blocks/Item.tsx` |
| `row` | collapsible-content | **Theme Block(动态)** | `frontend/blocks/Row.tsx` |
| `article` | featured-blog | **Theme Block(动态)** | `frontend/blocks/Article.tsx` |
| `image` / `product` / `collection` | collage | **Theme Block(动态)** | `frontend/blocks/CollageImage.tsx` / `CollageProduct.tsx` / `CollageCollection.tsx` |
| `announcement` | announcement-bar | **Theme Block(动态)** | `frontend/blocks/Announcement.tsx` |
| `email_form` | newsletter | **Theme Block(动态)** | `frontend/blocks/EmailForm.tsx` |
| `paragraph` | newsletter | **Theme Block(动态)** | `frontend/blocks/Paragraph.tsx` |
| `title` / `price` / `vendor` / `description` / `sku` / `rating` / `quantity_selector` / `buy_buttons` / `share` / `custom_liquid` / `collapsible_tab` / `popup` / `metafield` / `inventory_status` / `complementary_products` | main-product, featured-product | **Theme Block(动态)** | `frontend/blocks/Product*.tsx` (15 个) |
| `text`(main-product) | main-product | **Theme Block(动态)** | `frontend/blocks/ProductText.tsx` |
| `variant_picker` | main-product, featured-product | **Theme Block(动态)** | `frontend/blocks/ProductVariantPicker.tsx` |
| `_slideshow-controls` | (静态块) | **Theme Block(静态私有)** | `frontend/blocks/_SlideshowControls.tsx`,slideshow 用 `useStaticBlock` 注入位置 |
| `_slideshow-slide` | (静态块,首屏) | 视情况 | — |
| `@app` | 多处 | **App Block** | 插件运行时提供 `<AppBlock>` |

**清单统计**:
- 升级为 Theme Block(动态):约 **30+ 个**(`Heading`, `Text`, `Buttons`, `Slide`, `Column`, `Item`, `Row`, `Article`, `Collage*` 3个, `Announcement`, `EmailForm`, `Paragraph`, `Product*` 15+)
- 升级为 Theme Block(静态私有):少量(仅 slideshow 控件类)
- 保留为 Section Block:无 — 全部升级

**插件调整**:
- 现有 `buildBlock()` 已支持 `{%- doc -%}` 包装 + `{{ block.shopify_attributes }}`,无需改
- 需要新增 `useStaticBlock` hook(用于静态 block 注入位置)

### 5.4 父 section 的 schema 调整示例

**v1(Dawn 原版,image-banner)**:
```json
{
  "blocks": [
    { "type": "heading", "name": "Heading", "limit": 1, "settings": [...] },
    { "type": "text",    "name": "Text",    "limit": 1, "settings": [...] },
    { "type": "buttons", "name": "Buttons", "limit": 1, "settings": [...] }
  ],
  "presets": [
    { "name": "Image banner", "blocks": [{ "type": "heading" }, { "type": "text" }, { "type": "buttons" }] }
  ]
}
```

**v2(React 重构后,image-banner)**:
```json
{
  "blocks": [
    { "type": "@theme" },
    { "type": "@app" }
  ],
  "presets": [
    { "name": "Image banner", "blocks": [
      { "type": "heading" },
      { "type": "text" },
      { "type": "buttons" }
    ]}
  ]
}
```

> React 组件代码用 `useBlockLoop(blocks, b => <BlockRouter type={b.type} />)` 自动分发;BlockRouter 是一个 `useMemo` + 查表组件,根据 `block.type` 渲染对应 React 组件。**单一职责**:`ImageBanner.tsx` 只关心布局/样式/容器,具体 block 内容由 blocks/Heading.tsx 等独立维护。

---

## 6. 迁移原则与 image-banner 范例

### 6.1 五步分析法(每个 section/snippet 通用)

```
步骤 1: 静态分析
  - 读 .liquid 源,识别所有 `| asset_url` / `| stylesheet_tag` / `| inline_asset_content` 引用
  - 标记全部 `{%- style -%}` 内联样式块
  - 识别 schema 块、presets、blocks 列表
  - 列出该 section 的 blocks,根据 §5 决策 → Theme Block / Section Block / App Block

步骤 2: 资源盘点
  - 列出该 section 引用的全部 CSS 文件 → 进入步骤 3
  - 列出该 section 引用的全部 JS 文件 → 进入步骤 3
  - 列出该 section 引用的全部 svg → Icon 组件
  - 列出该 section 引用的全局 setting(animations_reveal_on_scroll 等) → 走 useThemeSettings

步骤 3: 资源内化计划
  - CSS → 写为同名 component.css,组件 import
  - JS → 重写为 hook,源文件最终从 theme.liquid 引用列表移除并归档
  - SVG → 注册到 Icon 组件(§4.1)
  - 字体/装饰背景 → 保留在 assets/(Dawn 的 font 流程不变)

步骤 4: 显示逻辑重写
  - 读 Liquid 模板,绘制数据流图(输入:settings + blocks + global settings → 输出:JSX)
  - Liquid 表达式 `{{ x | y }}` → 对应 hook(useImageTag / useT(已废弃,改 i18n) / useSectionPadding / ...)
  - Liquid 标签 `{% if %}` → 三元或 clsx
  - Liquid 标签 `{% for %}` / `{% case %}` → useBlockLoop + 类型分发
  - Liquid 标签 `{% form %}` / `{% paginate %}` → useForm / usePaginate
  - Liquid 标签 `{% style %}` → useSectionPadding / useStyleBlock

步骤 5: 验证
  - 浏览器渲染对比(diff 工具)
  - hydration 0 错
  - 设置项字段数 1:1 匹配
  - presets 行为一致
```

### 6.2 image-banner.liquid 完整迁移示例

#### 步骤 1:静态分析(image-banner.liquid,507 行)

- **资源**:`section-image-banner.css`(1 个,10KB)
- **内联样式块**:3 个(adapt aspect ratio、opacity、桌面端)
- **liquid 计算块**:`{%- liquid ... -%}`(35-52 行)— 计算 `widths` / `sizes` / `fetch_priority`
- **schema 字段**:14 个 setting(无 padding 段)
- **3 个 section block**:`heading`, `text`, `buttons`(均 `limit: 1`)
- **全局 setting 引用**:`settings.animations_reveal_on_scroll`

#### 步骤 2:资源盘点

| 资源 | 文件 | 大小 | 决策 |
|---|---|---|---|
| CSS | `section-image-banner.css` | 10KB | 内化为 `ImageBanner.css` |
| JS | 无 | - | - |
| SVG | 无(纯文本块) | - | - |
| 全局 | `settings.animations_reveal_on_scroll` | - | `useLiquidValue("settings.animations_reveal_on_scroll", "boolean")` |

#### 步骤 3:Block 类型决策(根据 §5.3)

`heading` / `text` / `buttons` 全部升级为 **Theme Block(动态)**:
- `heading` 已在 8+ section 复用
- `text` 已在 2+ section 复用
- `buttons` 已在 2+ section 复用

父 section image-banner 的 schema 改为 `blocks: [{ type: "@theme" }, { type: "@app" }]`。

#### 步骤 4:显示逻辑重写

| Dawn 模式 | 出现位置 | React 替代 |
|---|---|---|
| `{%- style -%}` 媒体查询 aspect ratio | 第 3-24 行 | `useSectionAspect(id, image, adapt)` hook,返回 `<style>` JSX 节点 |
| `{%- style -%}` opacity ::after | 第 26-30 行 | `<style>` JSX 节点,`useLiquidValue` 读 `image_overlay_opacity` |
| `{%- liquid -%}` 计算 widths/sizes | 第 32-52 行 | `useImageBehavior(image_behavior, image_2)` hook,返回 `{ widths, sizes, fetchPriority }` |
| 多重 `{% if %}` 链 class | 第 56 行 | `useBannerClassName(settings)` 内部用 `clsx` |
| `image_picker` | 第 58 行 | `<Image settings={...}>` 组件,内部 `useImageTag` |
| `placeholder_svg_tag` | 第 87 行 | `<ImagePlaceholder name="hero-apparel-1" />` 组件 |
| `block.shopify_attributes` | 全文 | `useShopifyAttributes()` hook |
| `block.type` 分发(heading/text/buttons) | 第 120-164 行 | `useBlockLoop(blocks, b => <BlockRouter type={b.type} />)`,BlockRouter 是查表组件 |
| `inline_richtext` 类型 heading/text | - | 直接渲染(允许 HTML 字符串) |

#### 步骤 5:React 文件结构

```tsx
// frontend/sections/ImageBanner.tsx
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import {
  useSectionSettings,
  useBlockLoop,
  useImageBehavior,
  useSectionAspect,
  useThemeSettings,
  useShopifyAttributes,
} from "vite-plugin-react-shopify/runtime";
import { useMemo } from "react";
import { clsx } from "~/utils/classes";
import { Image } from "~/components/Image";
import { ImagePlaceholder } from "~/components/ImagePlaceholder";
import { BlockRouter } from "~/blocks/BlockRouter";
import "./ImageBanner.css";

export const shopifyMeta = {
  name: "Image banner",
  tag: "section",
  class: "section",
  disabled_on: { groups: ["header", "footer"] },
  settings: [
    /* 14 个 setting,1:1 保留 */
  ],
  blocks: [
    { type: "@theme" },
    { type: "@app" },
  ],
  presets: [
    { name: "Image banner", blocks: [{ type: "heading" }, { type: "text" }, { type: "buttons" }] }
  ],
} satisfies ShopifyMeta;

export default function ImageBanner() {
  // 1. 读所有 settings(类型安全的 hook)
  const image = useSectionSettings("image");
  const image2 = useSectionSettings("image_2");
  const overlayOpacity = useSectionSettings("image_overlay_opacity");
  const imageHeight = useSectionSettings("image_height");
  const imageBehavior = useSectionSettings("image_behavior");
  const desktopContentPosition = useSectionSettings("desktop_content_position");
  const desktopContentAlignment = useSectionSettings("desktop_content_alignment");
  const showTextBox = useSectionSettings("show_text_box");
  const colorScheme = useSectionSettings("color_scheme");
  const stackImagesOnMobile = useSectionSettings("stack_images_on_mobile");
  const mobileContentAlignment = useSectionSettings("mobile_content_alignment");
  const showTextBelow = useSectionSettings("show_text_below");

  // 2. 全局 setting
  const animationsEnabled = useThemeSettings("animations_reveal_on_scroll");

  // 3. 派生计算(useMemo 缓存)
  const isFirstSection = useSectionIndex() === 1;
  const { widths, sizes, stackedSizes, halfWidth, fullWidth } = useImageBehavior(imageBehavior);
  const fetchPriority = isFirstSection ? "high" : "auto";

  // 4. 派生 className
  const bannerClass = useBannerClassName({
    imageBehavior, imageHeight, stackImagesOnMobile, showTextBelow, showTextBox, animationsEnabled,
  });

  // 5. 块循环(由 useBlockLoop 提供)
  const blockEls = useBlockLoop(blocks, (b) => (
    <BlockRouter key={b.id} type={b.type} settings={b.settings} attrs={b.attrs} />
  ));

  return (
    <div id={`Banner-${section.id}`} className={bannerClass}>
      {/* 内联样式:adapt + opacity */}
      {imageHeight === "adapt" && image && (
        <AspectRatioStyle id={section.id} image={image} />
      )}
      <OverlayOpacityStyle id={section.id} opacity={overlayOpacity} />

      {/* 图片 1 */}
      {image && (
        <div className="banner__media media">
          <Image src={image} widths={widths} sizes={sizes}
                 fetchPriority={fetchPriority} className="banner__media-image" />
        </div>
      )}
      {!image && !image2 && (
        <div className="banner__media media placeholder">
          <ImagePlaceholder name="hero-apparel-1" />
        </div>
      )}

      {/* 图片 2(平分宽度) */}
      {image2 && (
        <div className="banner__media media banner__media-half">
          <Image src={image2} widths={widths} sizes={halfWidth} fetchPriority={fetchPriority} />
        </div>
      )}

      {/* 内容区 */}
      <div className={clsx("banner__content", `banner__content--${desktopContentPosition}`, "page-width", animationsEnabled && "scroll-trigger animate--slide-in")}>
        <div className={clsx("banner__box", "content-container", "content-container--full-width-mobile", `color-${colorScheme}`, "gradient")}>
          {blockEls}
        </div>
      </div>
    </div>
  );
}
```

```tsx
// frontend/blocks/BlockRouter.tsx
import { Heading } from "./Heading";
import { Text } from "./Text";
import { Buttons } from "./Buttons";

const registry = {
  heading: Heading,
  text: Text,
  buttons: Buttons,
};

export function BlockRouter({ type, settings, attrs }: { type: string; settings: any; attrs: string }) {
  const C = registry[type as keyof typeof registry];
  if (!C) return null; // @app 块走另一路由
  return <C settings={settings} shopifyAttributes={attrs} />;
}
```

```tsx
// frontend/blocks/Heading.tsx(Theme Block)
import type { BlockMeta } from "vite-plugin-react-shopify";
import { useBlockSettings, useShopifyAttributes } from "vite-plugin-react-shopify/runtime";

export const blockMeta = {
  name: "Heading",
  settings: [
    { type: "inline_richtext", id: "heading", label: "Heading" },
    { type: "select", id: "heading_size", label: "Size", options: [...], default: "h1" },
  ],
  limit: 1,
} satisfies BlockMeta;

export default function Heading() {
  const heading = useBlockSettings("heading");
  const size = useBlockSettings("heading_size");
  const attrs = useShopifyAttributes();
  return (
    <h2 className={clsx("banner__heading", "inline-richtext", `banner__heading--${size}`)} {...attrs}>
      {heading}
    </h2>
  );
}
```

#### 步骤 6:对比验证

| 验证项 | Dawn 原版 | React 版 | 一致性 |
|---|---|---|---|
| 元素结构 | `<div id="Banner-{id}" class="banner ...">` | 同 | ✓ |
| className 数量 | 11 个 banner-* 类 | 11 个 | ✓(utils/classes 顺序对齐) |
| 媒体查询 CSS | `<style>` 块(adapt 模式) | `<style>` JSX 节点(用 useSectionAspect) | ✓ |
| `::after` opacity | `<style>` 块 | `<style>` JSX 节点 | ✓ |
| `widths` 列表 | 9 个字符串(默认)或 ambient 9 个 | useImageBehavior 输出 | ✓ |
| `sizes` 列表 | 视 image_behavior 三选一 | useImageBehavior 输出 | ✓ |
| 块渲染顺序 | for block in section.blocks | useBlockLoop 保留 | ✓ |
| block.attrs | 注入到 `<h2>` 等元素 | useShopifyAttributes 注入 | ✓ |
| schema setting 字段 | 14 个 | 14 个 | ✓ |
| presets | heading + text + buttons | 引用同 3 个 theme block | ✓ |

---

## 7. Section/Block/Snippet 详细迁移表

> 完整逐文件清单(已根据 v2 修订):
> - Block 列已用 §5.3 的决策结果标注(Theme Block / 保留)
> - 资源列已用 §2 的内化策略标注(CSS → 组件 import,JS → hook,SVG → Icon)
> - 复杂度评级 v2 不变

### 7.1 Sections — 简单(纯静态,18 个)

| 源文件 | LOC | 资源(内化后) | 目标 `frontend/sections/` | Block 决策 |
|---|---|---|---|---|
| `main-404.liquid` | 29 | 无 | `Main404.tsx` | 无 block |
| `main-page.liquid` | 57 | `section-main-page.css` | `MainPage.tsx` | 无 block |
| `page.liquid` | 50 | `section-main-page.css` | `Page.tsx` | 无 block |
| `main-list-collections.liquid` | 124 | `component-card.css`, `section-collection-list.css` | `MainListCollections.tsx` | 无 block |
| `main-blog.liquid` | 110 | `component-article-card.css`, `component-card.css`, `section-main-blog.css` | `MainBlog.tsx` | 无 block |
| `main-collection-banner.liquid` | 79 | `component-collection-hero.css` | `MainCollectionBanner.tsx` | 无 block |
| `pickup-availability.liquid` | 76 | 2 SVG → `Icon` | `PickupAvailability.tsx` | 无 block |
| `cart-icon-bubble.liquid` | 35 | 2 SVG → `Icon` | `CartIconBubble.tsx` | 无 block |
| `cart-live-region-text.liquid` | 22 | 无 | `CartLiveRegionText.tsx` | 无 block |
| `cart-notification-button.liquid` | 12 | 无 | `CartNotificationButton.tsx` | 无 block |
| `main-password-*`(3 个) | - | - | **不迁移**(password 整页) | - |
| `main-login.liquid` | 144 | `customer.css`, 2 SVG → `Icon` | `MainLogin.tsx` | 无 block |
| `main-register.liquid` | 99 | `customer.css`, 1 SVG → `Icon` | `MainRegister.tsx` | 无 block |
| `main-activate-account.liquid` | 73 | `customer.css`, 1 SVG → `Icon` | `MainActivateAccount.tsx` | 无 block |
| `main-reset-password.liquid` | 91 | `customer.css`, 1 SVG → `Icon` | `MainResetPassword.tsx` | 无 block |
| `apps.liquid` | 25 | 无 | `Apps.tsx` | 无 block |
| `custom-liquid.liquid` | 71 | 无 | `CustomLiquid.tsx` | 无 block |
| `section-password.css` | 5KB | - | **不迁移** | - |

### 7.2 Sections — 中等(19 个)

| 源文件 | LOC | 资源(内化后) | 目标 | Block 决策 |
|---|---|---|---|---|
| `main-account.liquid` | 175 | `customer.css`, 2 SVG | `MainAccount.tsx` | 暂无 |
| `main-addresses.liquid` | 412 | `customer.css`, 1 SVG, `customer.js` → `useCustomer` | `MainAddresses.tsx` | 暂无 |
| `main-order.liquid` | 432 | `customer.css`, 1 SVG | `MainOrder.tsx` | 暂无 |
| `main-article.liquid` | 458 | `section-blog-post.css`, 3 SVG | `MainArticle.tsx` | 暂无 |
| `announcement-bar.liquid` | 113 | `component-list-social.css`, `component-slider.css`, `component-slideshow.css`, `theme-editor.js` → 保留兜底, 2 SVG | `AnnouncementBar.tsx` | **Theme Block**: `announcement` |
| `image-banner.liquid` | 631 | `section-image-banner.css` | `ImageBanner.tsx` | **Theme Block**: `heading`, `text`, `buttons`(见 §6.2) |
| `image-with-text.liquid` | 630 | `component-image-with-text.css` | `ImageWithText.tsx` | **Theme Block**: 复用 `heading`, `text`, `buttons` |
| `rich-text.liquid` | 354 | `section-rich-text.css` | `RichText.tsx` | **Theme Block**: `heading`, `caption`, `text`, `button` |
| `multicolumn.liquid` | 461 | `component-slider.css`, `section-multicolumn.css`, 2 SVG | `Multicolumn.tsx` | **Theme Block**: `column` |
| `multirow.liquid` | 389 | `component-image-with-text.css` | `Multirow.tsx` | **Theme Block**: `item` |
| `collapsible-content.liquid` | 517 | `collapsible-content.css`, `component-accordion.css`, 1 SVG | `CollapsibleContent.tsx` | **Theme Block**: `row` |
| `slideshow.liquid` | 590 | `component-slider.css`, `component-slideshow.css`, `section-image-banner.css`, `theme-editor.js`, 3 SVG | `Slideshow.tsx` | **Theme Block**: `slide` + **静态私有**: `_slideshow-controls` |
| `collage.liquid` | 447 | `collage.css`, `component-card.css`, `component-deferred-media.css`, `component-modal-video.css`, `component-price.css`, 2 SVG | `Collage.tsx` | **Theme Block**: `image`, `product`, `collection` |
| `contact-form.liquid` | 175 | `section-contact-form.css`, 2 SVG | `ContactForm.tsx` | 无 block |
| `newsletter.liquid` | 268 | `component-newsletter.css`, `newsletter-section.css`, 3 SVG | `Newsletter.tsx` | **Theme Block**: `heading`, `paragraph`, `email_form` |
| `email-signup-banner.liquid` | 381 | `component-newsletter.css`, `newsletter-section.css`, `section-email-signup-banner.css`, `section-image-banner.css`, 5 SVG(2 装饰 + 3 通用) | `EmailSignupBanner.tsx` | 复用 `email_form` theme block |
| `video.liquid` | 254 | `component-deferred-media.css`, `video-section.css`, 1 SVG | `Video.tsx` | 无 block |
| `featured-blog.liquid` | 287 | `component-article-card.css`, `component-card.css`, `component-slider.css`, `section-featured-blog.css`, 1 SVG | `FeaturedBlog.tsx` | **Theme Block**: `article` |
| `featured-collection.liquid` | 507 | `component-card.css`, `component-price.css`, `component-slider.css`, `mask-blobs.css`, 5 JS 重写, `template-collection.css`, 2 SVG | `FeaturedCollection.tsx` | 无 section block(用 `card-product` snippet) |
| `related-products.liquid` | 254 | `component-card.css`, `component-price.css`, `mask-blobs.css`, `section-related-products.css`, 1 SVG | `RelatedProducts.tsx` | 无 block |
| `collection-list.liquid` | 247 | `component-card.css`, `component-slider.css`, `section-collection-list.css`, 1 SVG | `CollectionList.tsx` | 无 block |

### 7.3 Sections — 复杂(13 个)

| 源文件 | LOC | 资源(内化后,重写 JS) | 目标 | Block 决策 |
|---|---|---|---|---|
| `main-product.liquid` | 2267 | 14 CSS + 10 JS → hooks | `MainProduct.tsx` | **Theme Block**: 15+ product-* |
| `main-collection-product-grid.liquid` | 410 | 5 CSS + 7 JS → hooks | `MainCollectionProductGrid.tsx` | 无 section block(用 `card-product` snippet) |
| `main-search.liquid` | 412 | 4 CSS + 3 JS → hooks | `MainSearch.tsx` | 无 block |
| `predictive-search.liquid` | 283 | `component-predictive-search.css`, `predictive-search.js` → `usePredictiveSearch` | `PredictiveSearch.tsx` | 无 block |
| `cart-drawer.liquid` | 1115 | `cart.js` → `useCart`, `component-card.css`, `quantity-popover.css`, `quantity-popover.js` | `CartDrawer.tsx` | 无 block |
| `cart-notification.liquid` | 144 | `cart-notification.js` → `useCartNotification`, 2 SVG | `CartNotification.tsx` | 无 block |
| `cart-notification-product.liquid` | 91 | 无 | `CartNotificationProduct.tsx` | 无 block |
| `main-cart-items.liquid` | 552 | `cart.js` → `useCart`, 6 CSS, `quantity-popover.js` | `MainCartItems.tsx` | 无 block |
| `main-cart-footer.liquid` | 211 | 4 CSS, 1 SVG | `MainCartFooter.tsx` | 无 block |
| `quick-order-list.liquid` | 708 | `component-price.css`, `quantity-popover.css`, `quantity-popover.js` → `useQuantityPopover`, `quick-order-list.css`, `quick-order-list.js` → `useQuickOrderList`, 3 SVG | `QuickOrderList.tsx` | 无 block |
| `bulk-quick-order-list.liquid` | 296 | `quick-order-list.css`, `quick-order-list.js` | `BulkQuickOrderList.tsx` | 无 block |
| `header.liquid` | 657 | 6 CSS, `cart-notification.js` → `useCartNotification`, 3 SVG | `Header.tsx` | **Theme Block**: 复用已有 + 新增 `_header-menu`/`_header-logo` 私有静态 |
| `footer.liquid` | 559 | 4 CSS, 3 SVG | `Footer.tsx` | **Theme Block**: 复用已有 |
| `featured-product.liquid` | 910 | 13 CSS + 9 JS → hooks | `FeaturedProduct.tsx` | **Theme Block**: 复用 main-product 15+ product-* |

### 7.4 Snippets(39 个,全部内化)

| 源文件 | LOC | 资源(内化后) | 目标 | Block 决策 |
|---|---|---|---|---|
| `article-card.liquid` | 91 | 无 | `ArticleCard.tsx` | - |
| `buy-buttons.liquid` | 257 | `component-pickup-availability.css`, `pickup-availability.js` → `usePickupAvailability`, 2 SVG | `BuyButtons.tsx` | - |
| `card-collection.liquid` | 93 | 1 SVG | `CardCollection.tsx` | - |
| `card-product.liquid` | 651 | 5 CSS, 3 SVG | `CardProduct.tsx`(最复杂 snippet) | - |
| `cart-drawer.liquid` | 379 | `cart.js` → `useCart`, 3 CSS, 7 SVG | `CartDrawer.tsx` | - |
| `cart-notification.liquid` | 144 | 2 SVG | `CartNotification.tsx` | - |
| `country-localization.liquid` | 71 | 5 SVG | `CountryLocalization.tsx` | - |
| `facets.liquid` | 1225 | 3 CSS, `show-more.js` → `useShowMore`, 7 SVG | `Facets.tsx`(最复杂 snippet) | - |
| `gift-card-recipient-form.liquid` | 132 | `recipient-form.js` → `useRecipientForm`, 3 SVG | `GiftCardRecipientForm.tsx` | - |
| `header-drawer.liquid` | 105 | 14 SVG | `HeaderDrawer.tsx` | - |
| `header-dropdown-menu.liquid` | 80 | 1 SVG | `HeaderDropdownMenu.tsx` | - |
| `header-mega-menu.liquid` | 154 | 1 SVG | `HeaderMegaMenu.tsx` | - |
| `header-search.liquid` | 100 | 3 SVG | `HeaderSearch.tsx` | - |
| `icon-accordion.liquid` | 32 | 无 | **内联到 CollapsibleContent** | - |
| `icon-with-text.liquid` | 41 | 无 | **内联到 MegaMenu / Footer** | - |
| `language-localization.liquid` | 58 | 2 SVG | `LanguageLocalization.tsx` | - |
| `loading-spinner.liquid` | 11 | 1 SVG | `LoadingSpinner.tsx` | - |
| `meta-tags.liquid` | 103 | 无 | **不迁移**(SEO 关键) | - |
| `pagination.liquid` | 86 | `component-pagination.css`, 1 SVG | `Pagination.tsx`(配合 usePaginate) | - |
| `price-facet.liquid` | 79 | 无 | `PriceFacet.tsx` | - |
| `price.liquid` | 73 | 无 | `Price.tsx` | - |
| `product-media-gallery.liquid` | 285 | `media-gallery.js` → `useMediaGallery`, 3 SVG | `ProductMediaGallery.tsx` | - |
| `product-media-modal.liquid` | 77 | 1 SVG | `ProductMediaModal.tsx` | - |
| `product-media.liquid` | 116 | 1 SVG | `ProductMedia.tsx` | - |
| `product-thumbnail.liquid` | 99 | 3 SVG | `ProductThumbnail.tsx` | - |
| `product-variant-options.liquid` | 75 | 1 SVG | `ProductVariantOptions.tsx` | - |
| `product-variant-picker.liquid` | 207 | 无 | `ProductVariantPicker.tsx` | - |
| `progress-bar.liquid` | 39 | 无 | `ProgressBar.tsx` | - |
| `quantity-input.liquid` | 99 | 2 SVG | `QuantityInput.tsx` | - |
| `quick-order-list.liquid` | 393 | 3 SVG | `QuickOrderList.tsx` | - |
| `quick-order-list-row.liquid` | 320 | 4 SVG | `QuickOrderListRow.tsx` | - |
| `quick-order-product-row.liquid` | 156 | 无 | `QuickOrderProductRow.tsx` | - |
| `share-button.liquid` | 100 | `share.js` → `useShare`, 3 SVG | `ShareButton.tsx` | - |
| `social-icons.liquid` | 80 | 10 SVG | `SocialIcons.tsx` | - |
| `swatch-input.liquid` | 51 | 无 | `SwatchInput.tsx` | - |
| `swatch.liquid` | 31 | 无 | `Swatch.tsx` | - |
| `unit-price.liquid` | 19 | 无 | `UnitPrice.tsx` | - |
| `shopify-importmap.liquid` | 7 | - | (插件生成) | - |

### 7.5 Theme Blocks(新增,~30+)

| Block 名 | 来自 section | 资源(内化) | 目标 |
|---|---|---|---|
| `announcement` | announcement-bar | 0 | `Announcement.tsx` |
| `heading` | image-banner, rich-text, multirow, ...(8+ 复用) | 0 | `Heading.tsx` |
| `caption` | rich-text | 0 | `Caption.tsx` |
| `text` | image-banner, rich-text, ... | 0 | `Text.tsx` |
| `button` | rich-text | 0 | `ButtonBlock.tsx` |
| `buttons` | image-banner, rich-text | 0 | `Buttons.tsx` |
| `slide` | slideshow | 2 SVG | `Slide.tsx` |
| `column` | multicolumn | 0 | `Column.tsx` |
| `item` | multirow | 0 | `Item.tsx` |
| `row` | collapsible-content | 1 SVG | `Row.tsx` |
| `image` | collage | 0 | `CollageImage.tsx` |
| `product` | collage | 0 | `CollageProduct.tsx` |
| `collection` | collage | 0 | `CollageCollection.tsx` |
| `article` | featured-blog | 0 | `ArticleBlock.tsx` |
| `email_form` | newsletter | 0 | `EmailForm.tsx` |
| `paragraph` | newsletter | 0 | `Paragraph.tsx` |
| `title` | main-product, featured-product | 0 | `ProductTitle.tsx` |
| `price` | main-product, featured-product | 0 | `ProductPrice.tsx` |
| `vendor` | main-product | 0 | `ProductVendor.tsx` |
| `description` | main-product | 0 | `ProductDescription.tsx` |
| `sku` | main-product | 0 | `ProductSku.tsx` |
| `rating` | main-product | 0 | `ProductRating.tsx` |
| `quantity_selector` | main-product | 0 | `ProductQuantity.tsx` |
| `buy_buttons` | main-product | 0 | `ProductBuyButtons.tsx` |
| `share` | main-product | 0 | `ProductShare.tsx` |
| `custom_liquid` | main-product | 0 | `ProductCustomLiquid.tsx` |
| `collapsible_tab` | main-product | 0 | `ProductCollapsibleTab.tsx` |
| `popup` | main-product | 0 | `ProductPopup.tsx` |
| `metafield` | main-product | 0 | `ProductMetafield.tsx` |
| `inventory_status` | main-product | 0 | `ProductInventoryStatus.tsx` |
| `complementary_products` | main-product | 0 | `ProductComplementaryProducts.tsx` |
| `text` (main-product) | main-product | 0 | `ProductText.tsx` |
| `variant_picker` | main-product, featured-product | 0 | `ProductVariantPicker.tsx` |
| `_slideshow-controls` | (静态私有) | - | `_SlideshowControls.tsx` |
| `_header-menu` | (静态私有) | - | `_HeaderMenu.tsx` |
| `_header-logo` | (静态私有) | - | `_HeaderLogo.tsx` |
| `@app` | (运行时) | 0 | `<AppBlock>` 插件内置 |

**Theme Block 输出文件名规则**:插件生成 `blocks/react-{kebab}.liquid`(与原插件 prefix.block = "react-" 一致);私有静态块生成 `blocks/react-_-{kebab}.liquid`。

---

## 8. 插件扩展(增量 API 草案,适配 v2 策略)

### 8.1 运行时 hooks

| 新 hook | 签名 | 用途 | v2 调整 |
|---|---|---|---|
| `useStaticBlock` | `(spec: { type, id, data? }) => ReactNode` | 注入静态 block 位置 | 新增 |
| `useThemeSettings` | `(key: string) => string \| undefined` | 读 theme 级 setting(无 `section.settings.` 前缀) | 新增(原 useLiquidValue 也能读,但无类型推断) |
| `useImageBehavior` | `(behavior: string) => { widths, sizes, stackedSizes, halfWidth, fullWidth, fetchPriority }` | 封装 Dawn 的 `{%- liquid -%}` 块 | 新增 |
| `useSectionAspect` | `(id: string, image, adapt: boolean) => ReactNode` | 返回 `<style>` JSX 节点,处理 adapt aspect ratio | 新增 |
| `useIconUrl` | `(name: IconName) => string` | SSR 输出 `{{ 'icon-X.svg' \| asset_url }}`,客户端返回已 hydrate 路径 | 新增(供 `<img src>` 使用) |
| `useBlockRouter` | `(type, components) => Component` | 根据 block.type 查表返回组件 | 新增(替换手写 switch) |
| `useRawLiquid` | `(code: string) => string` | 关键:插入任意 Liquid 字符串到当前渲染位置 | v1 → v2 不变 |
| `useForm` | `(formType, options?) => { FormEl, formState, submit }` | 包装 `{% form %}` | v1 → v2 不变 |
| `usePaginate` | `(items, perPage, param?) => { page, total, totalPages, PaginationEl }` | 包装 `{% paginate %}` | v1 → v2 不变 |
| `useImageTag` | `(image, opts?) => string` | 输出 `image_tag` filter | v1 → v2 不变 |
| `useImageUrl` | `(image, width) => string` | 输出 `image_url` filter | v1 → v2 不变 |
| `useAsset` | `(path, mode?) => string` | asset_url / inline_asset_content | v1 → v2 不变 |
| `useFontFace` | `(font) => string` | 输出 @font-face 块 | v1 → v2 不变 |
| `useBlockLoop` | `<T>(blocks, render) => ReactNode` | 遍历 section.blocks | v1 → v2 不变 |
| `useBlockType` | `(blocks, type) => BlockType[]` | 过滤 | v1 → v2 不变 |
| `useShopifyAttributes` | `() => string` | 输出 `{{ block.shopify_attributes }}` | v1 → v2 不变 |
| `usePlaceholderSvg` | `(name) => string` | `placeholder_svg_tag` | v1 → v2 不变 |
| `useSectionPadding` | `(settingsKey?) => ReactNode` | 媒体查询 padding | v1 → v2 不变 |
| `useColorScheme` | `(id) => string` | className | v1 → v2 不变 |
| ~~`useT`~~ | — | — | **删除**,改用 i18n(§13) |
| `useLocale` | `() => string` | 当前 locale 标识 | 新增(配合 i18n) |
| `useT` | i18n 版的 `t(key, vars?)` 函数(取代原 useT,签名兼容) | i18n 翻译 | **替换**:从 React i18n 表读取 |

### 8.2 SSG 编译侧

| 增强点 | v1 | v2 |
|---|---|---|
| CSS Modules | 启用 | 同(优先在组件级启用) |
| `inline_asset_content` 跟踪 | ✓ | 同 |
| `placeholder_svg_tag` 跟踪 | ✓ | 同 |
| `t:` 表达式跟踪 | ✓ | **删除**(改 i18n) |
| `useBlockLoop` 嵌套 | ✓ | 同 |
| `@app` 块 | ✓ | 同 |
| `cleanOrphans` 选项 | 提议 | **不实施**(因 assets 全部内化,assets/build/ 不再被使用,可手动 `pnpm clean` 清理) |
| `useStaticBlock` 编译 | 不支持 | 新增:在指定位置插入 `{% content_for "block", type: ..., id: ... %}` |
| i18n locale 数据生成 | 不支持 | **新增**:在 build 时从 `locales/*.json` 提取指定 locale 集,生成 `frontend/i18n/locales/{locale}.ts`,按需 import |
| **不再依赖 `assets/build/` 目录的清理** | 提议 | 改:`pnpm build` 默认 `emptyOutDir: true`,`assets/build/` 自动清空 |

### 8.3 Vite 配置侧

| 增强点 | v1 | v2 |
|---|---|---|
| `react-dom/server` 不进客户端 chunk | ✓ | 同 |
| `react-dom/client` 单独 vendor | ✓ | 同 |
| 监听模式清孤儿 | 提议 | **删除**(v2 不再写孤儿,因每个 React 源都生成对应 .liquid) |
| i18n 配置 | 不支持 | **新增**:`vitePluginShopify({ i18n: { locales: ['en', 'zh-CN', ...], defaultLocale: 'en' } })`,插件按需生成 i18n chunk |

---

## 9. i18n 架构(新增,取代 useT)

### 9.1 总体目标

- 当前 Dawn 的翻译:`{{ 'sections.foo.bar' | t }}` 由 Shopify 引擎在 SSR 阶段求值
- React 端目标:把所有 locale 文件编译为 TypeScript 字典,运行时用 React 上下文切换
- 初始 locale 从 Liquid 注入(`<script>window.__SHOPIFY_I18N__ = { locale: ... }</script>`)

### 9.2 架构图

```
locales/
├── en.default.json
├── zh-CN.json
└── ... (51 个)

↓ Vite 插件 (阶段 1.8 实施)扫描

frontend/i18n/locales/   (构建产物,不进入 git)
├── en.ts                  (类型: Record<string, string>)
├── zh-CN.ts
├── fr.ts
└── index.ts               (按 locale 名称异步 import)

↓ 运行时

LocaleProvider
  - 从 window.__SHOPIFY_I18N__.locale 读初始
  - 提供 useLocale / useT / setLocale
  - 异步加载当前 locale 字典(初始用 inline 注入,避免延迟)

useT('sections.image-banner.name')
  → 内部返回 dictionary[locale]?.[key] || key
```

### 9.3 实施细节

**插件任务**:
1. 读取 `locales/*.json`,转换为嵌套对象 → 扁平化键(如 `sections.image-banner.name` 保持原状,Shopify 翻译键天然就是点分隔)
2. 生成 `frontend/i18n/locales/{locale}.ts`:
   ```ts
   export const messages = {
     "sections.image-banner.name": "Image banner",
     "sections.image-banner.settings.image.label": "Image",
     ...
   } as const;
   export type Messages = typeof messages;
   ```
3. 初始 locale 字典**直接 inline 进 vendor chunk**(避免延迟);其他 locale 按需动态 import(语言切换器)
4. 校验:每个 locale 必须有 `en.default.json` 中所有键(缺失报错)

**运行时组件**:
```tsx
// frontend/i18n/LocaleProvider.tsx
import { en } from './locales/en';
// 其他 locale 按需 import
const dictionaries = { en, 'zh-CN': () => import('./locales/zh-CN') /*...*/ };

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: string }) {
  const [dict, setDict] = useState(dictionaries[initialLocale] || en);
  const locale = useCurrentLocale();
  useEffect(() => {
    if (locale === initialLocale) return;
    dictionaries[locale]?.().then(m => setDict(m.messages));
  }, [locale]);
  return <I18nContext.Provider value={{ locale, t: (k) => dict[k] ?? k }}>{children}</I18nContext.Provider>;
}
```

```tsx
// 使用
import { useT } from '~/i18n';
const name = useT(); // 拿到 t 函数
<span>{name('sections.image-banner.name')}</span>
```

### 9.4 翻译键的获取

Dawn 的 schema 中大量使用 `t:sections.foo.bar` 形式的翻译键。**这些键直接以字符串形式写在 `shopifyMeta` 中,运行时由 useT 解析**。schema 的 name / label 字段不参与 React 运行时(它们由 Shopify 后台展示),但 settings.label 中的 `t:` 前缀字符串在 React 端不应该出现(应该用 i18n key 直接)。

> **注意**:Dawn schema 中 `label: "t:sections.image-banner.settings.image.label"` 是给 Shopify 后台看的(让 Shopify 去翻译)。React 端**不**消费这个字符串,所以不需要翻译。但如果想保持 React 端 UI 文案也能多语言,可以把 schema 的 label 改写为 i18n key 形式(如 `label: "Image"`),由 useT 解析。

**决策**:v2 阶段**保持 schema label 原样**(`t:sections.X.Y`),React 端 UI 文案(如 "Quick add" 按钮)用 useT 独立翻译。**`t:` 字符串仅在 Shopify 后台生效**。

---

## 10. 阶段化执行计划(v2 修订)

### 阶段 0 — 清理(已完成)

- ✅ 删除 13 个孤儿 `react-*.liquid`
- ✅ 删除 `assets/build/` 目录
- ✅ 验证:`git status` clean(用户已做)

### 阶段 1 — 插件扩展

按顺序提交,每个 PR 包含实现 + 单测 + 文档:

| 子阶段 | 新 API | PR 标题 |
|---|---|---|
| 1.1 | `useRawLiquid`, `useForm`, `usePaginate` | `feat(runtime): raw liquid, form, paginate hooks` |
| 1.2 | `useImageTag`, `useImageUrl`, `useAsset`, `useFontFace`, `useIconUrl` | `feat(runtime): image, asset, icon hooks` |
| 1.3 | i18n LocaleProvider + `useT`(新版) + `useLocale` + 插件 locale 生成 | `feat(i18n): react i18n system` |
| 1.4 | `useBlockLoop`, `useBlockType`, `useShopifyAttributes`, `useStaticBlock`, `useBlockRouter` | `feat(runtime): block loop and router` |
| 1.5 | `useSectionPadding`, `useColorScheme`, `useThemeSettings`, `useImageBehavior`, `useSectionAspect` | `feat(runtime): style and theme hooks` |
| 1.6 | CSS Modules 支持, `manualChunks` 拆分,`<AppBlock>` 组件 | `feat(ssg): css modules, app block` |
| 1.7 | `inline_asset_content` / `placeholder_svg_tag` filter 跟踪,删 `t:` 跟踪 | `feat(ssg): filter tracking updates` |

### 阶段 2 — 基础组件 + 简单 section(多 PR,每 PR 一个组件族)

- 2.1 `frontend/styles/*.css`(tokens / layout / typography / forms / animation, 拆分自 base.css)
- 2.2 `frontend/icons/*` 系统: `Icon.tsx` + 95 svg 源 + `registry.ts` 自动生成
- 2.3 `frontend/lib/*`(`pubsub.ts` / `section-id.ts` / `focus-trap.ts` / `cart-api.ts` / `constants.ts`)
- 2.4 `frontend/components/*` 基础组件(Button / Heading / Image / Icon / Rte / Price / Disclosure / QuantityInput 等)
- 2.5 `frontend/utils/*` 工具(classes / images / money / form / url)
- 2.6 `frontend/i18n/*` 初始化(LocaleProvider + 至少 3 个 locale 编译)
- 2.7 简单 section 一组(≤5 个 PR,每 PR 5-6 个 section)
- 2.8 简单 customer section 一组(`main-login/register/activate/reset`)

### 阶段 3 — 中等 section + snippet(按依赖排序)

- 3.1 基础 snippet:`icon-accordion` / `icon-with-text` / `loading-spinner` / `unit-price` / `progress-bar`
- 3.2 工具 snippet:`price` / `price-facet` / `pagination` / `swatch` / `swatch-input` / `quantity-input`
- 3.3 卡片 snippet:`article-card` / `card-collection` / `social-icons` / `share-button`
- 3.4 导航 snippet:`header-search` / `header-dropdown-menu` / `header-drawer` / `header-mega-menu`
- 3.5 本地化 snippet:`country-localization` / `language-localization`
- 3.6 `announcement-bar` + Theme Block `announcement`
- 3.7 `image-banner` + Theme Blocks `heading` / `text` / `buttons`(★ 范例)
- 3.8 `image-with-text` + `video`(复用 heading/text/buttons)
- 3.9 `rich-text` + Theme Blocks `heading` / `caption` / `text` / `button`
- 3.10 `multicolumn` + `multirow` + Theme Blocks `column` / `item`
- 3.11 `collapsible-content` + Theme Block `row`
- 3.12 `slideshow` + Theme Block `slide` + 静态私有 `_slideshow-controls`
- 3.13 `collage` + Theme Blocks `image` / `product` / `collection`
- 3.14 `contact-form` + `newsletter` + `email-signup-banner` + Theme Blocks `heading` / `paragraph` / `email_form`
- 3.15 `featured-blog` + `collection-list` + `main-article` + Theme Block `article`
- 3.16 `featured-collection` + `related-products`
- 3.17 customer section:`main-account` / `main-addresses` / `main-order`
- 3.18 商品 snippet:`product-variant-options` / `product-variant-picker` / `product-media` / `product-thumbnail` / `product-media-modal` / `product-media-gallery`
- 3.19 `card-product`(最复杂 snippet)
- 3.20 `gift-card-recipient-form` / `meta-tags` 决定

### 阶段 4 — 复杂 section(每 section 独立 PR)

- 4.1 `header` + 静态私有 `_header-menu` / `_header-logo`
- 4.2 `footer`(复用 heading/text/buttons)
- 4.3 `main-search` + `predictive-search` + `usePredictiveSearch`
- 4.4 `buy-buttons`
- 4.5 `cart-drawer` + `cart-notification` + `cart-notification-product`
- 4.6 `main-cart-items` + `main-cart-footer` + `useCart`
- 4.7 `quick-order-list` + `quick-order-product-row` + `quick-order-list-row` + `bulk-quick-order-list`
- 4.8 `facets` + `price-facet` + `useFacets` + `useShowMore`
- 4.9 `main-collection-product-grid`
- 4.10 `featured-product` + 复用 main-product 15+ Theme Blocks
- 4.11 `main-product` + 15+ Theme Blocks

### 阶段 5 — 集成 + theme.liquid 精简

- 5.1 替换 `header-group.json` / `footer-group.json` 的 section type 为 `react-*`
- 5.2 替换 `templates/*.json`(20 个)中的 section type 为 `react-*`
- 5.3 精简 `layout/theme.liquid`(按 §4.4 终态)
- 5.4 从 `theme.liquid` 移除 `global.js` / `cart.js` / `pubsub.js` 等 `<script>` 引用(已重写到 `frontend/lib/`,**`assets/*.js` 文件保留**)
- 5.5 从 `theme.liquid` 移除 `component-*.css` 等 `<link>` 引用(已内化到 React,**`assets/*.css` 文件保留**)
- 5.6 **不**从 `assets/` 删除任何文件(永久保留作 diff 对照)

### 阶段 6 — 文档 + 性能验证

- 6.1 `git tag dawn-original`(标记原 Dawn 版本,便于对比)
- 6.2 写 `frontend/README.md` + `QUIRKS.md`
- 6.3 Lighthouse 比对(目标 ≥ Dawn 基线)
- 6.4 最终验收:`git diff dawn-original -- assets/` 应当**为空**(证明 assets 未被修改)

---

## 11. 决策(已确认)

| # | 决策 | 状态 |
|---|---|---|
| 1 | 引入 Preact? | ❌ 不引入,保持 React 19,避免兼容问题 |
| 2 | 拆分 react-dawn 独立仓库? | ❌ 不拆,保持 monorepo 现状 |
| 3 | 迁移 `password.liquid`? | ❌ 不迁移,整页保留 |
| 4 | 修改 `config/settings_schema.json`? | ❌ 保持现状 |
| 5 | 删除 25 个彩蛋 svg(apple/banana/...) | ❌ 不删除,内化到 `<Icon name="apple" />`,`assets/*.svg` 永久保留 |
| 6 | 拆分未引用 CSS/JS 文件? | ❌ 不拆,**`assets/` 全部永久保留**作 diff 对照,任何阶段不删/不移/不归档 |
| 7 | 迁移 `meta-tags` snippet? | ❌ 不迁移,SEO 关键 |
| 8 | 翻译方案 | ✅ **i18n 走 React,不走 Liquid t filter**,初始语言从 `request.locale.iso_code` 注入(见 §13) |
| 9 | 删除 `assets/*.js` 旧文件? | ❌ **不删,永久保留**;`theme.liquid` 的 `<script>` 引用逐步移除但 `assets/*.js` 源文件不动 |
| 10 | 备份原 Dawn 资源? | ✅ `git tag dawn-original`;`assets/` 本身就是对照快照(无需 tag 备份) |

---

## 12. 风险与回退

| 风险 | 影响 | 缓解 | 回退 |
|---|---|---|---|
| i18n 阶段 1.3 工期长 | 阻塞阶段 2.6+ | 阶段 1.3 与 1.1/1.2 并行,先做基础 hook | 短期保留 `useT` 走 Liquid,阶段 6 再切 |
| Dawn 的 `global.js` 重写遗漏 API(如 `SectionId`) | header 错位 | 阶段 2.3 全量 `grep` 全局函数引用,逐一迁移 | 短期保留 `global.js` 在 theme.liquid |
| Section Block → Theme Block 升级破坏商家现有页面 | 商家设置数据失配 | presets 的 `blocks: [{ type: "heading" }]` 引用同类型名,`@theme` 替换后仍能匹配 | 回退到原 schema |
| CSS 类名全局冲突 | 视觉破坏 | **绝对不改 Dawn 选择器名** | 临时 namespace 临时 |
| `useStaticBlock` 实现复杂 | 阻塞 slideshow / header | 短期 workaround:用 `useRawLiquid` 注入 `{% content_for "block" %}` | - |
| 翻译键 `t: foo: bar` 误识别为 React 字符串 | UI 显示 `t:foo` | grep 所有 `t:` 引用,确认无 i18n 冲突 | - |
| 95 个 svg 转 React 组件遗漏 | 构建失败 | 阶段 2.2 写脚本自动生成,人工 spot-check 5 个 | - |

---

## 13. 验收标准(每个 section/snippet 完成后)

1. **DOM 像素级一致** — 同一商店同一数据,React 渲染与 Dawn 原生渲染视觉一致
2. **零 hydration error** — 浏览器 console 无 #418/#422/#423
3. **Lighthouse Performance ≥ 90**
4. **`shopify theme check` 通过**
5. **`.shopifyignore` 不变**
6. **JSON templates 可用** — `ssg.prefix.section: "react-"` 自动匹配
7. **i18n 完整** — 所有 UI 文案走 useT,无 `t:` 残留
8. **section/block schema 等价** — 商家在后台看到的设置项不变
9. **Block 类型按 §5.3 决策落地** — heading/text/buttons 等在多个 section 共享同一份 Theme Block 实现
10. **theme.liquid 引用清空** — React 化后,`theme.liquid` 中 `<link href="component-*.css">` / `<script src="*.js">` 数量为 0(仅保留 animations.js / base-reset.css / importmap / 字体相关)
11. **`assets/` 完整保留** — `git diff dawn-original -- assets/` 应当**始终为空**,证明 `assets/` 目录下任何文件从未被 React 端修改/删除/移动
12. **React 版本与 Dawn 像素级 diff** — 同一商店数据下,React 渲染 HTML 与 Dawn 渲染 HTML 经 `diff -u` 仅有 i18n 文案 + className 顺序差异(由 React DOM 自然产生),无功能性差异

---

## 14. 关键文件引用

- 插件入口: `packages/vite-plugin-react-shopify/src/index.ts:33`
- SSG 流水线: `packages/vite-plugin-react-shopify/src/ssg/compiler.ts:81`
- 模板 wrapper: `packages/vite-plugin-react-shopify/src/ssg/liquid-assembler.ts:162-253`
- 现有 `useLiquidBlock` 限制: `packages/vite-plugin-react-shopify/src/runtime/hooks.ts:277-301`
- 示例: `examples/react-shopify-example/frontend/sections/HelloWorld.tsx:1-48`
- Dawn image-banner 复杂范例: `examples/react-dawn/sections/image-banner.liquid:1-100`
- Dawn theme.liquid 全局资源: `examples/react-dawn/layout/theme.liquid:1-50`
- Dawn settings_schema: `examples/react-dawn/config/settings_schema.json:1-50`
- Block 类型决策: `.agents/skills/use-shopify-block/SKILL.md`(已加载)

---

**v1 → v2 → v3 关键变更摘要**:
- v1:资源策略逐步删除 assets
- v2:全部内化,assets 归档
- **v3(当前)**:全部内化到 React,**`assets/` 永久保留**作 diff 对照,任何阶段不删/不移/不归档
- Block 架构:Dawn 的 section block 全部升级为 Theme Block(30+ 个),实现跨 section 复用
- 翻译:i18n 切换到 React 端
- 新增:image-banner.liquid 完整迁移范例(§6.2)
- 决策:10 项已全部确认,无遗留
- 验收新增:`git diff dawn-original -- assets/` 应为空(证明 assets 未被修改)

**等待进一步评审意见**。可继续:细化阶段 1 子任务拆解 / 给出 i18n 插件实现骨架 / 写 image-banner 的 `Heading.tsx` / `Text.tsx` / `Buttons.tsx` 范例。
