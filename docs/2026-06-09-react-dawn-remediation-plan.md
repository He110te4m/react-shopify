# React Dawn 现有代码整改计划

> 整理日期：2026-06-09
> 依据：[react-dawn-frontend-review](./2026-06-09-react-dawn-frontend-review.md) + [react-dawn-migration-plan](./2026-06-09-react-dawn-migration-plan.md) 第 12 节 + [react-shopify-plugin](../../.agents/skills/react-shopify-plugin/) API

---

## 一、P0 — 立即修复（阻塞后续迁移）

### 1. 修复 `useSectionPadding` 的 `NaNpx` 问题

- **文件**：`frontend/hooks/useSectionPadding.ts`
- **影响产物**：`react-main-page`、`react-rich-text`、`react-video`、`react-image-with-text`
- **根因**：`Math.round(pt * 0.75)` 对 `useLiquid` 返回的 Liquid placeholder 字符串做 JS 数学运算，SSG 阶段得到 `NaN`
- **插件 API**：`useLiquidCode` — 插件推荐 scoped section style 用 `{%- style -%}` 块 + Liquid 原生 `times: 0.75` filter
- **方案**：hook 内部改用 `useLiquidCode` 发出 `{%- style -%}` 块，CSS 变量值用 Liquid 数学表达式；返回 className 而非 inline style，消费者改为 `className={clsx(..., className)}`

```tsx
// hook 内部
useLiquidCode(
  `{%- style -%}
    .section-{{ section.id }}-padding {
      --pt-desktop: {{ section.settings.padding_top }}px;
      --pt-mobile: {{ section.settings.padding_top | times: 0.75 | round: 0 }}px;
      --pb-desktop: {{ section.settings.padding_bottom }}px;
      --pb-mobile: {{ section.settings.padding_bottom | times: 0.75 | round: 0 }}px;
    }
  {%- endstyle -%}`,
  ["section.settings.padding_top", "section.settings.padding_bottom"],
);
return { className: `section-${sectionId}-padding` };
```

- **消费者改动**：所有 `const { style: paddingStyle } = useSectionPadding()` 改为 `const { className } = useSectionPadding()`，`style={paddingStyle}` 改为 `className={clsx(..., className)}`（SectionPadding.css 不变，CSS 变量由父级 class 继承）

### 2. 修复 `ImageBanner` 的 `${section.id}` 字面量

- **文件**：`frontend/sections/ImageBanner.tsx:97-99`
- **影响产物**：`react-image-banner.liquid:11-12`
- **根因**：`.replace(/STARTID/g, "${section.id}")` — JS 模板字面量写入了生成 Liquid，CSS selector 不匹配真实 section ID
- **方案**：去掉 `.replace()` ，字符串模板中直接写 `{{ section.id }}`

```tsx
// Before:
useLiquidCode(`... #Banner-STARTID::before ...`.replace(/STARTID/g, "${section.id}"), ...);
// After:
useLiquidCode(`... #Banner-{{ section.id }}::before ...`, ...);
```

### 3. 修复所有 `href="routes.*"` 字面量

- **文件**：
  - `frontend/sections/CollectionList.tsx:110,145`
  - `frontend/sections/FeaturedBlog.tsx:81,180`
- **影响产物**：`react-collection-list.liquid`、`react-featured-blog.liquid`
- **根因**：route 路径写成普通 JSX 字符串，未被 `useLiquid` 包裹
- **方案**：`const [url] = useLiquid<string>("routes.xxx_url")`，href 用 `{url}`

### 4. 修复 React 分支依赖 Liquid placeholder

- **文件**：
  - `frontend/sections/CollectionList.tsx:98,109,147` — `if (title)` / `showViewAll &&` 在 approval scope 内
- **其余文件** (`FeaturedBlog`, `ImageWithText`, `CollapsibleContent`, `SlideBlock`) 在暂停范围内，暂不修改
- **根因**：SSG 阶段 `useLiquid` 返回 placeholder 字符串（非空即真），`if (title)` 等分支在占位符上求值，生成固定结构，Theme Editor 中开关 setting 不影响输出
- **方案**：用 `useLiquidCode` 在 Liquid 层做条件判断，而非 React `&&`：

```tsx
const [titleActive] = useLiquid<string>("section.settings.title");

useLiquidCode(
  `{%- if section.settings.title != blank -%}
    <div class="title-wrapper-with-link ...">
      ...
    </div>
  {%- endif -%}`,
  ["section.settings.title"],
);
```

### 5. 暂停超出验收顺序的 React entries

- **当前超前草稿**：`FeaturedBlog`、`Multicolumn`、`ImageWithText`、`Multirow`、`Collage`、`Slideshow`、`CollapsibleContent`
- **未生成 block**：`CaptionBlock`、`ImageBlock`、`ColumnBlock`、`RowBlock`、`SlideBlock`
- **措施**：在 `vite.config.ts` 中通过 `ssg.directories` 排除对应目录/文件，防止未验收产物继续生成；源码文件保留作为草稿参考

---

## 二、P1 — 核心质量（P0 清零后逐项修复）

### 1. `page.content` HTML 渲染为 React 文本

- **文件**：`frontend/sections/MainPage.tsx:35,43`
- **影响产物**：`react-main-page.liquid`
- **根因**：`page.content` 是 Shopify HTML，作为 `{content}` React children 渲染会转义 HTML
- **方案**：用 raw Liquid 输出 `page.content`，或用插件 `Island` API 包裹

### 2. CollectionList 声明 blocks 但无 `BlockSlot`

- **文件**：`frontend/sections/CollectionList.tsx:60,128`
- **根因**：`shopifyMeta.blocks` 声明了 legacy `section.blocks`，但 React tree 无 `<BlockSlot />`，实际用 raw Liquid loop 渲染
- **方案**：保持当前 raw Liquid loop 方案（collection 对象行为未验证前不贸然转 Theme Block），但将 `shopifyMeta.blocks` 移除，消除构建 warning

### 3. 减少大型 raw Liquid 字符串

- **文件**：
  - `frontend/sections/ImageBanner.tsx:109-143` — Liquid assign block
  - `frontend/sections/FeaturedBlog.tsx:101-170` — article loop
  - `frontend/sections/CollectionList.tsx:128-139` — collection loop
  - `frontend/sections/CollapsibleContent.tsx:149-161` — accordion render
- **判断标准**：
  - 可接受：`{%- liquid assign ... -%}` 计算块、`{%- style -%}` 块（ImageBanner 属此类，保留）
  - 不可接受：完整 Liquid loop/snippet render（FeaturedBlog、CollectionList 属此类，需拆分或回退）
- **方案**：loop/snippet render 类 raw Liquid 块暂留在 Liquid section，待对应组件/spike 完成后再并入 React

### 4. 恢复 Schema 的 Dawn i18n 和默认值

- **文件**：
  - `frontend/sections/FeaturedBlog.tsx:9-40` — 英文硬编码 label/default
  - `frontend/sections/ImageWithText.tsx:9-99` — 同上
  - `frontend/blocks/ButtonBlock.tsx:4-24` — 同上
  - `frontend/blocks/RowBlock.tsx:5-10`
  - `frontend/blocks/ColumnBlock.tsx:5`
  - `frontend/blocks/ImageBlock.tsx:5`
- **根因**：多处 schema 丢失 Dawn 原版 `t:` 翻译键和 schema 元数据
- **方案**：逐行对照原 Dawn section schema 文件恢复

### 5. Button Block 空链接语义修复

- **文件**：`frontend/blocks/ButtonBlock.tsx:33`
- **根因**：`href={link || "#"}` — 空链接时输出 `href="#"`，Dawn 用 disabled-link 语义
- **方案**：空链接时输出 `role="link" aria-disabled="true"`，不输出 `href`

```tsx
{link
  ? <a href={link} className={...}>{label}</a>
  : <span role="link" aria-disabled="true" className={...}>{label}</span>
}
```

---

## 三、P2 — 代码清洁度

### 1. 删除未使用的 `useLiquid` 读取

- `frontend/sections/CollectionList.tsx:73` — `imageRatio` 读取但未使用
- `frontend/sections/FeaturedBlog.tsx:53-55` — `showImage`/`showDate`/`showAuthor` 读取但在 raw Liquid 中重复读
- `frontend/sections/ImageBanner.tsx:92-94` — `fetchPriority` 计算但未使用

### 2. 审计并最小化 CSS 覆盖

- `frontend/sections/ImageWithText.css:1-8` — 含 `display: flex` 等可能与 Dawn grid 分叉的覆盖
- 规则：优先复用 Dawn CSS，仅在实际 markup mismatch 确认后再加最小覆盖并注释原因

### 3. 建立生成产物 Grep 门禁

- 构建后检查 `.liquid` 产物：
  - 不含 `NaNpx`
  - 不含 `${section.id}` JS 模板字面量
  - 不含 `href="routes.` 字面量

---

## 四、执行顺序

```
第1轮（P0 清零）:
  1. useSectionPadding 改用 useLiquidCode + Liquid math
  2. ImageBanner 去掉 .replace() hack
  3. href="routes.*" 改为 useLiquid 读取
  4. CollectionList 的 React 分支改为 Liquid 条件
  5. vite.config 排除超前草稿

第2轮（P1 逐个修）:
  6. page.content raw Liquid / Island
  7. Button Block 空链接
  8. Schema i18n 恢复
  9. 拆分 large raw Liquid loop
  10. CollectionList 去掉无 BlockSlot 的 blocks 声明

第3轮（P2 清洁）:
  11. 删除未使用 useLiquid
  12. CSS override 审计
  13. Grep 门禁
```

---

## 五、已决策

1. **CollectionList 策略**：保持 raw Liquid loop 渲染 `section.blocks`。collection 对象行为未验证前不转 Theme Block。`shopifyMeta.blocks` 声明移除以消除构建 warning。
2. **暂停的超前草稿**：vite.config 排除，不继续生成产物，源码文件保留做草稿。
3. **page.content**：用 raw Liquid 输出，不经过 React children。
4. **raw Liquid 判断标准**：`{% style %}` / `{% liquid assign %}` 块是合法 `useLiquidCode` 用法，保留。完整 loop/snippet render 不可接受，需拆分。