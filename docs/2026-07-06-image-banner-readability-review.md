# ImageBanner.tsx 可读性待评估清单

日期：2026-07-06

范围：`examples/react-dawn/frontend/sections/ImageBanner.tsx`

目标：只梳理 React 组件可读性和维护性问题。Dawn 行为差异、视觉差异、输出功能差异不作为本文的主要判断标准，除非它们直接影响代码理解成本。

## 评估说明

- `状态` 用于逐项评估：`待评估`、`接受现状`、`计划处理`、`已处理`。
- `优先级` 是从维护收益和改动风险综合判断，不代表功能紧急程度。
- 可选方案不是最终方案；如果方案会增加抽象成本，应在实施前单独确认。

## 总体判断

`ImageBanner.tsx` 的核心问题不是单点代码错误，而是一个文件承担了过多角色：

- React 渲染结构
- Liquid runtime 表达式
- Shopify image 参数
- className 条件组合
- CSS 变量生成
- Theme Blocks slot
- Shopify section schema

这会让普通 React 开发人员很难快速建立心智模型。比较理想的改造方向是：先把纯配置移走，再把重复渲染逻辑收敛，最后为 Liquid 表达式和 class/style 生成建立局部命名边界。

## 待处理列表

### 1. `shopifyMeta` 占据文件后半段

状态：待评估

优先级：P1

涉及代码：

- `examples/react-dawn/frontend/sections/ImageBanner.tsx` 的 `export const shopifyMeta = ...`
- 大量 settings/options/presets 配置

问题：

`shopifyMeta` 是 Shopify section schema 配置，不是组件渲染逻辑。它目前占据文件一半以上，导致阅读者要在一个文件里同时处理 UI 结构和 schema 配置。对 React 开发人员来说，这会显著降低入口文件的可扫读性。

影响：

- 打开文件后很难快速定位真正的组件逻辑。
- schema 修改和组件重构互相干扰 diff。
- 后续增加配置会继续放大文件体积。

可选方案：

- 新建 `ImageBanner.meta.ts`，移动 `shopifyMeta`。
- 当前文件保留：

```ts
export { shopifyMeta } from "./ImageBanner.meta";
```

风险：

- 需要确认构建工具支持从 re-export 中识别 `shopifyMeta`。
- 如果不支持，可保留当前导出并从 meta 文件 import：

```ts
import { shopifyMeta } from "./ImageBanner.meta";
export { shopifyMeta };
```

验收点：

- 生成的 `sections/react-image-banner.liquid` schema 与移动前一致。

### 2. schema options 纯配置噪音过高

状态：待评估

优先级：P2

涉及代码：

- `image_height.options`
- `image_behavior.options`
- `desktop_content_position.options`
- `desktop_content_alignment.options`
- `mobile_content_alignment.options`

问题：

select options 是纯数据，但现在以内联对象数组形式塞在 schema 中。即使将 `shopifyMeta` 移出文件，meta 文件内部仍会显得冗长。

影响：

- 修改 schema 时需要在大量重复结构中滚动。
- 同类 alignment options 无法复用，容易出现 label 或 value 不一致。

可选方案：

- 在 `ImageBanner.meta.ts` 中提取常量：

```ts
const alignmentOptions = [
  { value: "left", label: "..." },
  { value: "center", label: "..." },
  { value: "right", label: "..." },
];
```

- 对位置类 options 提取 `desktopContentPositionOptions`。

风险：

- 配置拆分后需要避免过度抽象；不要为了少几行而隐藏 Shopify schema 结构。

验收点：

- schema 输出内容不变。
- 选项顺序不变。

### 3. `ImageBannerMedia` 同时承担过多职责

状态：待评估

优先级：P1

涉及代码：

- `function ImageBannerMedia()`
- `firstMediaClassName`
- `placeholderMediaClassName`
- `secondMediaClassName`
- 三段 `LiquidIf`

问题：

`ImageBannerMedia` 同时处理：

- 第一张图片
- 第二张图片
- placeholder
- 双图 half 布局
- image behavior animation class
- scroll animation class
- `ShopifyImage` 参数

函数名看起来只是“渲染媒体”，但内部需要理解完整 section 图片策略。阅读者很难区分哪些逻辑属于容器，哪些逻辑属于图片本身。

影响：

- 修改第一张图时容易漏掉第二张图。
- 修改 className 时需要同时检查三组 class。
- 图片参数逻辑夹在 JSX 中，难以独立评估。

可选方案：

- 保留 `ImageBannerMedia` 作为编排层。
- 提取 `BannerImageMedia` 负责单张图片：

```tsx
function BannerImageMedia({
  image,
  pairedImage,
  position,
  sizes,
}: BannerImageMediaProps) {
  // render one image media
}
```

- `ImageBannerMedia` 只保留：

```tsx
<LiquidIf condition="section.settings.image != blank">
  <BannerImageMedia position="first" ... />
</LiquidIf>
<LiquidIf condition="section.settings.image == blank and section.settings.image_2 == blank">
  <PlaceholderMedia />
</LiquidIf>
<LiquidIf condition="section.settings.image_2 != blank">
  <BannerImageMedia position="second" ... />
</LiquidIf>
```

风险：

- props 如果设计得过泛，会把 Liquid 字符串从一个地方扩散到多个地方。
- 提取后必须构建检查生成 Liquid，确保 wrapper 和 class 输出没有变化。

验收点：

- JSX 主结构更短。
- 第一图/第二图共享逻辑集中。
- 生成的 media DOM/class 与原输出一致或差异可解释。

### 4. 第一张图和第二张图 JSX 重复

状态：待评估

优先级：P1

涉及代码：

- 第一张图 `ShopifyImage image="section.settings.image"`
- 第二张图 `ShopifyImage image="section.settings.image_2"`

问题：

两段 `ShopifyImage` props 高度重复，差异包括：

- `image` expression
- `tagWidth` / `tagHeight`
- paired image 判断
- `imageClass`
- `sizes` 条件

这些差异目前以内联方式散落在两段 JSX 中。

影响：

- 后续修改 `widths`、`fetchPriority`、`autoLoading` 时容易只改一处。
- review 时需要逐字比较两段逻辑。

可选方案：

- 提取 `BannerShopifyImage`：

```tsx
function BannerShopifyImage({
  image,
  pairedImage,
  sizes,
}: BannerShopifyImageProps) {
  return <ShopifyImage ... />;
}
```

- 或者提取更轻量的 props builder：

```ts
function getBannerImageProps(image: ImageSetting, pairedImage: ImageSetting) {
  return { ... };
}
```

建议：

优先用组件提取，不建议用纯函数返回复杂 JSX props。因为 Liquid DSL 的返回值类型较特殊，组件边界更直观。

验收点：

- 第一图/第二图只有必要差异留在调用点。
- `ShopifyImage` 关键参数不再重复写两遍。

### 5. `liquidChoice` 规则夹在 JSX props 中

状态：待评估

优先级：P2

涉及代码：

- `sizes={liquidChoice(...)}`
- `widths={liquidChoice(...)}`
- `fetchPriority={liquidChoice(...)}`

问题：

`liquidChoice` 是业务规则和 Liquid 条件优先级的组合。放在 JSX props 里会让一行代码同时表达“渲染图片”和“计算响应式图片策略”。

影响：

- 很难一眼看出规则顺序。
- 后续调整条件时容易破坏优先级。
- 组件主体变得像配置解释器。

可选方案：

- 提取命名常量：

```ts
const firstImageSizes = liquidChoice(...);
const secondImageSizes = liquidChoice(...);
const bannerImageWidths = liquidChoice(...);
const bannerFetchPriority = liquidChoice(...);
```

- 如果需要复用，可提取函数：

```ts
function getBannerImageSizes(image: BannerImageKey) {
  return liquidChoice(...);
}
```

风险：

- 如果函数参数只是 `"first" | "second"`，可读性可能比两个显式常量更差。

验收点：

- JSX 中看到的是命名后的意图，例如 `sizes={firstImageSizes}`。
- Liquid 条件优先级仍集中可查。

### 6. Liquid expression string 到处散落

状态：待评估

优先级：P1

涉及代码示例：

- `"section.settings.image"`
- `"section.settings.image_2"`
- `"section.settings.image_behavior != 'none'"`
- `"settings.animations_reveal_on_scroll"`
- `"section.settings.show_text_box"`
- `"section.settings.image_height == 'adapt' and section.settings.image != blank"`

问题：

Liquid 表达式以字符串形式分布在整个文件中。字符串没有自动补全，也很难重命名。对 React 开发人员来说，这些字符串是隐藏的运行时 contract。

影响：

- 拼写错误不容易被 TypeScript 发现。
- 条件复用靠复制粘贴。
- 同一概念可能出现多种写法。

可选方案：

- 建立文件内常量对象：

```ts
const bannerLiquid = {
  image: "section.settings.image",
  image2: "section.settings.image_2",
  imagePresent: "section.settings.image != blank",
  image2Present: "section.settings.image_2 != blank",
  revealOnScroll: "settings.animations_reveal_on_scroll",
};
```

- 对复杂条件继续分组：

```ts
const bannerConditions = {
  hasBothImages: `${bannerLiquid.imagePresent} and ${bannerLiquid.image2Present}`,
};
```

风险：

- 字符串拼接可能降低对最终 Liquid 表达式的直观性。
- 对短表达式可以只提取高频项，不必全量抽象。

验收点：

- 高频 Liquid path 只定义一次。
- 复杂条件有名称表达意图。

### 7. `bannerClassName` 可读性偏低

状态：待评估

优先级：P2

涉及代码：

- `const bannerClassName = clsx(...)`

问题：

`bannerClassName` 混合：

- 静态 class
- 基于 `useLiquid()` 返回值的动态 class
- `useLiquidClass()` 条件 class
- `{ unless: true }` 反向条件

阅读时需要同时解析 React string interpolation 和 Liquid runtime condition。

影响：

- 很难快速判断 class 输出的完整集合。
- 反向条件 `unless` 不如正向命名直观。

可选方案：

- 提取 hook：

```ts
function useImageBannerClasses() {
  return {
    bannerClassName,
    contentClassName,
  };
}
```

- 或先提取局部变量：

```ts
const stackedClass = useLiquidClass(...);
const transparentClass = useLiquidClass(...);
```

建议：

先提取局部变量，不急着引入 hook。等 `contentClassName` 也变复杂后再合并成 hook。

验收点：

- 每个 Liquid class 条件都有意图名称。
- `clsx(...)` 调用长度明显下降。

### 8. `contentClassName` 目前尚可，但容易继续膨胀

状态：待评估

优先级：P3

涉及代码：

- `const contentClassName = clsx(...)`

问题：

当前还不算严重，但它和 `bannerClassName` 属于同一类问题。如果后续继续增加移动端、动画、编辑器状态相关 class，会很快变得难读。

影响：

- 当前影响较小。
- 后续维护时可能重复 `bannerClassName` 的问题。

可选方案：

- 暂时不处理。
- 如果处理第 7 项，可一起纳入 `useImageBannerClasses()`。

验收点：

- 保持当前简单结构即可。

### 9. `useLiquidCssVars` 打断主组件阅读

状态：待评估

优先级：P2

涉及代码：

- `const style = useLiquidCssVars(...)`

问题：

CSS 变量本身是合理边界，但 Liquid math 字符串较长，放在主组件里会打断“组件结构”的阅读路径。

影响：

- 主组件需要同时理解 layout、style、Liquid filter。
- 后续增加 CSS 变量时主组件会继续变厚。

可选方案：

- 提取 hook：

```ts
function useImageBannerStyle() {
  return useLiquidCssVars(...);
}
```

- 或提取配置常量：

```ts
const imageBannerCssVars = { ... };
```

建议：

优先提取 `useImageBannerStyle()`，因为它保留 hook 调用语义，也避免主组件直接暴露 Liquid math。

验收点：

- 主组件只看到 `const style = useImageBannerStyle();`
- CSS 变量逻辑仍在同文件或相邻文件中可查。

### 10. 主组件入口不够概览化

状态：待评估

优先级：P2

涉及代码：

- `export default function ImageBanner()`

问题：

主组件现在负责：

- 读取 section settings
- 生成 CSS variables
- 组合 root class
- 组合 content class
- 渲染 media
- 渲染 content box
- 挂载 `BlockSlot`

作为入口组件，它没有形成“先看结构，再看细节”的层级。

影响：

- 新读者必须从顶部到下方逐行解析。
- 很难只关注 markup 结构。

可选方案：

- 轻量方案：只提取 class/style 逻辑，主组件保留 markup。
- 中等方案：提取 `ImageBannerContent`：

```tsx
function ImageBannerContent({ className, colorScheme }: Props) {
  return (...);
}
```

- 不建议一开始引入 `model` 层，除非多个 section 都出现同类复杂度。

验收点：

- `ImageBanner()` 的返回结构可以在一屏内读完。
- Liquid 读取逻辑和 JSX 结构有基本分层。

### 11. `PlaceholderMedia` 的 Liquid-owned 意图不明显

状态：待评估

优先级：P3

涉及代码：

- `function PlaceholderMedia()`
- `<Island expression="{{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}" />`

问题：

普通 React 开发者看到 `Island` 不一定知道这里是保留 Shopify/Liquid 生成 SVG，而不是普通 React 子树。

影响：

- 维护者可能误以为可以直接用 React SVG 或字符串替换。
- 不理解 hydration 边界。

可选方案：

- 加一行短注释：

```tsx
// Keep Shopify's placeholder_svg_tag Liquid-owned so hydration preserves the generated SVG.
```

风险：

- 注释应保持简短，避免解释框架机制。

验收点：

- 读者能知道这里为什么不用普通 JSX。

### 12. Theme Blocks slot 和 Dawn block CSS 之间的关系不明显

状态：待评估

优先级：P2

涉及代码：

- `<BlockSlot className="banner__blocks" />`
- `ImageBanner.css` 中 `.banner__blocks .banner__block + .banner__block`
- `HeadingBlock.tsx`
- `TextBlock.tsx`
- `ButtonBlock.tsx`

问题：

原 Dawn section blocks 被 Theme Blocks 替代。`ImageBanner.tsx` 中只看到 `BlockSlot`，但 CSS 依赖 block root class，例如 `banner__block`、`banner__block--text`、`banner__block--buttons`。这个跨文件约定不明显。

影响：

- 修改 block class 时可能破坏 section 间距。
- 阅读 section 时不知道 slot 内要求什么结构。

可选方案：

- 在 `BlockSlot` 附近加短注释说明 slot children 需要提供 `banner__block*` class。
- 或在 `ImageBanner.css` 顶部加注释说明 Theme Block root class contract。

建议：

更推荐 CSS 顶部注释，因为这是样式 contract，不应让 TSX 承担太多样式解释。

验收点：

- 后续维护 block 时能快速发现 section CSS contract。

### 13. `ImageBanner.css` 是迁移 CSS，但文件内缺少迁移边界说明

状态：待评估

优先级：P3

涉及代码：

- `examples/react-dawn/frontend/sections/ImageBanner.css`

问题：

CSS 文件本身大部分是 Dawn section CSS 的迁移和 wrapper 适配。没有说明时，维护者可能误以为这是全新手写 CSS，从而随意重构 selector。

影响：

- 容易破坏 Dawn BEM 兼容性。
- 容易误删为 SSG wrapper 写的规则。

可选方案：

- 在 CSS 顶部加短注释：

```css
/* Migrated from Dawn section-image-banner.css. Keep Dawn BEM selectors; wrapper selectors account for SSG output. */
```

验收点：

- CSS 维护边界明确。

### 14. 文件缺少“React/Liquid 边界”命名层

状态：待评估

优先级：P2

涉及代码：

- 整个 `ImageBanner.tsx`

问题：

文件里有很多 Liquid runtime helper，但没有统一说明哪些值来自 Shopify runtime、哪些是普通 React 值、哪些只是 class helper。

影响：

- 新增逻辑时容易把 Liquid placeholder 当普通值使用。
- 维护者需要依赖经验判断哪些操作安全。

可选方案：

- 通过命名约定处理：
  - `bannerLiquid`：Liquid path
  - `bannerConditions`：Liquid condition
  - `useImageBannerStyle`：Liquid CSS var
  - `useImageBannerClasses`：Liquid class

风险：

- 不建议在文件顶部写长篇说明。命名比注释更重要。

验收点：

- 读者能从变量名判断某段逻辑是否 Liquid-owned。

## 建议实施顺序

### 第一阶段：低风险整理

目标：降低文件体积，不改变渲染结构。

建议处理：

1. 移出 `shopifyMeta`。
2. 提取 schema option 常量。
3. 提取 `useImageBannerStyle()`。
4. 为 `PlaceholderMedia` 或 CSS 迁移边界加短注释。

验证：

- `node_modules/.bin/vite build`
- 对比 `sections/react-image-banner.liquid` schema 是否无实质变化。

### 第二阶段：收敛重复图片逻辑

目标：减少双图重复，提升图片部分可读性。

建议处理：

1. 提取单图渲染组件。
2. 提取 `sizes` / `widths` / `fetchPriority` 命名变量。
3. 让 `ImageBannerMedia` 只保留编排结构。

验证：

- `node_modules/.bin/vite build`
- 检查 `sections/react-image-banner.liquid` 中两张图片仍被 Liquid 条件守卫。
- 检查没有 `NaNpx`、`${section.id}`、`href="routes.`。

### 第三阶段：建立 Liquid 命名边界

目标：降低新增逻辑时误用 Liquid placeholder 的风险。

建议处理：

1. 提取高频 Liquid path。
2. 提取复杂 Liquid condition。
3. 视复杂度决定是否提取 `useImageBannerClasses()`。

验证：

- `node_modules/.bin/vite build`
- 人工检查生成 Liquid 中 class 条件与改造前一致。

## 不建议立即处理的方向

- 不建议为了“React 纯净”移除 `LiquidIf`、`useLiquidClass`、`useLiquidCssVars`。这些 helper 是当前架构下保持 Shopify runtime 行为的关键边界。
- 不建议把所有 Liquid 表达式全部抽象成函数。短表达式可以保留，优先提取高频 path 和复杂条件。
- 不建议一开始引入全局通用 abstraction。先在 `ImageBanner` 内形成局部模式，确认有效后再推广到其他 section。

## 逐项评估模板

可复制下面模板逐项补充：

```md
### 决策：问题 N

状态：

结论：

采用方案：

不采用方案：

原因：

验收标准：
```
