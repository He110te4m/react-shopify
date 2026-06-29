# Section 迁移最佳实践

> 日期：2026-06-29
>
> 范围：将 Shopify Liquid section 迁移为 `vite-plugin-react-shopify` React section，并输出 Shopify 原生 Liquid 产物。

## 目标

Section 迁移完成后，React 源码应该拥有结构、schema、样式和交互边界。原 Dawn Liquid 文件和 `assets/section-*.css` 只作为对照来源保留，不作为 React section 的运行时依赖。

不要通过 `useLiquidCode` 重新引入原 stylesheet 来修复样式缺失。那会让 React 迁移仍依赖 Liquid asset，而不是完成 CSS 迁移。

## 迁移输入

开始前先同时打开这些文件：

- 原 section Liquid：`sections/<name>.liquid`
- 原 section CSS asset：通常是 `assets/section-<name>.css`，也可能有 `component-*.css`
- 相关 snippets / blocks / JS assets
- React section 源文件：`frontend/sections/<Name>.tsx`
- React section CSS：`frontend/sections/<Name>.css`
- 生成产物：`sections/react-<name>.liquid`

只看 React 源码不足以判断迁移是否正确。最终浏览器使用的是生成后的 Liquid、Shopify runtime 数据和打包后的 CSS。

## 推荐流程

1. 对照原 Liquid 结构，确定迁移边界。
   保留 Shopify runtime 才能正确处理的区域，例如 `{% form %}`、`{% paginate %}`、复杂 snippet、HTML-rich content。

2. 迁移 schema。
   `shopifyMeta` 要保留 Dawn 的 `t:` label、default、info、limit、preset、`enabled_on` / `disabled_on` 等信息。

3. 迁移 React 结构。
   保留 Dawn BEM className。需要 Shopify 生成媒体 DOM 时使用 `ShopifyImage` / `ShopifyVideo`，需要 merchant-managed child blocks 时使用 `BlockSlot`。

4. 迁移 CSS。
   将原 section CSS 中与该 section 视觉相关的规则复制到对应 React section CSS，再按生成 markup 适配 selector。不要把原 CSS asset 作为 React runtime 依赖。

5. 归属 block 样式。
   父 section 对 child block 的布局、间距、对齐、顺序规则放在父 section CSS。Theme Block CSS 只保留 block 自身可复用样式。

6. 处理 Liquid 动态值。
   padding、aspect ratio、overlay opacity 等运行时值优先变成 CSS custom properties，由 CSS 文件消费。不要用 JS 对 Liquid placeholder 做数学运算。

7. 构建并检查生成物。
   运行已有 workspace 脚本或直接使用已安装 binary。不要为了 build 重新安装依赖。

8. 浏览器验证。
   检查实际 DOM、加载的 CSS、computed style、Theme Editor add/remove/reorder、console hydration error。

## CSS 迁移规则

原 Dawn section CSS 常常同时包含三类规则：

- section 容器与媒体规则，例如 `.banner`、`.banner__media`
- section 内容区域规则，例如 `.banner__box`、`.banner__content`
- child block 布局规则，例如 `.banner__text`、`.banner__buttons`、`.banner__box > * + *`

迁移时不能只搬前两类。第三类虽然作用在 block 内容上，但它通常表达的是父 section 的布局语义，应该由父 section CSS 管理。

Theme Block 会引入额外 DOM：

- `<shopify-block-slot>`
- block root wrapper，例如 `class="banner__block banner__block--text"`
- hydration wrapper，例如 `data-ssg-h`

因此，原 Liquid 中依赖直接子节点或 sibling 的 selector 需要显式映射到生成后的稳定 class。优先给 slot 或 block root 增加语义 class，而不是靠 DOM 顺序猜测。

示例：

```css
/* Dawn 原结构：block 内容直接在 .banner__box 下 */
.banner__box > * + .banner__text {
  margin-top: 1.5rem;
}

/* React Theme Block 结构：通过 block root 表达父 section 间距 */
.banner__blocks .banner__block + .banner__block--text {
  margin-top: 1.5rem;
}
```

## 不要这样做

- 不要用 `useLiquidCode("{{ 'section-image-banner.css' | asset_url | stylesheet_tag }}")` 修复缺失样式。
- 不要因为视觉缺失就盲目添加 override；先确认原规则是否迁移、生成 CSS 是否加载、selector 是否匹配实际 DOM。
- 不要把 section-specific block spacing 放到独立 Theme Block CSS 后就认为完成迁移。
- 不要在 React 中用 runtime Liquid 值决定 SSG 时的结构分支。
- 不要删除原 Dawn Liquid 对照文件，除非明确批准。

## 生成物检查清单

构建后至少检查：

- `sections/react-*.liquid` 是否包含目标 section CSS 规则。
- 相关 `blocks/react-*.liquid` 是否只承载 block 自身样式，不依赖它们补齐父 section 布局。
- 是否有 `NaNpx`、`${section.id}`、`href="routes.` 等无效产物。
- `image_tag` 是否通过 `image_url` 且有 blank guard。
- CSS selector 是否匹配生成后的 `<shopify-block-slot>` 和 block root wrapper。
- schema 是否保留 Dawn 原设置和 preset。

常用检查：

```bash
rg 'NaNpx|\$\{section\.id\}|href="routes\.' examples/react-dawn/sections examples/react-dawn/blocks
rg '\| image_tag:' examples/react-dawn/sections/react-*.liquid examples/react-dawn/blocks/react-*.liquid
rg 'banner__text|banner__buttons|banner__heading' examples/react-dawn/sections/react-image-banner.liquid
```

## 视觉异常排查顺序

1. 确认线上预览实际使用的是 `react-*` section，而不是旧 section 或未部署产物。
2. 检查是否被 password/auth gate 阻断；阻断时不要声称已完成 live computed-style 验证。
3. 检查生成后的 section Liquid 是否包含需要的 CSS。
4. 检查 CSS 是否来自 section 自身，而不是依赖另一个 Liquid section 偶然加载的 asset。
5. 检查实际 DOM 是否多了 slot、block root、hydration wrapper。
6. 对照原 Dawn CSS selector，逐条确认 retained visual rule 有迁移后的 owner。
7. 再修改 selector 或 class，不要先猜。

## `image-banner` 经验记录

`image-banner` 的关键问题不是单纯的 `tag: null` 或某个 `>` selector，而是原 `section-image-banner.css` 的底部规则没有完整迁移到 React section CSS。

原 Dawn section 一旦被添加到页面，会加载 `section-image-banner.css`，因此 React banner 会“看起来恢复正常”。这说明 React 产物缺少或错放了对应 CSS 规则，而不是应该继续依赖原 Liquid section。

修复原则：

- `ImageBanner.css` 拥有 `.banner__text`、`.banner__heading`、`.banner__buttons` 和 block spacing 等 section 布局规则。
- `HeadingBlock.css`、`TextBlock.css`、`ButtonBlock.css` 只保留 block 自身可复用样式。
- `BlockSlot` 应带稳定 class，例如 `banner__blocks`，用于父 section CSS 匹配 child block root。
- 媒体区域如果原 selector 依赖 `first-child` / `nth-child`，React 结构可增加显式 class，例如 `banner__media--first` / `banner__media--second`。
