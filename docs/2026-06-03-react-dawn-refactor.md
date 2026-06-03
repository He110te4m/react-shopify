# react-dawn 彻底 React 重构方案

> 评审报告 · 起草日期 2026-06-03
> 范围:`examples/react-dawn/` 全部 67 section + 39 snippet + 20 template,以及为支撑迁移所需的 `packages/vite-plugin-react-shopify` 扩展
> 原则:保留全部原生 Dawn 资源作对照,React 版本以独立 module 形式生成,原 section/snippet 文件全程不修改

---

## 0. 当前状态盘点

### 0.1 仓库现状

| 项目 | 数量 / 规模 |
|---|---|
| 原生 Liquid section | 67 个,合计 ~21,265 行 |
| 原生 Liquid snippet | 39 个,合计 ~6,129 行 |
| 原生 Liquid template | 20 个 JSON |
| `assets/` 下的 CSS | 64 个,合计 ~440KB(`base.css` 单独 80KB) |
| `assets/` 下的 JS | 32 个,合计 ~280KB(`global.js` 44KB 居首) |
| `assets/` 下的 SVG | 95 个图标 + 3 个装饰 |
| `locales/` | 51 个语言文件(由 Dawn 维护) |
| `config/settings_schema.json` | 1455 行(主题全局 setting) |
| 孤儿 `react-*.liquid` | 13 个(无源 `.tsx`) |
| `assets/build/` 残留 | 16 个产物文件 |
| 已有 `vite.config.ts` / `tsconfig.json` | ✅ 正确指向 `frontend/` |

### 0.2 文件树概览(react-dawn 当前)

```
examples/react-dawn/
├── .gitignore / .shopifyignore / .theme-check.yml   ← 保持不动
├── config/settings_schema.json                       ← 保持不动
├── locales/*.json (51 个)                            ← 保持不动
├── layout/
│   ├── theme.liquid                                  ← 需精简
│   └── password.liquid                               ← 保持不动
├── sections/                  67 native + 13 orphan react-*
├── snippets/                  39 native
├── templates/                 20 JSON
├── assets/                    64 CSS + 32 JS + 95 SVG
├── frontend/                  ★ 目标 React 源码目录
│   ├── components/            (空)
│   ├── sections/              (空)
│   ├── blocks/                (空)
│   ├── snippets/              (空)
│   └── templates/             (空)
├── vite.config.ts             ← 保持
├── tsconfig.json              ← 保持
├── package.json               ← 保持(workspace 引用)
└── pnpm-workspace.yaml        ← 保持
```

---

## 1. 迁移策略与原则

### 1.1 三条铁律

1. **零修改原生 section/snippet/template** — 你可以随时用 diff 工具对比 React 版本与 Dawn 原版的产出 HTML,任何 UX 行为不一致都属 bug。
2. **外部资源先行盘点** — 每个 section 迁移前,先在 §5 表格确认其依赖的 CSS/JS/SVG/icon 是否要搬入 React,不要漏。
3. **插件可扩展** — `packages/vite-plugin-react-shopify` 是仓库自有依赖,在阶段 1 进行增量扩展,所有 API 改动都附带单测。

### 1.2 资源迁移矩阵(通用)

| 资源类型 | 迁移策略 | 备注 |
|---|---|---|
| `component-*.css` / `section-*.css` / `template-*.css` | **按需切碎,内联到对应 React 组件**。`base.css` 例外。 | Dawn 的 CSS 是按文件名分类的,实际选择器是全局的,迁移后通过 component-scoped import 自动隔离 |
| `base.css` (80KB) | **拆为 `frontend/styles/tokens.css` + 组件级 CSS**。tokens 部分(CSS 变量)用 Liquid 渲染保留(因为它们依赖 `settings.*`) | Dawn 的全局样式 token 必须在 layout 中输出 |
| `global.js` (44KB) | **保留为静态脚本,在 theme.liquid 中引用**。它包含 cart/pub-sub/SectionId 等基础工具,React 组件按需 import 函数 | 不重写这部分,React 通过 `window.PubSub.subscribe` 等继续使用 |
| `cart.js` / `cart-drawer.js` 等业务 JS | **业务逻辑重写为 React hook**(useCart 等),原生 JS 文件保留作为 fallback 兜底 | 短期保留避免回归 |
| SVG icons (95 个) | **搬入 `frontend/icons/` 目录,以 `.tsx` React 组件形式输出**。`inline_asset_content` filter 由 `useAsset` hook 输出 | 体积小、内联可避免一次额外请求 |
| 字体文件 (woff2) | **保留在 `assets/` 目录**,通过 `theme.liquid` 的 `{% style %}` 块 + `font_face` filter 输出,不动 | Dawn 的字体设置走 `settings.type_body_font` |
| `image_picker` 图片 | 通过 `useImageUrl/useImageTag` hook 输出 `image_url` filter | 不迁移图片文件本身 |
| 翻译 `t:` filter | 通过 `useT('foo.bar')` hook 输出 | 翻译文件本身保持不动 |

---

## 2. 插件扩展(增量 API 草案)

> 完整 API 草案在阶段 1 启动时确定,本节为高层接口。**所有 API 名称在评审通过前为占位,可改。**

### 2.1 运行时 hooks(`vite-plugin-react-shopify/runtime`)

| 新 hook | 签名 | 用途 | 对应 Dawn 模式 | 阻塞的 section |
|---|---|---|---|---|
| `useRawLiquid` | `(code: string) => string` | **关键**。把任意 Liquid 字符串原样插入到当前渲染位置(就地),客户端为 no-op | `{% form %}`、`{% paginate %}`、`{% for block in section.blocks %}`、`{% case block.type %}`、多行 `{% if %}`、`{% style %}` | main-product, main-cart-*, slideshow, rich-text, all block-iterating sections |
| `useForm` | `(formType, options?) => { FormEl, formState, submit }` | 包装 `{% form 'customer' %}` 等,客户端接管 form state | 整个 newsletter/contact/login/register/password form | 所有 form section |
| `usePaginate` | `(items, perPage, param?) => { page, total, totalPages, hasNext, hasPrev, PaginationEl }` | 包装 `{% paginate ... by N %}`,同时接管分页导航 | `{% paginate collection.products %}`、`{% paginate search.results %}` | main-collection-product-grid, main-search, bulk-quick-order-list, snippets/pagination |
| `useImageTag` | `(image, opts?) => string` | 输出 `{{ image \| image_url: width: W \| image_tag: ... }}` | Dawn 的 `image_tag` filter | 所有图片密集 section |
| `useImageUrl` | `(image, width) => string` | 输出 `{{ image \| image_url: width: W }}` | srcset 构造 | srcset 用法 |
| `useAsset` | `(path, mode?: 'url' \| 'inline' \| 'stylesheet') => string` | `{{ 'foo.svg' \| asset_url }}` / `\| inline_asset_content` / `\| stylesheet_tag` | icon、`<link>`、`<style>` | 所有引用 svg/css 的地方 |
| `useFontFace` | `(fontSetting) => string` | 输出 `@font-face` 块 | `{{ settings.type_body_font \| font_face: ... }}` | theme.liquid 字体 |
| `useT` | `(key, vars?: Record<string, string\|number>) => string` | 输出 `{{ 'foo.bar' \| t }}` 或 `\| t: x: y` | 所有翻译 | 全部 |
| `useRoute` | `(key: 'cart_add_url' \| 'cart_change_url' \| ...) => string` | 输出 `{{ routes.X }}` | theme.liquid `window.routes` | global.js 依赖 |
| `usePlaceholderSvg` | `(name: string) => string` | 输出 `{{ 'name' \| placeholder_svg_tag: 'placeholder-svg' }}` | 占位图 | image-banner, image-with-text, product |
| `useSectionPadding` | `(settingsKey?: string) => string` | 输出 `<style>.section-{{id}}-padding{...}</style>` | Dawn 的 `{% style %}` padding 模式 | 全部 section |
| `useColorScheme` | `(id: string) => string` | 返回 `color-X gradient` className | 颜色主题 | 全部 section |
| `useBlockLoop` | `<T>(blocks, render: (b) => ReactNode) => ReactNode` | **关键**。遍历 `section.blocks`,每块 render,自动插入 `{{ block.shopify_attributes }}` 和 `{{ block.id }}`,逐块 JSON bridge 注入 | `{% for block in section.blocks %}` 全部 | rich-text, multicolumn, multirow, slideshow, collage, main-product, main-cart, newsletter, ... 几乎所有 section |
| `useBlockType` | `(blocks, type) => BlockType[]` | 过滤某类型的 block | rich-text 的 case-when | rich-text, slideshow, ... |
| `useShopifyAttributes` | `() => string` | 输出 `{{ block.shopify_attributes }}` | 主题块属性注入 | 所有 block 渲染 |
| `useImageAspect` | `(image) => string` | 返回 `{{ 1 \| divided_by: image.aspect_ratio \| times: 100 }}` 字符串 | adapt 模式 | image-banner, slideshow, featured-product |
| `useShop` | `() => { moneyFormat, routes, ... }` | 返回 `window.Shopify` 镜像 + 关键常量 | Dawn 的 `window.shopUrl` 等 | global.js 替代 |
| `usePubSub` | `() => { subscribe, publish }` | 包装 `assets/pubsub.js` 的事件 | cart-update 跨组件通知 | cart 通知链 |

### 2.2 SSG 编译侧

| 增强点 | 现状 | 改动 |
|---|---|---|
| 多次 `useRawLiquid` 顺序拼接 | 不支持 | 新增 per-component 位置输出,加入 `__shopify_ssg_liquid_inline: string[]` |
| CSS Modules | `.module.css` 被强制 strip | 启用 CSS Modules 处理,生成唯一类名映射 |
| `inline_asset_content` filter 跟踪 | 不跟踪 | 加入 `DEFAULT_LIQUID_FILTERS`,自动补 filter |
| `placeholder_svg_tag` filter 跟踪 | 不跟踪 | 同上 |
| `t: count: N` 表达式 | 基础 `t` 跟踪,变量不识别 | 解析 `t: foo: bar, baz: qux` |
| `useBlockLoop` 子表达式收集 | 不支持 | 每块独立 JSON bridge |
| 嵌套子 block (`block.blocks`) | 已有 `content_for 'blocks'`,但 React 端无 type API | 加 `useBlockLoop(blocks.blocks, ...)` 嵌套支持 |
| schema `presets.blocks.static` | 已支持 | ✓ |
| `@app` block | schema 已支持,运行时未提供 | 加 `<AppBlock>` React 包装 |
| `cleanOrphans` 选项 | 不存在 | `vite.config` 加 `ssg.cleanOrphans: true`,build 时清 `react-*.liquid` 孤儿 |
| 验证:`{{ }}` 表达式白名单 | 仅警告 | 加语法解析,失败时报错而非警告 |

### 2.3 Vite 配置侧

| 增强点 | 改动 |
|---|---|
| `react-dom/server` 不进客户端 chunk | `manualChunks` 中精确 external,避免 hydrate 误引 |
| `react-dom/client` 单独 vendor | 单独 chunk,浏览器缓存友好 |
| 监听模式下清孤儿 | closeBundle 后清 `react-*.liquid` + `css-*.liquid` 中无对应源的文件 |

---

## 3. frontend/ 目标目录结构

```
frontend/
├── styles/                        # 共享 CSS (被插件自动提取为 snippets/css-*.liquid)
│   ├── tokens.css                 # CSS 变量 (color/font/spacing/buttons) — 需结合 theme.liquid 输出
│   ├── layout.css                 # page-width / section-padding 工具类
│   ├── typography.css             # 标题/正文 typography
│   ├── forms.css                  # field/button/select 基础
│   └── animation.css              # scroll-trigger / cascade / hover
│
├── icons/                         # 95 个 svg → 95 个 .tsx
│   ├── index.ts                   # 统一 export
│   ├── IconCaret.tsx
│   ├── IconArrow.tsx
│   └── ... (95 个)
│
├── components/                    # 跨 section 复用的纯展示组件
│   ├── Button.tsx                 # 主/次按钮 (含 button--primary/secondary)
│   ├── Heading.tsx                # 通用标题 (h0/h1/h2/hxl/hxxl)
│   ├── Image.tsx                  # 响应式 image_tag 包装
│   ├── Video.tsx                  # native + YouTube/Vimeo
│   ├── Icon.tsx                   # 通用 svg 渲染 (读 icons/)
│   ├── Price.tsx                  # 货币/比较价格
│   ├── Rte.tsx                    # 富文本容器
│   ├── Pagination.tsx             # 翻页 (用 usePaginate)
│   ├── Form.tsx                   # form 包装 (用 useForm)
│   ├── Disclosure.tsx             # <details>/<summary> 折叠
│   ├── QuantityInput.tsx          # 数量输入
│   ├── SwatchInput.tsx            # 色卡/选项
│   ├── ProductCard.tsx            # 商品卡
│   ├── CollectionCard.tsx         # 集合卡
│   ├── ArticleCard.tsx            # 文章卡
│   ├── PredictiveSearch.tsx       # 搜索建议
│   ├── Facets.tsx                 # 过滤面板
│   ├── LocalizationForm.tsx       # 国家/语言
│   ├── Modal.tsx                  # 模态
│   ├── DeferredMedia.tsx          # 懒加载媒体
│   ├── MediaGallery.tsx           # 商品主图
│   ├── VariantPicker.tsx          # 变体选择
│   ├── ShareButton.tsx            # 分享
│   ├── SocialIcons.tsx            # 社交图标
│   ├── HeaderDrawer.tsx           # 移动 header 抽屉
│   ├── MegaMenu.tsx               # mega menu
│   └── DropdownMenu.tsx           # 下拉菜单
│
├── hooks/                         # 业务级 hooks (组合 plugin 原生 hooks)
│   ├── useColorScheme.ts
│   ├── useSectionPadding.ts
│   ├── usePageWidth.ts
│   ├── useCart.ts                 # 包装 cart.js 业务
│   ├── useProductVariants.ts
│   ├── usePredictiveSearch.ts
│   ├── useLocale.ts
│   ├── useLocalization.ts
│   ├── useMediaQuery.ts
│   └── useAnimation.ts
│
├── utils/
│   ├── classes.ts                 # className 合并
│   ├── images.ts                  # srcset/sizes 构造
│   ├── money.ts                   # 货币
│   ├── form.ts                    # 表单 state
│   └── url.ts
│
├── sections/                      # 67 个 .tsx,见 §5 表格
│   └── *.tsx
│
├── blocks/                        # 主题块组件 (Dawn 的 block)
│   ├── announcement.liquid        (对应 announcement-bar.liquid 中的 announcement 块)
│   ├── product-title.liquid
│   ├── product-price.liquid
│   ├── product-vendor.liquid
│   ├── product-description.liquid
│   ├── product-quantity.liquid
│   ├── product-buy-buttons.liquid
│   ├── product-share.liquid
│   ├── product-rating.liquid
│   ├── product-sku.liquid
│   ├── product-custom-liquid.liquid
│   ├── product-collapsible-tab.liquid
│   ├── product-popup.liquid
│   ├── product-metafields.liquid
│   ├── product-inventory.liquid
│   ├── slide.liquid               (slideshow 内)
│   ├── collage-image.liquid
│   ├── collage-product.liquid
│   ├── collage-collection.liquid
│   ├── rich-text-heading.liquid
│   ├── rich-text-caption.liquid
│   ├── rich-text-text.liquid
│   ├── rich-text-button.liquid
│   ├── newsletter-heading.liquid
│   ├── newsletter-paragraph.liquid
│   ├── newsletter-email-form.liquid
│   ├── multicolumn.liquid
│   ├── multirow.liquid
│   ├── image-with-text.liquid
│   ├── collapsible-row.liquid
│   ├── featured-blog.liquid
│   └── ... (~40+ blocks)
│
└── snippets/                      # 39 个 .tsx,见 §5 表格
    └── *.tsx
```

> `templates/` 不动 — 模板是 JSON,引用 section ID,迁移完成后通过 `ssg.prefix.section: "react-"` 让原 JSON 不需改 `type` 字段。

---

## 4. 资源依赖总览

> 完整逐文件清单见 §5(每 section/snippet)。本节为高层摘要。

### 4.1 JS 文件分类(32 个,共 ~280KB)

| 分类 | 文件 | 处置 |
|---|---|---|
| **基础设施(保留)** | `constants.js` (258B) `pubsub.js` (598B) `global.js` (44KB) | 保留在 `assets/`,theme.liquid 引用,React 通过 `useShop/usePubSub` hook 包装 |
| **动画/工具(保留)** | `animations.js` (3.6KB) `details-disclosure.js` (1.6KB) `details-modal.js` (1.7KB) `show-more.js` (1.2KB) | 保留;`details-*` 在 React 中用 `<details>` 替代,逐步淘汰 |
| **搜索/表单(重写为 hook)** | `predictive-search.js` (8.7KB) `search-form.js` (1.3KB) `localization-form.js` (7.9KB) `facets.js` (13.9KB) `recipient-form.js` (6.5KB) `share.js` (2.2KB) `customer.js` (3.0KB) | 重写为 React hook 或组件,源文件删除(待所有 section 迁移完成后) |
| **购物车(重写)** | `cart.js` (10.9KB) `cart-drawer.js` (4.2KB) `cart-notification.js` (2.3KB) `quantity-popover.js` (3.5KB) `price-per-item.js` (4.4KB) | 重写为 `useCart` hook + React 组件 |
| **商品(重写)** | `product-info.js` (16.8KB) `product-form.js` (5.5KB) `product-modal.js` (1.3KB) `product-model.js` (1.4KB) `media-gallery.js` (4.9KB) `magnify.js` (2.1KB) `quick-add.js` (4.8KB) `quick-add-bulk.js` (6.6KB) `pickup-availability.js` (4.2KB) | 重写为 React 组件,源文件最终删除 |
| **订单(重写)** | `quick-order-list.js` (17.5KB) `main-search.js` (1.2KB) | 重写 |
| **杂项(保留兜底)** | `theme-editor.js` (2.1KB) `password-modal.js` (250B) | 保留作为 theme editor / password 页面兜底 |

**短期策略**:`global.js` / `cart.js` / `cart-drawer.js` 等基础 JS 在迁移期间**保留原样**,React 组件通过 `window.Shopify` 桥接,避免一次性改动过大。**所有迁移完成的 section 在 PR 列表中标注"可独立删除原 JS"**。

### 4.2 CSS 文件分类(64 个,共 ~440KB)

| 分类 | 文件数 | 处置 |
|---|---|---|
| **全局 base** | `base.css` (80KB) | 拆分为:① `frontend/styles/tokens.css`(CSS 变量,需 Liquid 注入)② 组件级 CSS ③ `theme.liquid` 中的 `{% style %}` 块保留基础 layout |
| **Section 级** | `section-*.css` (16 个) | 对应同名 React section,通过 `import './SectionName.css'` 自动内联 |
| **Component 级** | `component-*.css` (37 个) | 按命名对应前端 components;当一个 CSS 被 2+ section 共享时,插件自动提取为 `snippets/css-*.liquid` |
| **Template 级** | `template-*.css` (3 个) | 注入到对应 template 渲染的 section |
| **Customer** | `customer.css` (13KB) | 全部 customer section 共享 → 自动提取 |
| **Mask** | `mask-blobs.css` (12KB) `mask-arch.svg` | 局部使用,跟随 featured-collection 等 |

**关键约束**:Dawn 的 CSS 选择器是**全局类名**(如 `.button--primary`),React 组件中**必须使用同名类**才能匹配。**不要**改成 CSS Modules scoped 类名,否则 Dawn 现有 layout 兼容性测试会挂。

### 4.3 SVG 图标(95 个)

| 类别 | 数量 | 处置 |
|---|---|---|
| 通用 UI | `icon-arrow, caret, close, plus, minus, error, success, checkmark, info, ...` | ~30 个,统一搬到 `frontend/icons/` |
| 媒体播放 | `icon-play, pause, zoom, 3d-model, inventory-status` | 5 个 |
| 社交 | `icon-facebook, instagram, pinterest, snapchat, tiktok, tumblr, twitter, vimeo, youtube, shopify` | 10 个 |
| 账户/导航 | `icon-account, cart, cart-empty, hamburger, padlock, search, reset, filter` | 8 个 |
| 行业彩蛋(未引用) | `icon-apple, banana, bottle, carrot, dairy, leaf, ...` (~25 个) | **可删除**(`shopify.svg` 除外),或保留作图标库 |
| 装饰 | `mask-arch.svg`, `square.svg`, `email-signup-banner-background*.svg`, `loading-spinner.svg` | 跟随用到它的 section |

> **扫描结果**:本仓库实际有 95 个 svg,`rg` 找到 92 个在 Liquid 中引用;剩余 3 个(`icon-shopify` 实际有引用)为脚本统计差异,以 `ls` 为准。

### 4.4 theme.liquid 依赖清单

| 引用 | 类型 | 来源 | 迁移方案 |
|---|---|---|---|
| `base.css` | CSS | `assets/base.css` | 拆分为 styles/tokens.css + 保留 base 段 |
| `constants.js` | JS | `assets/constants.js` | **保留**,挂到 `window.CONST` |
| `pubsub.js` | JS | `assets/pubsub.js` | **保留**,挂到 `window.PubSub` |
| `global.js` | JS | `assets/global.js` | **保留** 短期,长期重写 |
| `details-disclosure.js` | JS | `assets/...` | **保留** 短期 |
| `details-modal.js` | JS | `assets/...` | **保留** 短期 |
| `search-form.js` | JS | `assets/...` | **保留** 短期 |
| `animations.js` | JS | `assets/animations.js` | **保留**(滚动动画) |
| `component-cart-drawer.css` | CSS | `assets/...` | 等 cart-drawer 迁移后删除 |
| `component-cart-items.css` | CSS | `assets/...` | 等 main-cart-items 迁移后删除 |
| `component-cart.css` | CSS | `assets/...` | 同上 |
| `component-discounts.css` | CSS | `assets/...` | 等 cart 迁移后删除 |
| `component-localization-form.css` | CSS | `assets/...` | 等 localization 迁移后删除 |
| `component-predictive-search.css` | CSS | `assets/...` | 等 predictive-search 迁移后删除 |
| `component-price.css` | CSS | `assets/...` | 保留到所有用价 section 迁移 |
| `component-totals.css` | CSS | `assets/...` | 等 cart 迁移后删除 |
| `cart-drawer.js` | JS | `assets/...` | 等 cart-drawer 迁移后删除 |
| `localization-form.js` | JS | `assets/...` | 等 localization 迁移后删除 |
| `predictive-search.js` | JS | `assets/...` | 等 predictive-search 迁移后删除 |
| `localization-form.css`(`section-password`) | CSS | `layout/password.liquid` | 保持原样(password 页面不动) |
| `details-modal.js`(`section-password`) | JS | 同上 | 保持 |
| `password-modal.js` | JS | 同上 | 保持 |
| `global.js`(`section-password`) | JS | 同上 | 保持 |
| `{% render 'shopify-importmap' %}` | snippet | 插件生成 | ✓ 已自动生成 |
| `{% render 'meta-tags' %}` | snippet | 原生 | 保持 |

### 4.5 全局 setting(取自 `settings_schema.json`)

| 类别 | Settings ID 示例 | React 访问方式 |
|---|---|---|
| 主题信息 | `theme_info` | 不访问(Shopify 管理面板用) |
| Logo | `logo`, `logo_width`, `favicon` | `useSectionSettings("settings.logo")`(但 setting 是 theme 级) |
| 颜色方案 | `color_schemes` | 通过 `settings.color_schemes[].id` 渲染类名 |
| Typography | `type_body_font`, `type_header_font`, `body_scale`, `heading_scale` | `useLiquidValue("settings.type_body_font")` |
| Layout | `page_width`, `spacing_sections`, `spacing_grid_*` | 同上 |
| Cards | `card_*` (~10 个) | 同上 |
| Buttons | `buttons_*` (~10 个) | 同上 |
| Inputs | `inputs_*` (~10 个) | 同上 |
| Cart | `cart_type`, `show_cart_note`, `free_shipping_threshold` | `useLiquidValue("settings.cart_type")` |
| Animations | `animations_reveal_on_scroll`, `animations_hover_elements` | boolean,经 `parseLiquidBoolean` |
| Predictive search | `predictive_search_enabled` | boolean |
| Social | `social_*_link` (9 个) | string |
| Currency | `currency_code_enabled` | boolean |
| Locale | `*` 几十个 | useT 翻译键 |
| ... | | |

> **关键设计**:Theme 级 setting 没有 `section.settings.`,而是 `settings.X`。新增 `useThemeSettings(key: string)` hook(在阶段 1),命名与 `useSectionSettings` 平行。

---

## 5. Section/Block/Snippet 详细迁移表

> 阅读方式:每行 = 1 个 Dawn 原生文件,列为 ① 复杂度 ② 资源依赖(CSS/JS/SVG) ③ React 文件路径 ④ 关键 Dawn 模式 ⑤ 验证点。
> **迁移前必须先看本表对应行的"资源依赖"列**,确认所有 CSS/JS/SVG 资源要么在 React 中重新生成,要么确认保留在 `assets/`。

### 5.1 Sections — 简单(纯静态)

| 源文件 | LOC | 资源依赖 | 目标 `frontend/sections/` | 关键 Dawn 模式 | 验证点 |
|---|---|---|---|---|---|
| `main-404.liquid` | 29 | 1 SVG(`template-giftcard.css` 也引用) | `Main404.tsx` | `{{ 'templates.404.subtext' \| t }}` 翻译键 | 访问 `/pages/404` 渲染一致 |
| `main-page.liquid` | 57 | `section-main-page.css` | `MainPage.tsx` | `section-{{id}}-padding` 媒体查询、`{{ page.title }}`、`{{ page.content }}` | 与 Dawn 像素一致 |
| `page.liquid` | 50 | `section-main-page.css` | `Page.tsx` | `section.settings.page.title`、`section.settings.page.content` 替代 | "Page" 类型的 section 配置 |
| `main-list-collections.liquid` | 124 | `component-card.css`、`section-collection-list.css` | `MainListCollections.tsx` | `for collection in collections`、`render 'card-collection'` | 列表页 |
| `main-blog.liquid` | 110 | `component-article-card.css`、`component-card.css`、`section-main-blog.css` | `MainBlog.tsx` | `for article in blog.articles`、`render 'article-card'` | /blogs/news 页面 |
| `main-collection-banner.liquid` | 79 | `component-collection-hero.css` | `MainCollectionBanner.tsx` | `{{ collection.title }}`、`{{ collection.description }}` | /collections/X 顶部 |
| `pickup-availability.liquid` | 76 | 2 SVG(`icon-close`, `icon-tick`) | `PickupAvailability.tsx` | `pickup_availability` 标签 | 商品页 PICKUP 区 |
| `cart-icon-bubble.liquid` | 35 | 2 SVG(`icon-cart`, `icon-cart-empty`) | `CartIconBubble.tsx` | `cart.item_count` | header 右上角购物车图标 |
| `cart-live-region-text.liquid` | 22 | 无 | `CartLiveRegionText.tsx` | a11y 提示 | 屏幕阅读器通知 |
| `cart-notification-button.liquid` | 12 | 无 | `CartNotificationButton.tsx` | 链接 | "查看购物车"按钮 |
| `main-password-footer.liquid` | 65 | 10 SVG(社交)+ 字体 | **保持 Liquid**(password 页面整页不动) | - | - |
| `main-password-header.liquid` | 73 | 2 SVG | **保持 Liquid** | - | - |
| `main-password.liquid` | 60 | 同 layout | **保持 Liquid** | - | - |
| `main-login.liquid` | 144 | `customer.css`, 2 SVG | `MainLogin.tsx` | `form 'customer'` | /account/login |
| `main-register.liquid` | 99 | `customer.css`, 1 SVG | `MainRegister.tsx` | `form 'create_customer'` | /account/register |
| `main-activate-account.liquid` | 73 | `customer.css`, 1 SVG | `MainActivateAccount.tsx` | `form 'activate_account'` | 激活 |
| `main-reset-password.liquid` | 91 | `customer.css`, 1 SVG | `MainResetPassword.tsx` | `form 'recover_customer_password'` | 重置密码 |
| `apps.liquid` | 25 | 无 | `Apps.tsx` | `{% content_for 'apps' %}` | App embed 容器 |
| `custom-liquid.liquid` | 71 | 无 | `CustomLiquid.tsx` | `section.settings.liquid`(直接渲染 Liquid 字符串) | 商家自定义 Liquid |

### 5.2 Sections — 中等(含 form/loop/block)

| 源文件 | LOC | 资源依赖 | 目标 | 关键 Dawn 模式 | 验证点 |
|---|---|---|---|---|---|
| `main-account.liquid` | 175 | `customer.css`, 2 SVG | `MainAccount.tsx` | account 菜单、for order, address | /account |
| `main-addresses.liquid` | 412 | `customer.css`, 1 SVG, `customer.js` | `MainAddresses.tsx` | `form 'customer_address'`, `form 'account'`, `customer.js` 交互 | 地址管理 |
| `main-order.liquid` | 432 | `customer.css`, 1 SVG | `MainOrder.tsx` | for line_item, `money` filter | /account/orders/X |
| `main-article.liquid` | 458 | `section-blog-post.css`, 3 SVG | `MainArticle.tsx` | `article.comments`, `form 'article'`, 评论区 | /blogs/news/article-name |
| `announcement-bar.liquid` | 113 | `component-list-social.css`, `component-slider.css`, `component-slideshow.css`, `theme-editor.js`, 2 SVG | `AnnouncementBar.tsx` | for announcement blocks, auto-rotate, 社交 | 顶部公告条 |
| `image-banner.liquid` | 631 | `section-image-banner.css` | `ImageBanner.tsx` | image_tag, aspect ratio, overlay opacity, 媒体查询 | 首屏 banner |
| `image-with-text.liquid` | 630 | `component-image-with-text.css` | `ImageWithText.tsx` | grid 2-col, image-aspect-ratio, 多种 color scheme | "图+文" 排版 |
| `rich-text.liquid` | 354 | `section-rich-text.css` | `RichText.tsx` | **for block** in section.blocks(heading/caption/text/button 4 种),`block.shopify_attributes` | 富文本容器 |
| `multicolumn.liquid` | 461 | `component-slider.css`, `section-multicolumn.css`, 2 SVG | `Multicolumn.tsx` | for column blocks, slider, image_ratio 多种 | 多列 |
| `multirow.liquid` | 389 | `component-image-with-text.css` | `Multirow.tsx` | for item blocks, image_first/text_first | 多行 |
| `collapsible-content.liquid` | 517 | `collapsible-content.css`, `component-accordion.css`, 1 SVG | `CollapsibleContent.tsx` | for row blocks, `<details>`, 媒体查询, 颜色 | 折叠 FAQ |
| `slideshow.liquid` | 590 | `component-slider.css`, `component-slideshow.css`, `section-image-banner.css`, `theme-editor.js`, 3 SVG | `Slideshow.tsx` | for slide blocks, aspect-ratio JS, auto-rotate, controls | 大图轮播 |
| `collage.liquid` | 447 | `collage.css`, `component-card.css`, `component-deferred-media.css`, `component-modal-video.css`, `component-price.css`, 2 SVG | `Collage.tsx` | for image/product/collection blocks, **3 种 block 区分**, `assign grid_space` | 拼图墙 |
| `contact-form.liquid` | 175 | `section-contact-form.css`, 2 SVG | `ContactForm.tsx` | `form 'contact'`, `form.errors` | /pages/contact |
| `newsletter.liquid` | 268 | `component-newsletter.css`, `newsletter-section.css`, 3 SVG | `Newsletter.tsx` | `form 'customer'`, blocks (heading/paragraph/email_form) | 邮件订阅 |
| `email-signup-banner.liquid` | 381 | `component-newsletter.css`, `newsletter-section.css`, `section-email-signup-banner.css`, `section-image-banner.css`, 2 装饰 SVG, 3 普通 SVG | `EmailSignupBanner.tsx` | `form 'customer'`, video/image 背景 | 邮件订阅 banner |
| `video.liquid` | 254 | `component-deferred-media.css`, `video-section.css`, 1 SVG | `Video.tsx` | video URL 解析, aspect ratio, 封面 | 视频 section |
| `featured-blog.liquid` | 287 | `component-article-card.css`, `component-card.css`, `component-slider.css`, `section-featured-blog.css`, 1 SVG | `FeaturedBlog.tsx` | for article in blog.articles, slider | 博客推荐 |
| `featured-collection.liquid` | 507 | `component-card.css`, `component-price.css`, `component-slider.css`, `mask-blobs.css`, `price-per-item.js`, `product-form.js`, `quantity-popover.js`, `quick-add-bulk.js`, `quick-add.css`, `quick-add.js`, `quick-order-list.js`, `template-collection.css`, 2 SVG | `FeaturedCollection.tsx` | for product in collection.products, **quick-add modal**, slider, **多种 image_ratio**, `paginate` | 商品集合推荐 |
| `related-products.liquid` | 254 | `component-card.css`, `component-price.css`, `mask-blobs.css`, `section-related-products.css`, 1 SVG | `RelatedProducts.tsx` | `product.recommendations` API, slider, 最多 10 商品 | 商品页相关推荐 |
| `collection-list.liquid` | 247 | `component-card.css`, `component-slider.css`, `section-collection-list.css`, 1 SVG | `CollectionList.tsx` | for collection in collections, slider, 6 种样式 | 首页集合列表 |
| `page-contact.liquid`(template) | - | - | **保持**(JSON 模板) | - | - |

### 5.3 Sections — 复杂(高交互/状态机)

| 源文件 | LOC | 资源依赖 | 目标 | 关键 Dawn 模式 | 验证点 |
|---|---|---|---|---|---|
| `main-product.liquid` | 2267 | `component-accordion.css`, `component-card.css`, `component-complementary-products.css`, `component-deferred-media.css`, `component-model-viewer-ui.css`, `component-price.css`, `component-product-model.css`, `component-product-variant-picker.css`, `component-rating.css`, `component-slider.css`, `component-swatch-input.css`, `component-swatch.css`, `component-volume-pricing.css`, `magnify.js`, `media-gallery.js`, `price-per-item.js`, `product-form.js`, `product-info.js`, `product-modal.js`, `product-model.js`, `quick-add.css`, `quick-add.js`, `section-main-product.css`, `show-more.js`, `theme-editor.js`, 6 SVG | `MainProduct.tsx` | **15+ 种 block**, variant picker 状态机, media gallery, 3D model, `form 'product'`, accordion, inventory, 推荐, `pickup_availability` | 商品详情页(最复杂) |
| `main-collection-product-grid.liquid` | 410 | `component-card.css`, `component-facets.css`, `component-price.css`, `facets.js`, `mask-blobs.css`, `price-per-item.js`, `product-form.js`, `quantity-popover.js`, `quick-add-bulk.js`, `quick-add.css`, `quick-add.js`, `quick-order-list.js`, `template-collection.css`, 2 SVG | `MainCollectionProductGrid.tsx` | **`paginate`**, **facets** (filter/sort/price range), 4 种 image shape, 3 种 image_ratio, quick-add, swatch | 集合页(最复杂之一) |
| `main-search.liquid` | 412 | `component-card.css`, `component-facets.css`, `component-price.css`, `component-search.css`, `facets.js`, `main-search.js`, `mask-blobs.css`, `template-collection.css`, 3 SVG | `MainSearch.tsx` | `paginate search.results`, facets, predictive, 空结果 | /search |
| `predictive-search.liquid` | 283 | `component-predictive-search.css`, 1 SVG | `PredictiveSearch.tsx` | 实时搜索 4 个 tab(products/collections/articles/queries), `fetch('/search/suggest')` | header 搜索弹窗 |
| `cart-drawer.liquid` | 1115 | `cart.js`, `component-card.css`, `quantity-popover.css`, `quantity-popover.js` | `CartDrawer.tsx` | 购物车 line items, 数量编辑, **推荐商品**, 关闭逻辑 | 右侧购物车抽屉 |
| `cart-notification.liquid` | 144 | `cart-notification.js`, 1 SVG, 1 checkbox | `CartNotification.tsx` | 加入购物车弹窗, line item, 跳转到 checkout | 加车提示 |
| `cart-notification-product.liquid` | 91 | 无 | `CartNotificationProduct.tsx` | 弹窗内单商品行 | 加车弹窗单品 |
| `main-cart-items.liquid` | 552 | `cart.js`, `component-cart-items.css`, `component-cart.css`, `component-discounts.css`, `component-price.css`, `component-totals.css`, `quantity-popover.css`, `quantity-popover.js`, 7 SVG | `MainCartItems.tsx` | for line_item, 数量/属性编辑, 折扣码, **cart API 调用** | /cart 列表 |
| `main-cart-footer.liquid` | 211 | `component-cart.css`, `component-discounts.css`, `component-price.css`, `component-totals.css`, 1 SVG | `MainCartFooter.tsx` | cart 总计, 折扣, checkout 按钮, `form 'cart'` | /cart 底部 |
| `quick-order-list.liquid` | 708 | `component-price.css`, `price-per-item.js`, `quantity-popover.css`, `quantity-popover.js`, `quick-order-list.css`, `quick-order-list.js`, 3 SVG | `QuickOrderList.tsx` | variant picker 网格, **bulk add to cart**, 数量调整 | 快速下单 |
| `bulk-quick-order-list.liquid` | 296 | `quick-order-list.css`, `quick-order-list.js` | `BulkQuickOrderList.tsx` | `paginate`, variant picker, 批量 | 批量下单 |
| `header.liquid` | 657 | `cart-notification.js`, `component-cart-notification.css`, `component-list-menu.css`, `component-mega-menu.css`, `component-menu-drawer.css`, `component-price.css`, `component-search.css`, 3 SVG | `Header.tsx` | mega menu / drawer 切换, sticky scroll, **cart icon**, 搜索框, 本地化 | 顶部导航(最复杂之一) |
| `footer.liquid` | 559 | `component-list-menu.css`, `component-list-payment.css`, `component-list-social.css`, `component-newsletter.css`, `section-footer.css`, 3 SVG | `Footer.tsx` | 多列菜单, newsletter, 社交, 支付图标, 本地化 | 页脚 |
| `featured-product.liquid` | 910 | `component-accordion.css`, `component-deferred-media.css`, `component-model-viewer-ui.css`, `component-price.css`, `component-product-model.css`, `component-product-variant-picker.css`, `component-rating.css`, `component-swatch-input.css`, `component-swatch.css`, `component-volume-pricing.css`, `magnify.js`, `media-gallery.js`, `price-per-item.js`, `product-form.js`, `product-info.js`, `product-modal.js`, `product-model.js`, `section-featured-product.css`, `section-main-product.css`, `show-more.js`, `theme-editor.js`, 3 SVG | `FeaturedProduct.tsx` | 商品详情 (single product), variant, `form 'product'`, 3D, 媒体 | 单商品推荐 |

### 5.4 Snippets(39 个)

| 源文件 | LOC | 资源依赖 | 目标 | 关键 Dawn 模式 |
|---|---|---|---|---|
| `article-card.liquid` | 91 | (无外部) | `frontend/snippets/ArticleCard.tsx` | for block in article.blocks |
| `buy-buttons.liquid` | 257 | `component-pickup-availability.css`, `pickup-availability.js`, 2 SVG | `BuyButtons.tsx` | `form 'product'`, dynamic checkout button, gift card recipient |
| `card-collection.liquid` | 93 | 1 SVG | `CardCollection.tsx` | 集合卡 |
| `card-product.liquid` | 651 | `component-price.css`, `component-rating.css`, `component-volume-pricing.css`, `quantity-popover.css`, `quick-order-list.css`, 3 SVG | `CardProduct.tsx` | **最复杂 snippet** — quick-add popover, 3D badge, secondary image, swatch, price 范围, 体积定价, 缺货, 比较价格 |
| `cart-drawer.liquid` | 379 | `cart.js`, `component-card.css`, `quantity-popover.css`, `quantity-popover.js`, 7 SVG | `CartDrawer.tsx` | for line_item, 推荐, 折扣 |
| `cart-notification.liquid` | 144 | 2 SVG | `CartNotification.tsx` | 弹窗 + line item |
| `country-localization.liquid` | 71 | 5 SVG | `CountryLocalization.tsx` | `form 'localization'`, 搜索国家 |
| `facets.liquid` | 1225 | `component-show-more.css`, `component-swatch-input.css`, `component-swatch.css`, `show-more.js`, 7 SVG | `Facets.tsx` | **最复杂 snippet** — 6 种 filter, price range, swatch, show more, clear all, 水平/垂直 2 种布局 |
| `gift-card-recipient-form.liquid` | 132 | `recipient-form.js`, 3 SVG | `GiftCardRecipientForm.tsx` | 收礼人表单 |
| `header-drawer.liquid` | 105 | 14 SVG | `HeaderDrawer.tsx` | 移动菜单, 社交链接 |
| `header-dropdown-menu.liquid` | 80 | 1 SVG | `HeaderDropdownMenu.tsx` | 下拉菜单 |
| `header-mega-menu.liquid` | 154 | 1 SVG | `HeaderMegaMenu.tsx` | mega menu, 多列 |
| `header-search.liquid` | 100 | 3 SVG | `HeaderSearch.tsx` | 搜索框 + predictive trigger |
| `icon-accordion.liquid` | 32 | 无 | **内联到 CollapsibleContent 组件** | 折叠图标 |
| `icon-with-text.liquid` | 41 | 无 | **内联到 MegaMenu/Footer** | 图标+文字单元 |
| `language-localization.liquid` | 58 | 2 SVG | `LanguageLocalization.tsx` | 语言切换 |
| `loading-spinner.liquid` | 11 | 1 SVG | `LoadingSpinner.tsx` | loading |
| `meta-tags.liquid` | 103 | 无 | **保留 Liquid**(SEO critical, 写在 head) | SEO |
| `pagination.liquid` | 86 | `component-pagination.css`, 1 SVG | `Pagination.tsx` | 分页(配合 usePaginate) |
| `price-facet.liquid` | 79 | 无 | `PriceFacet.tsx` | 价格过滤 |
| `price.liquid` | 73 | 无 | `Price.tsx` | 货币显示 |
| `product-media-gallery.liquid` | 285 | `media-gallery.js`, 3 SVG | `ProductMediaGallery.tsx` | 主图 + 缩略图, 视频, model, 缩放 |
| `product-media-modal.liquid` | 77 | 1 SVG | `ProductMediaModal.tsx` | 媒体弹窗 |
| `product-media.liquid` | 116 | 1 SVG | `ProductMedia.tsx` | 单个媒体(图/视频/model) |
| `product-thumbnail.liquid` | 99 | 3 SVG | `ProductThumbnail.tsx` | 缩略图 |
| `product-variant-options.liquid` | 75 | 1 SVG | `ProductVariantOptions.tsx` | 变体选项 |
| `product-variant-picker.liquid` | 207 | 无 | `ProductVariantPicker.tsx` | **变体选择器主逻辑** — dropdown/button/swatch 3 种 |
| `progress-bar.liquid` | 39 | 无 | `ProgressBar.tsx` | 进度条 |
| `quantity-input.liquid` | 99 | 2 SVG | `QuantityInput.tsx` | 数量输入 |
| `quick-order-list.liquid` | 393 | 3 SVG | `QuickOrderList.tsx` | 快速下单主表 |
| `quick-order-list-row.liquid` | 320 | 4 SVG | `QuickOrderListRow.tsx` | 单行 |
| `quick-order-product-row.liquid` | 156 | 无 | `QuickOrderProductRow.tsx` | 单行(带变体) |
| `share-button.liquid` | 100 | `share.js`, 3 SVG | `ShareButton.tsx` | 分享 |
| `social-icons.liquid` | 80 | 10 SVG | `SocialIcons.tsx` | 社交 |
| `swatch-input.liquid` | 51 | 无 | `SwatchInput.tsx` | 色卡 radio |
| `swatch.liquid` | 31 | 无 | `Swatch.tsx` | 色卡展示 |
| `unit-price.liquid` | 19 | 无 | `UnitPrice.tsx` | 单位价 |
| `shopify-importmap.liquid` | 7 | (插件生成) | (自动) | - |

### 5.5 Theme Blocks(~40+,写在 `frontend/blocks/`)

| Block 文件 | 来自 section | 资源依赖 | 目标 |
|---|---|---|---|
| `announcement` | announcement-bar | 1 SVG | `Announcement.tsx` |
| `heading` (rich-text) | rich-text | 0 | `RichTextHeading.tsx` |
| `caption` (rich-text) | rich-text | 0 | `RichTextCaption.tsx` |
| `text` (rich-text) | rich-text | 0 | `RichTextText.tsx` |
| `button` (rich-text) | rich-text | 0 | `RichTextButton.tsx` |
| `slide` (slideshow) | slideshow | 2 SVG | `SlideShowSlide.tsx` |
| `image` (collage) | collage | 0 | `CollageImage.tsx` |
| `product` (collage) | collage | 0 | `CollageProduct.tsx` |
| `collection` (collage) | collage | 0 | `CollageCollection.tsx` |
| `column` (multicolumn) | multicolumn | 0 | `MulticolumnColumn.tsx` |
| `item` (multirow) | multirow | 0 | `MultirowItem.tsx` |
| `row` (collapsible-content) | collapsible-content | 1 SVG | `CollapsibleRow.tsx` |
| `heading` (newsletter) | newsletter | 0 | `NewsletterHeading.tsx` |
| `paragraph` (newsletter) | newsletter | 0 | `NewsletterParagraph.tsx` |
| `email_form` (newsletter) | newsletter | 0 | `NewsletterEmailForm.tsx` |
| `article` (featured-blog) | featured-blog | 0 | `FeaturedBlogArticle.tsx` |
| `text` (main-product) | main-product | 0 | `ProductText.tsx` |
| `title` (main-product) | main-product | 0 | `ProductTitle.tsx` |
| `price` (main-product) | main-product | 0 | `ProductPrice.tsx` |
| `rating` (main-product) | main-product | 0 | `ProductRating.tsx` |
| `description` (main-product) | main-product | 0 | `ProductDescription.tsx` |
| `sku` (main-product) | main-product | 0 | `ProductSku.tsx` |
| `variant_picker` (main-product) | main-product | 0 | `ProductVariantPickerBlock.tsx` |
| `buy_buttons` (main-product) | main-product | 0 | `ProductBuyButtonsBlock.tsx` |
| `quantity_selector` (main-product) | main-product | 0 | `ProductQuantity.tsx` |
| `share` (main-product) | main-product | 0 | `ProductShare.tsx` |
| `custom_liquid` (main-product) | main-product | 0 | `ProductCustomLiquid.tsx` |
| `collapsible_tab` (main-product) | main-product | 0 | `ProductCollapsibleTab.tsx` |
| `popup` (main-product) | main-product | 0 | `ProductPopup.tsx` |
| `metafield` (main-product) | main-product | 0 | `ProductMetafield.tsx` |
| `inventory_status` (main-product) | main-product | 0 | `ProductInventoryStatus.tsx` |
| `complementary_products` (main-product) | main-product | 0 | `ProductComplementaryProducts.tsx` |
| `@app` | (multiple) | 0 | `<AppBlock>` (插件内置) |

> Block 的渲染全部通过 `useBlockLoop(section.blocks, block => switch block.type ...)` 完成,**block 自身用单独的 `useBlockSettings("X")` hook**。

---

## 6. 关键场景的资源依赖决策(详细版)

### 6.1 main-product.liquid(最复杂, 重点关注)

**Dawn 实际引用(必须全部迁移)**:
- CSS(11 个):`component-accordion`, `component-card`, `component-complementary-products`, `component-deferred-media`, `component-model-viewer-ui`, `component-price`, `component-product-model`, `component-product-variant-picker`, `component-rating`, `component-slider`, `component-swatch-input`, `component-swatch`, `component-volume-pricing`, `quick-add`, `section-main-product`
- JS(10 个):`magnify.js`(2.1KB), `media-gallery.js`(4.9KB), `price-per-item.js`(4.4KB), `product-form.js`(5.5KB), `product-info.js`(16.8KB), `product-modal.js`(1.3KB), `product-model.js`(1.4KB), `quick-add.js`(4.8KB), `show-more.js`(1.2KB), `theme-editor.js`(2.1KB)
- SVG(6 个):`icon-arrow, icon-caret, icon-close, icon-inventory-status, icon-minus, icon-plus`

**React 重构分配**:
- `MainProduct.tsx` 主文件
- 15+ 个 block component 写在 `frontend/blocks/product-*.tsx`
- `useProductVariants` hook 接管变体选择状态机
- `useProductForm` hook 接管 form / add to cart
- `useMediaGallery` hook 接管图库 + 视频 + 3D
- `usePickupAvailability` hook 接管本地库存
- `useProductInfo` 接管"主图跟随变体"逻辑(原 product-info.js 16.8KB 全部重写)
- `useQuantityPopover` 接管数量 popover

**JS 依赖**:
| 原始 JS | React 替代 | 旧文件处置 |
|---|---|---|
| `product-info.js` | `useProductInfo` + `useMediaGallery` hook | 删 |
| `product-form.js` | `useProductForm` hook | 删 |
| `product-modal.js` | `ProductMediaModal` 组件 | 删 |
| `product-model.js` | `ProductModel3D` 组件 | 删 |
| `media-gallery.js` | `useMediaGallery` hook | 删 |
| `magnify.js` | `<ImageZoom>` 组件 | 删 |
| `quick-add.js` | `useQuickAdd` hook | 删 |
| `price-per-item.js` | `usePricePerItem` hook | 删 |
| `show-more.js` | `<ShowMore>` 组件 | 删 |
| `theme-editor.js` | 保留兜底(theme editor 监听) | **保留** |

### 6.2 header.liquid

**Dawn 实际引用**:
- CSS(6 个):`component-cart-notification`, `component-list-menu`, `component-mega-menu`, `component-menu-drawer`, `component-price`, `component-search`
- JS(1 个):`cart-notification.js`(2.3KB)
- SVG(3 个):`icon-account, icon-cart, icon-cart-empty`

**决策**:
- `cart-notification.js` 短期保留作为 header 内的弹窗消息源,React 通过 `window.addEventListener('cart-update')` 订阅
- 长期(阶段 6)用 React 状态重写

### 6.3 main-cart-items.liquid + main-cart-footer.liquid

**Dawn 实际引用**:
- CSS(6 个):`component-cart-items`, `component-cart`, `component-discounts`, `component-price`, `component-totals`, `quantity-popover`
- JS(2 个):`cart.js`(10.9KB) — 核心购物车 API, `quantity-popover.js`(3.5KB)
- SVG(7 个)

**决策**:
- `cart.js` 是核心 API 模块,**重写为 `useCart()` hook**(封装 Shopify AJAX API + PubSub)
- `quantity-popover.js` 重写为 `QuantityPopover` 组件
- 原 `cart.js` 在所有 cart 相关 section 迁移完成后删除

### 6.4 main-collection-product-grid.liquid

**Dawn 实际引用**:
- CSS(5 个):`component-card`, `component-facets`, `component-price`, `mask-blobs`, `template-collection`, `quick-add`
- JS(7 个):`facets.js`(13.9KB), `price-per-item.js`, `product-form.js`, `quantity-popover.js`, `quick-add-bulk.js`(6.6KB), `quick-add.js`, `quick-order-list.js`
- SVG(2 个):`icon-caret`, `mask-arch`

**决策**:
- `facets.js` (13.9KB) 是核心过滤逻辑,**重写为 `useFacets` hook + `<Facets>` 组件**
- `quick-order-list.js` (17.5KB) **重写为 `useQuickOrderList` hook**
- 这些 JS 体积大,React 化后预期有 30-50% 体积缩减(tree-shaking)

---

## 7. theme.liquid 精简方案

迁移完成后,`layout/theme.liquid` 应精简为:

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
    {% render 'shopify-importmap' %}  {# ★ 插件生成 #}

    {# ★ 全局 JS(短期保留,React 通过 window 桥接) #}
    <script src="{{ 'constants.js' | asset_url }}" defer="defer"></script>
    <script src="{{ 'pubsub.js' | asset_url }}" defer="defer"></script>
    <script src="{{ 'global.js' | asset_url }}" defer="defer"></script>

    {# ★ animations(滚动动画)保留 #}
    {%- if settings.animations_reveal_on_scroll -%}
      <script src="{{ 'animations.js' | asset_url }}" defer="defer"></script>
    {%- endif -%}

    {{ content_for_header }}

    {# ★ CSS 变量注入(从 settings.* 输出 :root 变量) — 替代 base.css 中的 :root 段 #}
    {% style %}
      :root {
        --font-body-family: {{ settings.type_body_font.family }}, {{ settings.type_body_font.fallback_families }};
        ...
      }
    {% endstyle %}

    {# ★ 共享 CSS 通过插件自动注入(每个 section 的 {% stylesheet %} 块) #}
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

**theme.liquid 净删除清单**:
- ❌ 全部 `<link rel="stylesheet" href="component-*.css">` (10+ 行) — 改为 React 组件 import
- ❌ `details-disclosure.js` / `details-modal.js` / `search-form.js` — 改为 React 组件,直接 import
- ❌ `cart-drawer.js` / `cart-notification.js` / `predictive-search.js` / `localization-form.js` — 改为 React 组件
- ❌ `component-cart-drawer.css` / `component-cart-items.css` / `component-cart.css` / `component-discounts.css` / `component-totals.css` / `component-predictive-search.css` / `component-localization-form.css` — 改为 React 组件 import
- ❌ `window.shopUrl` / `window.routes` / `window.cartStrings` / `window.variantStrings` / `window.quickOrderListStrings` / `window.accessibilityStrings` (50+ 行 `<script>`) — 改为 React 启动时从 LiquidDataProvider 读取

---

## 8. 阶段化执行计划

> 每个阶段都是一个或多个 PR,review 顺序按阶段。

### 阶段 0 — 清理(单一 PR)

```
删除文件:
  examples/react-dawn/sections/react-*.liquid        (13 个)
  examples/react-dawn/assets/build/                   (整个目录)
  examples/react-dawn/snippets/shopify-importmap.liquid

保留不动:
  examples/react-dawn/sections/*.liquid               (所有原生)
  examples/react-dawn/snippets/*.liquid
  examples/react-dawn/templates/*.json
  examples/react-dawn/assets/*.css *.js *.svg        (assets/ 下的所有原生)
  examples/react-dawn/layout/
  examples/react-dawn/config/
  examples/react-dawn/locales/
  examples/react-dawn/vite.config.ts
  examples/react-dawn/tsconfig.json
  examples/react-dawn/package.json
  examples/react-dawn/pnpm-workspace.yaml
  examples/react-dawn/.gitignore
  examples/react-dawn/.shopifyignore
  examples/react-dawn/.theme-check.yml
```

### 阶段 1 — 插件扩展(独立 PR 在 vite-plugin-react-shopify)

按顺序提交,每个 PR 包含实现 + 单测 + 文档:

| 子阶段 | 新 API | PR 标题 |
|---|---|---|
| 1.1 | `useRawLiquid`, `useForm`, `usePaginate` | `feat(runtime): raw liquid, form, paginate hooks` |
| 1.2 | `useImageTag`, `useImageUrl`, `useAsset`, `useFontFace` | `feat(runtime): image and asset hooks` |
| 1.3 | `useT`, `useRoute`, `usePlaceholderSvg` | `feat(runtime): translation and route hooks` |
| 1.4 | `useBlockLoop`, `useBlockType`, `useShopifyAttributes`, `<AppBlock>` | `feat(runtime): block loop API` |
| 1.5 | `useSectionPadding`, `useColorScheme`, `useThemeSettings` | `feat(runtime): style and theme settings hooks` |
| 1.6 | CSS Modules 支持, `manualChunks` 拆分, `cleanOrphans` | `feat(ssg): css modules, orphan cleanup` |
| 1.7 | `inline_asset_content` / `placeholder_svg_tag` / `t:` 表达式跟踪 | `feat(ssg): extended filter tracking` |

**版本号策略**:阶段 1 期间在 react-dawn 用 `vite-plugin-react-shopify: workspace:*` 直接引用本地 alpha。

### 阶段 2 — 基础组件 + 简单 section(多个 PR,每 PR 一个组件族)

PR 列表(每个 PR 独立 review):
- 2.1 `frontend/styles/*.css`(tokens / layout / typography / forms / animation)
- 2.2 `frontend/icons/*` 全部 95 个图标(脚本批量生成,人工 review 关键 5 个)
- 2.3 `frontend/components/Button, Heading, Image, Icon, Rte, Price`(基础展示组件)
- 2.4 简单 section 一组(≤5 个):`main-404, main-page, page, apps, custom-liquid, cart-icon-bubble, cart-live-region-text, cart-notification-button, main-list-collections, main-collection-banner, main-blog, pickup-availability`
- 2.5 简单 customer section 一组:`main-login, main-register, main-activate-account, main-reset-password`

### 阶段 3 — 中等 section + snippet(多个 PR,每 PR 一个 section 或 1-2 个 snippet)

按依赖关系排序:
- 3.1 `icon-accordion` + `icon-with-text` + `loading-spinner` + `unit-price` + `progress-bar` 基础 snippet
- 3.2 `price` + `price-facet` + `pagination` + `swatch` + `swatch-input` + `quantity-input` 工具 snippet
- 3.3 `article-card` + `card-collection` + `social-icons` + `share-button` 卡片 snippet
- 3.4 `header-search` + `header-dropdown-menu` + `header-drawer` + `header-mega-menu` 导航 snippet
- 3.5 `country-localization` + `language-localization` 本地化 snippet
- 3.6 `meta-tags` 决定保留(SEO)还是迁移
- 3.7 `announcement-bar` section
- 3.8 `image-banner` + `image-with-text` + `video` section
- 3.9 `rich-text` section + 4 个 block
- 3.10 `multicolumn` + `multirow` section + 2 个 block
- 3.11 `collapsible-content` section + row block
- 3.12 `slideshow` section + slide block
- 3.13 `collage` section + 3 个 block
- 3.14 `contact-form` + `newsletter` + `email-signup-banner` form section
- 3.15 `featured-blog` + `collection-list` + `main-article` section
- 3.16 `featured-collection` + `related-products` section
- 3.17 `main-account` + `main-addresses` + `main-order` customer section
- 3.18 `product-variant-options` + `product-variant-picker` + `product-media` + `product-thumbnail` + `product-media-modal` + `product-media-gallery` snippet
- 3.19 `card-product` snippet(最复杂之一)
- 3.20 `gift-card-recipient-form` snippet

### 阶段 4 — 复杂 section(每个 section 独立 PR)

按工作量排序:
- 4.1 `header` section
- 4.2 `footer` section
- 4.3 `main-search` section
- 4.4 `predictive-search` section
- 4.5 `buy-buttons` snippet
- 4.6 `cart-drawer` section
- 4.7 `cart-notification` + `cart-notification-product` section
- 4.8 `main-cart-items` + `main-cart-footer` section
- 4.9 `quick-order-list` + `quick-order-product-row` + `quick-order-list-row` + `bulk-quick-order-list` section + snippet
- 4.10 `facets` + `price-facet` snippet
- 4.11 `main-collection-product-grid` section(最复杂之一)
- 4.12 `featured-product` section
- 4.13 `main-product` section(最复杂,15+ block)

### 阶段 5 — 集成 + theme.liquid 精简

- 5.1 替换 `header-group.json` / `footer-group.json` 中的 section type 为 `react-*`
- 5.2 替换 `templates/index.json` 等 20 个 JSON 中的 section type 为 `react-*`
- 5.3 精简 `layout/theme.liquid`(按 §7)
- 5.4 删 `assets/` 下已无引用的 CSS/JS(按引用计数)

### 阶段 6 — 性能优化 + 清理

- 6.1 移除 `global.js` 中已被 React 替代的工具函数(逐步)
- 6.2 删除 `assets/` 下所有不再被引用的 CSS/JS/SVG
- 6.3 Lighthouse 评分比对(目标:不低于 Dawn 基线)
- 6.4 写 `frontend/README.md` 和 `QUIRKS.md`

---

## 9. 风险与回退策略

| 风险 | 影响 | 缓解 | 回退 |
|---|---|---|---|
| 插件扩展耗时超预期 | 阻塞阶段 2-4 | 阶段 1 提前 1 周开始,1.1-1.4 并行 | 短期使用 JSX 字符串字面量 + 现有 useLiquidBlock 兜底 |
| Dawn 的 `product-form.js` 与 React 状态冲突 | hydration error | `useEffect` 中调原生 API,`useRef` 桥接 | 保留原 JS 不删,React 仅包装 UI |
| CSS 选择器改名导致 Dawn 不兼容 | 视觉破坏 | **绝对不改 Dawn 选择器名**,React 中沿用 `.button--primary` 等 | 若必须改,用 `:global()` 包裹 |
| 翻译 `t:` 复杂变量漏跟踪 | UI 显示 key | 阶段 1.7 完备测试 + 自定义 Shopify 翻译扫描脚本 | 短期保留 meta-tags Liquid 兜底 |
| 体积膨胀(React vendor ~140KB) | LCP 下降 | 阶段 6 tree-shaking,确认 React 实际打包小于 130KB | 改用 Preact(需 alias 配置) |
| `paginate` URL 状态丢失 | 用户跳页失败 | `usePaginate` 内部 pushState + `popstate` 监听 | 短期保留 Dawn 的 main-search.js 处理 URL |
| `form 'product'` 与 `form 'customer'` 标签的差异 | 提交失败 | `useForm` 抽象统一接口 | 单 form 类型走专用 hook |
| `featured-product` 与 `main-product` 逻辑重叠 | 维护负担 | 共用 `useProductInfo` / `ProductForm` 等基础 hook,各自包装 section settings | 暂时容忍重复 |

---

## 10. 验收标准

每完成一个 section/snippet 的 React 版本,必须满足:

1. **DOM 像素级一致** — 同一商店同一数据下,React 渲染与 Dawn 原生渲染视觉一致
2. **零 hydration error** — 浏览器 console 无 React error #418/#422/#423
3. **Lighthouse Performance ≥ 90** — 阶段性回归测试
4. **`shopify theme check` 通过** — CI 必跑
5. **`.shopifyignore` 不变** — `frontend/` 已正确忽略
6. **JSON templates 可用** — 通过 `ssg.prefix` 自动生成 `react-*` 名称,原 `index.json` 不改 `type` 字段也能匹配(或确认 JSON 需改)
7. **本地化完整** — 所有翻译键经 `useT` 输出,无遗漏
8. **section schema 与 Dawn 完全等价** — 商家在 Shopify 后台看到的设置项不变

---

## 11. 待确认事项(在评审中需要你决策)

| # | 事项 | 建议默认 |
|---|---|---|
| 1 | 是否引入 Preact(体积 3KB,完全替代 React) | 不引入,使用 React 19,优化放阶段 6 |
| 2 | 是否拆 `react-dawn` 仓库(主仓库仅保留插件 + example,react-dawn 独立) | 不拆,保持 monorepo |
| 3 | `password.liquid` 整页是否迁移 | **不迁移**(低频入口,留作对照) |
| 4 | 4 个未被引用的 `announcement` block setting(已观察) | 保持 Dawn 现状 |
| 5 | 95 个 svg 中 ~25 个彩蛋类(apple/banana/...)是否删除 | **删除**,减少 assets 体积 |
| 6 | 阶段 5 删 `assets/` 下无引用 CSS/JS 是否在本 PR 范围 | 拆为独立 commit,便于回退 |
| 7 | `meta-tags` snippet 是否迁移 | **不迁移**(SEO 关键,液态逻辑多) |
| 8 | 翻译 key 跟踪失败时是警告还是报错 | **报错**(避免线上空白) |
| 9 | 原有 `cart.js` 等 JS 文件最终是否删除 | **不删**,永远保留作为 `noModule` fallback |
| 10 | 阶段 0 清理 PR 是否需要 `git mv` 备份后再删 | 备份到 `git tag dawn-original` 即可,不需备份文件 |

---

## 12. 关键文件引用

- 插件入口: `packages/vite-plugin-react-shopify/src/index.ts:33`
- SSG 流水线: `packages/vite-plugin-react-shopify/src/ssg/compiler.ts:81`
- 模板 wrapper: `packages/vite-plugin-react-shopify/src/ssg/liquid-assembler.ts:162-253`
- `useLiquidBlock` 限制(只能前置注入): `packages/vite-plugin-react-shopify/src/runtime/hooks.ts:277-301`
- 现有 useLiquidValue / useBlockSettings 模式: `examples/react-shopify-example/frontend/sections/HelloWorld.tsx:1-48`
- Dawn main-product 复杂范例: `examples/react-dawn/sections/main-product.liquid:1-100`
- Dawn main-cart-items 购物车逻辑: `examples/react-dawn/sections/main-cart-items.liquid:1-100`
- Dawn header sticky / mega menu: `examples/react-dawn/sections/header.liquid:1-100`
- Dawn theme.liquid 全局资源: `examples/react-dawn/layout/theme.liquid:1-50`
- Dawn settings_schema: `examples/react-dawn/config/settings_schema.json:1-50`

---

**请评审本报告,提出修改意见。** 任何被标注为"待确认事项"的点都需要你明确表态,然后我们进入阶段 0 + 阶段 1 的实施。
