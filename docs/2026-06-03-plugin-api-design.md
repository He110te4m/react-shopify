# Plugin API Design — Dawn Migration Hooks

> 独立 API 评审文档 · v2(2026-06-03 修订)
> v1 → v2 主要修正:
> 1. `useImageTag` 归类错误:返回字符串会插入到 React 树中导致 hydration mismatch,改为 `<ImageTag>` 组件 + 标记替换模式
> 2. `useShopifyAttributes` 不可行:`{...string}` 不是合法 JSX,且当前插件已在 Liquid 层处理,直接移除
> 3. `useBlockLoop` 不可行:SSR 时 blocks 数据不可知,且与 `{% content_for 'blocks' %}` 机制冲突,改为 `<BlockSlot>` 组件
>
> 用途:把主报告(v3)中所有 hook 需求从 §8 抽出,提供**完整 API 签名、SSR/CSR 双端行为、边缘情况、实现路径、可行性评级**。
> 评审方法:每个 hook 单独评审,通过/打回/打回需返工,逐个推进。

---

## 0. 设计原则

### 0.1 SSR/CSR 双端对称

所有 hook 必须同时在两个环境中工作:

| 端 | 角色 | 关键能力 |
|---|---|---|
| **SSR**(Node.js, esbuild 临时 bundle) | 渲染 React 树,产出 HTML | 跟踪 Liquid 表达式,生成占位符,组装最终 Liquid |
| **CSR**(浏览器) | 拿到 SSR 产出的 HTML 后,接管 hydration | 从 JSON bridge 读值,接管 React state |

### 0.2 占位符机制(关键设计)

部分 hook 需要在 React 树中"占一个位置",在 SSR 结束后被替换为真实 Liquid 代码。设计:

```
React 树:
  <div>
    <h1>{title}</h1>
    <!--RAW-LIQUID-0-->
    <p>{desc}</p>
    <!--RAW-LIQUID-1-->
  </div>

SSR 收集占位符: ['{% form "customer" %}', '{% endform %}']

最终 HTML:
  <div>
    <h1>{{ section.settings.title }}</h1>
    {% form "customer" %}
    <p>{{ section.settings.desc }}</p>
    {% endform %}
  </div>

客户端:
  React 树中 <!--RAW-LIQUID-0--> 渲染为 <span hidden data-raw-liquid="0"></span>
  水合时,占位 span 是空 div,DOM 树结构对齐(无 hydration mismatch)
  真实 Liquid 在服务端已被 Shopify 求值,水合后 span 仍在但内容已渲染
```

### 0.3 JSON Bridge 分层

| 层级 | 形式 | 何时使用 |
|---|---|---|
| **Section 级** | `<script type="application/json" data-ssg-liquid>` 在 `<div data-ssg-hydrate>` 之前,包含所有 section 级表达式 | 单一 section 的 settings/blocks 顶层 |
| **Block 级** | 每个 block 单独一个 `<div data-ssg-block-id="X" data-ssg-hydrate>` + 自己的 JSON bridge | Block 内的 `block.settings.X`(避免跨 block 冲突) |
| **Snippet 级** | 简单单层结构 | Snippet 内部 |

**当前插件局限**:只有 section 级 bridge,block 级 bridge 不存在。需要新增。

---

## 1. Hook 分类总览

按实现复杂度与可行性分为 4 类:

| 类别 | 标记 | 描述 | 数量 |
|---|---|---|---|
| **A 类 — 简单值 hook** | 🟢 HIGH | 行为类似现有 `useLiquidValue`,只是参数不同 | 10(v1:11) |
| **A' 类 — 标记替换组件** | 🟡 MEDIUM | 输出 HTML 片段,需标记替换避免水合 mismatch | 1(useImageTag 改造) |
| **B 类 — 标记替换 hook** | 🟡 MEDIUM | 需要在 React 树中插入占位符,SSR 后字符串替换 | 3(v1:4,useShopifyAttributes 移除) |
| **C 类 — 组件化 slot** | 🟢 HIGH | 利用 Shopify 现有 `{% content_for 'blocks' %}` 机制 | 1(`<BlockSlot>` 替代 useBlockLoop) |
| **D 类 — i18n hook** | 🟢 HIGH | 字典查找,build 时生成 | 2 |

---

## 2. A 类 — 简单值 Hook(🟢 HIGH 可行性)

> 这些 hook 在 SSR 时返回 `{{ expr }}` 字符串并跟踪,在客户端从 context 读值。**与现有 `useLiquidValue` 行为一致,只需新增参数或命名。**
>
> ⚠️ **重要约束**:返回字符串的 hook 只能用于以下场景:
> - 作为元素 attribute 值(字符串本身)
> - 作为文本子节点,且文本本身就是 Liquid 表达式(SSR 后被 Liquid 替换)
> - **不**能用于产生 HTML 元素碎片的场景(那会破坏水合)

### 2.1 ~~`useImageTag`~~ → `<ImageTag>` 组件(A' 类,🟡 MEDIUM)

**v1 错误**:v1 把 `useImageTag` 设计为返回字符串(如 `{{ image | image_url ... | image_tag ... }}`)。问题是:
- React 树中:`<div>{useImageTag("section.settings.image")}</div>` 把这个字符串作为子节点
- SSR 渲染:`<div>{{ section.settings.image | image_url ... | image_tag ... }}</div>`(文本节点)
- Liquid 处理:`<div><img src="..." ...></div>`(变成了 `<img>` 元素)
- **DOM 树与 React 树结构不同** → hydration mismatch

**v2 修正**:改为 `<ImageTag>` 组件 + 标记替换模式。

**签名**:
```ts
interface ImageTagProps {
  image: string;             // Liquid 表达式,如 "section.settings.image"
  width?: number;            // image_url 宽度
  widths?: string;           // widths 列表(逗号分隔)
  sizes?: string;            // sizes 属性
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'auto' | 'high' | 'low';
  preload?: boolean;
  asPlaceholder?: string;    // 当 image 为空时,显示的 placeholder svg 名
}
function ImageTag(props: ImageTagProps): JSX.Element;
```

**SSR 行为**:
- 渲染为注释节点 `<!--IMG-N-->`(N 是自增 id)
- 渲染器维护 `[id] → props` 映射
- 后处理:扫描输出 HTML,找到 `<!--IMG-N-->` 替换为对应的 `{{ image | image_url: width: W | image_tag: ... }}` Liquid 表达式
- 跟踪 `image` 及附属表达式(`image.width` 等)

**CSR 行为**:
- 渲染为 `null`(真实 `<img>` 已被 SSR 注入到 DOM)
- React 水合时,`<ImageTag>` 节点不渲染,DOM 与 React 树结构对齐

**边缘情况**:
- `image` 为空(未设置或没上传):自动 fallback 到 `asPlaceholder` 指定的 svg
- `image` 引用的是 image_picker setting:返回完整的 `image_tag` 表达式,包含 width/height/srcset/fetchpriority 等
- 多张图同位置:用 N 区分

**实现路径**:
1. 定义虚拟组件 `ImageTag`:
   ```tsx
   function ImageTag({ image, width = 3840, ...rest, _id }: ImageTagProps & { _id: number }) {
     // SSR: 返回 <span data-img-id={_id} hidden />
     // CSR: 返回 null(在 hydration 阶段)
   }
   ```
2. 在渲染器中,识别 `ImageTag` 组件,替换为标记
3. 渲染后处理:用 props 生成 Liquid 表达式字符串,替换标记
4. 表达式跟踪:扫描表达式中的 `image` 引用

**风险**:
- 🟡 **MEDIUM**:多张图同位置时,id 管理需要唯一性
- 🟡 **MEDIUM**:Dawn 中 `image_tag` 的可选参数较多(width, height, sizes, widths, fetchpriority, loading, alt, class),组件 API 需完整覆盖

**可行性结论**:🟡 MEDIUM,实现可控,但需要细致测试水合一致性。

**与 Dawn 行为的兼容性**:
- Dawn 输出的 `<img>` 标签结构(包含 fetchpriority, sizes, widths)与本组件的 props 一一对应
- 占位符模式与现有 `useLiquidBlock` 思路一致,但作用位置是"替换为完整 HTML 片段"而非"插入在 wrapper 之前"

**类似组件(同样需要标记替换)**:
- `<Video>` 组件 — 输出 `{{ video | video_tag }}` 或 YouTube/Vimeo 嵌入
- `<Source>` 组件 — 输出 `image_url` 不带 `image_tag` 包装(用于 srcset)
- `<Icon>` 组件 — 输出 `{{ 'icon-X.svg' | inline_asset_content }}`

---

### 2.2 `useImageUrl(image, width)`

**签名**:
```ts
function useImageUrl(
  image: string | undefined,
  width: number
): string;
```

**SSR 行为**:
- 返回:`{{ image | image_url: width: W }}`
- 跟踪:`image`

**CSR 行为**:不使用(直接用 `<Image>` 组件)

**实现路径**:在 `useLiquidValue` 上层包装,自动加 `| image_url: width: W` 过滤器

**风险**:🟢 无

---

### 2.3 `useAsset(path, mode?)`

**签名**:
```ts
type AssetMode = 'url' | 'inline' | 'stylesheet';
function useAsset(path: string, mode?: AssetMode): string;
```

**SSR 行为**:
- `mode='url'` → `{{ 'foo.css' | asset_url }}`
- `mode='inline'` → `{{ 'foo.svg' | inline_asset_content }}`
- `mode='stylesheet'` → `{{ 'foo.css' | stylesheet_tag }}`
- 跟踪:`'foo.css'`(字符串字面量)

**CSR 行为**:不使用

**实现路径**:字符串模板 + 跟踪字面量表达式(非变量)

**风险**:🟢 无

---

### 2.4 `useFontFace(font)`

**签名**:
```ts
function useFontFace(font: string): string;
```

**SSR 行为**:
- 返回 `{{ font | font_face: font_display: 'swap' }}`
- 跟踪:`font`

**CSR 行为**:不使用

**实现路径**:字符串模板

**风险**:🟢 无

---

### 2.5 `usePlaceholderSvg(name)`

**签名**:
```ts
function usePlaceholderSvg(name: string): string;
```

**SSR 行为**:
- 返回 `{{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}`
- 跟踪字面量表达式

**CSR 行为**:不使用

**实现路径**:在 `DEFAULT_LIQUID_FILTERS` 中加 `'placeholder_svg_tag'` 映射

**风险**:🟢 无

---

### 2.6 `useThemeSettings(key)`

**签名**:
```ts
function useThemeSettings(key: string): string | undefined;
```

**SSR 行为**:
- 返回 `{{ settings.X }}`(注意:无 `section.settings.` 前缀)
- 跟踪:`settings.X`

**CSR 行为**:同 `useSectionSettings`

**实现路径**:`useLiquidRaw` 上层包装,接受不同的表达式前缀(无前缀 vs `section.settings.`)

**风险**:🟢 无

---

### 2.7 `useColorScheme(id)`

**签名**:
```ts
function useColorScheme(id: string | undefined): string;
```

**SSR 行为**:
- 返回字面量字符串:`color-${id} gradient`(纯 JS 拼接,无 Liquid)
- 不参与表达式跟踪

**CSR 行为**:完全相同的字符串拼接

**实现路径**:纯 JS utility hook,不依赖 SSG

**风险**:🟢 无

---

### 2.8 ~~`useShopifyAttributes`~~ — **移除**

**v1 错误**:v1 设计 `useShopifyAttributes()` 返回 `{{ block.shopify_attributes }}` 字符串,期望用户在 JSX 中用 `{...string}` 展开。
- **`{...string}` 在 JSX 中不是合法的 spread** —— JSX spread 只接受对象(POJO)
- 即使能用,string 会被当作对象属性展开,语义错误

**v2 结论**:
- **当前插件(`liquid-assembler.ts:236-237`)已自动在 block wrapper 上注入 `{{ block.shopify_attributes }}`**:
  ```html
  <{{tag}} id="{{ block.id }}" data-section-id="{{ section.id }}" 
        data-ssg-component="{{kebabName}}" {{ block.shopify_attributes }}>
    <!-- React SSR HTML -->
  </{{tag}}>
  ```
- 用户的 React block 组件**不需要关心** `shopify_attributes`,它已经被插件注入到 block 根元素上
- **Dawn 行为差异**:Dawn 把 `{{ block.shopify_attributes }}` 放在**内层元素**上(如 `<h2 {{ block.shopify_attributes }}>`),而当前插件放在**外层 wrapper** 上
- **对 Dawn 迁移的影响**:Dawn 的 rich-text 等 block 把 attrs 放在 heading 上,如果迁移到 React,heading 元素本身不会有 attrs(会被插件放到外层 wrapper),但**这不影响功能**(`shopify_attributes` 主要用于 theme editor 高亮整块,放在外层 wrapper 同样有效)

**实现路径**:**无需实现**。

**风险**:🟢 无

**设计更新**:
- §3.1 `useRawLiquid` 文档中,移除"配合 useShopifyAttributes"的相关引用
- §3.1 B 类示例代码中,移除 `<h2 {...attrs}>` 写法
- §3.2 `useForm` 文档中,移除相关引用
- §4 C 类(useBlockLoop)整体重构(见 §4),移除 BlockContext / useBlockRouter

---

### 2.9 `useBlockType(blocks, type)`

**签名**:
```ts
function useBlockType<T>(blocks: T[], type: string): T[];
```

**SSR/CSR 行为**:
- 纯 JS filter
- 不参与表达式跟踪

**实现路径**:纯 JS utility

**风险**:🟢 无

---

### 2.10 `useImageBehavior(behavior)`

**签名**:
```ts
interface ImageBehavior {
  widths: string;
  sizes: string;
  stackedSizes: string;
  halfWidth: string;
  fullWidth: string;
}
function useImageBehavior(behavior: string | undefined): ImageBehavior;
```

**SSR 行为**:
- 纯 JS 逻辑(Dawn 原始 `{%- liquid -%}` 块的 JS 版本)
- 不参与表达式跟踪

**CSR 行为**:同 SSR

**实现路径**:
```ts
function useImageBehavior(behavior) {
  return useMemo(() => {
    const fullWidth = '100vw';
    const widths = '375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840';
    if (behavior === 'ambient') {
      return { fullWidth: '120vw', halfWidth: '60vw',
               stackedSizes: '(min-width: 750px) 60vw, 120vw',
               widths: '450, 660, 900, 1320, 1800, 2136, 2400, 3600, 7680', sizes: stackedSizes };
    }
    if (behavior === 'fixed' || behavior === 'zoom-in') {
      return { fullWidth: '100vw', halfWidth: '100vw', stackedSizes: '100vw', widths, sizes: '100vw' };
    }
    return { fullWidth: '100vw', halfWidth: '50vw',
             stackedSizes: '(min-width: 750px) 50vw, 100vw', widths, sizes: fullWidth };
  }, [behavior]);
}
```

**风险**:🟢 无(纯 JS 逻辑)

---

### 2.11 `useSectionPadding(settingsKey?)`

**签名**:
```ts
function useSectionPadding(settingsKey?: string): string;
```

**SSR 行为**:
- 返回 `<style>` HTML 字符串,内含 `.section-{{id}}-padding` 媒体查询
- 跟踪:`section.id`,`section.settings.padding_top`,`section.settings.padding_bottom`

**CSR 行为**:不使用(SSG 已生成 `<style>`)

**实现路径**:字符串模板函数 + tracking

**风险**:🟢 无(但要确保 `<style>` 标签在 `<div data-ssg-hydrate>` 内部正确显示)

---

## 3. B 类 — 标记替换 Hook/组件(🟡 MEDIUM 可行性)

> 这些 hook 在 React 树中渲染一个占位符节点,SSR 阶段被替换为真实 Liquid 代码。客户端水合时占位符节点为空,与 DOM 结构对齐(无 mismatch)。
>
> **B 类总量从 v1 的 4 个减为 3 个**:`useShopifyAttributes` 移除(v1 错误设计)

### 3.1 `useRawLiquid(code)` ★ 关键

**签名**:
```ts
function useRawLiquid(code: string): string;
```

**SSR 行为**:
- React 组件 `<RawLiquid code="..." />` 渲染为注释节点 `<!--RAW-LIQUID-N-->`(N 是自增 id)
- 渲染器维护 `[id] → code` 映射,渲染结束后替换
- 跟踪 `code` 中的 `{{ ... }}` 表达式,加入 JSON bridge

**CSR 行为**:
- `<RawLiquid code="..." />` 渲染为 `<span hidden data-raw-liquid-id="N"></span>`
- 客户端拿到 SSR HTML 后,占位符已被替换为真实 Liquid
- 水合时 `<span hidden>` 是空元素,与 DOM 匹配

**边缘情况**:
- 多个连续 `useRawLiquid`:用不同 id 区分
- 嵌套 `{% form %}` / `{% endform %}` 配对:需要顺序配对
- 多行代码:支持任意多行 Liquid

**实现路径**:
1. 定义虚拟组件 `RawLiquid`:
   ```ts
   function RawLiquid({ code, _id }: { code: string; _id: number }) {
     // SSR: 返回 <!--RAW-LIQUID-{_id}-->
     // CSR: 返回 <span hidden data-raw-liquid-id={_id} />
   }
   ```
2. 在 `useRawLiquid` hook 中:
   - SSR:维护全局自增 id,调用 `createElement(RawLiquid, { code, _id })`
   - 渲染器收集 `(id, code)` 对
3. 渲染器后处理:扫描输出 HTML,找到 `<!--RAW-LIQUID-N-->` 替换为对应 `code`
4. 表达式跟踪:用正则扫描 `code` 提取 `{{ ... }}` 表达式

**风险**:
- 🟡 **客户端水合 React 树与 DOM 不完全匹配**:如果某次 SSR 输出 `<form {% form %}>` 之后又输出 `<div>`,客户端 React 树是 `[<span>, <div>]`。DOM 是 `[<form>, <div>]`。**结构不同**。
  - **解决**:用 `<template>` 元素包裹占位符,客户端不渲染 `<template>` 内容,DOM 结构完全一致
  - **更稳妥**:用 `<></>` Fragment 包裹,React Fragment 在 SSR 会被消除。需要重新设计占位符策略

**重新设计 — Fragment 包裹**:
```jsx
<>
  <RawLiquid code="{% form 'customer' %}" />
  <input name="email" />
  <RawLiquid code="{% endform %}" />
</>
```

SSR 输出:
```html
<!--RAW-LIQUID-0--><input name="email"><!--RAW-LIQUID-1-->
```

替换后:
```html
{% form 'customer' %}<input name="email">{% endform %}
```

客户端 React 树(无 RawLiquid 节点,直接 Fragment):
- `<>` 内 `[<input />]`
- DOM: `[<input />]`
- ✓ 匹配

**修正实现**:
- `<RawLiquid>` 在 SSR 渲染为 `<!--RAW-LIQUID-N-->`
- 客户端:`<RawLiquid>` 渲染为 `null`(直接返回 null)
- React Fragment 把 `null` 视为"无节点",结构对齐

**最终风险**:🟢 LOW(实现可控,关键是要在测试中验证水合)

---

### 3.2 `useForm(formType, options?)` ★ 关键

**签名**:
```ts
interface FormOptions {
  id?: string;
  className?: string;
  persist?: boolean;  // 持久化 form 状态到 sessionStorage
}
function useForm(
  formType: 'customer' | 'create_customer' | 'new_comment' | 'contact' | 'product' | 'cart' | 'storefront_password' | 'activate_account' | 'recover_customer_password' | 'reset_password',
  options?: FormOptions
): {
  FormOpen: React.FC<{ children: ReactNode }>;
  FormClose: React.FC;
  formState: { posted: boolean; errors: Record<string, string[]>; email: string };
  submit: (data: FormData) => Promise<void>;
};
```

**SSR 行为**:
- `<FormOpen>` 渲染 `<!--RAW-LIQUID-0-->`(实际是 `{% form 'customer', id: '...', class: '...' %}`)
- `<FormClose>` 渲染 `<!--RAW-LIQUID-1-->`(实际是 `{% endform %}`)
- 内部 children 按 React 树正常渲染
- 表达式跟踪:提取 form options 中的 settings 引用

**CSR 行为**:
- `<FormOpen>` / `<FormClose>` 渲染为 `null`
- `formState` 维护 form 提交状态
- `submit` 函数 fetch POST 到 Shopify form action URL

**边缘情况**:
- form action URL:`{% form %}` 生成的 `<form>` 默认 action 是当前页(POST 自提交)
- form 提交后页面刷新,React 状态丢失 → `persist: true` 用 sessionStorage 恢复
- form 错误返回:`form.errors.translated_fields.email`,`form.errors.messages.email`
- 重定向:`{% form 'customer' %}` 登录成功跳转到 `/account`,React 端要 trigger 跳转

**实现路径**:
- 标记替换方式同 `useRawLiquid`
- 客户端 form state 自行管理,需实现:
  - Fetch POST 处理
  - 错误捕获与展示
  - 重定向逻辑(根据 form type 不同,目标 URL 不同)

**风险**:
- 🟠 **MEDIUM**:`{% form %}` 标签的细节(autocomplete、novalidate、accept-charset)在不同 form type 间有差异,React 端需要逐一处理
- 🟠 **MEDIUM**:Shopify form action URL 在 SSR 时是 placeholder,客户端 fetch 需要知道这个 URL — 可能需要从 Liquid 注入一个全局配置
- 🟡 **MEDIUM**:与 Shopify 主题 JS(predictive-search.js 等)的交互

**Workaround(降级方案)**:如果 `useForm` 太复杂,可以**仅用 `<FormOpen>/<FormClose>` 处理 Liquid 部分**,客户端 form 提交不重写,保留 Dawn 原生 form 行为(提交后整页刷新)。这能覆盖 80% 用例。

**可行性结论**:🟡 MEDIUM,需要分两阶段:
- **B.1(简单)**:只做 `<FormOpen>/<FormClose>` 标记替换,客户端不接管提交
- **B.2(完整)**:增加 form state、错误捕获、重定向

建议先做 B.1 验证水合,再做 B.2。

---

### 3.3 `usePaginate(items, perPage, param?)` ★ 关键

**签名**:
```ts
function usePaginate<T>(
  items: T[],             // collection.products / search.results 等
  perPage: number,
  param?: string          // URL 参数名,默认 'page'
): {
  currentItems: T[];
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  PaginationEl: React.FC;  // 渲染分页导航
  PaginateOpen: React.FC<{ children: ReactNode }>;
  PaginateClose: React.FC;
};
```

**SSR 行为**:
- `<PaginateOpen>` 渲染 `{% paginate items by perPage %}` 标记
- `<PaginateClose>` 渲染 `{% endpaginate %}` 标记
- 初始 page 从 URL `?page=N` 读取
- 跟踪 `items` 表达式

**CSR 行为**:
- `currentItems` 按 page 切片
- 点击页码时 pushState 更新 URL,不重新请求数据
- `<PaginationEl>` 渲染分页 UI

**边缘情况**:
- `paginate` 块内可以用 `current_page`, `total_pages`, `paginate.next.url` 等
- 排序/筛选改变时重置到第 1 页
- SEO:`<link rel="prev/next">` 应在 `<head>` 中

**实现路径**:
- 标记替换:同 useRawLiquid
- 客户端分页 state:用 `useState` + `useEffect` 监听 URL
- URL 更新:history.pushState

**风险**:
- 🟠 **MEDIUM**:`paginate` 块的 items 必须是 Liquid 可迭代对象,React 拿到的是 `items` 数组的引用,但 SSR 时实际是 `{{ collection.products }}` 字符串
- 🟡 **MEDIUM**:SEO 的 `link rel="prev/next"` 在 React 端需要另外处理(head 部分由 theme.liquid 控制)

**降级方案**:`<PaginateOpen>/<PaginateClose>` 只做标记替换,分页 state 由 Liquid 维护,客户端仅 UI 增强(点击不刷新的链接)。

**可行性结论**:🟡 MEDIUM

---

### 3.4 `useStaticBlock(spec)`

**签名**:
```ts
interface StaticBlockSpec {
  type: string;       // block 文件名,如 "slide"
  id: string;         // block 唯一 ID(在 presets 中声明)
  data?: Record<string, string | number>;  // 传给子 block 的数据
}
function useStaticBlock(spec: StaticBlockSpec): React.FC;
```

**SSR 行为**:
- 渲染 `{% content_for "block", type: spec.type, id: spec.id, data_key: data.value %}`
- 注意:static block 的 `data` 参数需要转 Liquid 表达式

**CSR 行为**:渲染为 null(实际渲染由 Shopify 在 `content_for` 解析时完成)

**边缘情况**:
- `data` 中的 value 是字面量时:`{% content_for "block", type: "slide", id: "s1", accent: "#fff" %}`
- `data` 中的 value 是变量时:`{% content_for "block", type: "slide", id: "s1", accent: settings.X %}`
- 子 block 中通过 `{{ accent | default: '#000' }}` 接收

**实现路径**:
- 字符串模板生成 `{% content_for "block", ... %}` 表达式
- 跟踪 data 引用到的所有表达式

**风险**:
- 🟢 LOW(static block 语义明确,语法简单)
- 🟡 **MEDIUM**:static block 的 data 传递需要类型检查(避免传 React 引用)

**可行性结论**:🟢 LOW 风险,🟡 MEDIUM 工作量

---

## 4. C 类 — 上下文驱动 Hook(🟠 MEDIUM-HIGH 可行性)

> 这些 hook 引入 React Context,让 block 子组件能访问当前 block 的 settings。**核心挑战:每个 block 需要独立的 JSON bridge。**

## 4. ~~C 类 — 上下文驱动 Hook~~ → C' 类 — 组件化 Slot(🟢 HIGH)

> v1 设计的 `useBlockLoop` 系列 hook 不可行,已替换为 `<BlockSlot>` 组件 + 每个 Theme Block 独立 entry 的方案。

### 4.0 v1 不可行的原因

**v1 设计问题**:

1. **SSR 时 blocks 数据不可知**
   - `useBlockLoop(blocks, render)` 需要在 React 组件中传入 `blocks` 数组
   - 但 React 组件不知道当前 section 有哪些 block(block 是 Shopify 后台数据)
   - 即使用某种"全局上下文"传递,SSR 阶段 React 树还是只看到"渲染 slot",无法预知 block 数量和顺序

2. **与 `{% content_for 'blocks' %}` 机制冲突**
   - 当前插件已通过 `{% content_for 'blocks' %}` 让 Shopify 渲染 block
   - `useBlockLoop` 想用 React 自己迭代,会绕过 Shopify 的 block 机制
   - 块顺序、限制(`limit`)、嵌套等 Shopify 处理逻辑被绕过

3. **block 独立 React entry 是更优解**
   - 当前的 `useBlockSettings("X")` 已经是基于"当前 block 上下文"工作
   - 每个 block 单独 hydrate,JSON bridge 简单清晰
   - 不需要新加任何 hook,只需要让 React 知道"block 由 Shopify 渲染,React 负责水合"

### 4.1 `<BlockSlot>` 组件(替代 useBlockLoop)★ 关键

**签名**:
```ts
interface BlockSlotProps {
  /** 可选:渲染前的占位文本,在管理后台显示 */
  fallback?: ReactNode;
}
function BlockSlot(props?: BlockSlotProps): JSX.Element;
```

**SSR 行为**:
- 渲染为 `{% content_for 'blocks' %}`(已有机制)
- Shopify 在 SSR 阶段渲染该 section 的所有 block(根据 `shopifyMeta.blocks` 决定可接受的类型)
- 每个 block 对应一个独立的 React entry,有自己的 JSON bridge

**CSR 行为**:
- 渲染为 `null`(实际 block 由 SSR 注入 DOM)
- 水合时:已 hydrate 的 block 节点会被识别,新插入的 block 通过 Shopify 的 `shopify:section:load` / `shopify:section:unload` 事件重新触发 hydrate

**边缘情况**:
- **嵌套 block**:父 block 也用 `<BlockSlot />` 即可(Shopify 递归处理)
- **静态 block**:见 §4.2 `<StaticBlock>` 组件
- **block 顺序变化**:Shopify 自动处理,React 用 `block.id` 作为 key
- **`limit` 约束**:由 schema 保证,超出时报错

**实现路径**:
1. 虚拟组件 `BlockSlot`:
   ```tsx
   function BlockSlot() {
     // SSR: 返回 <!--BLOCK-SLOT--> 占位符
     // CSR: 返回 null
   }
   ```
2. 渲染器在 post-process 阶段把 `<!--BLOCK-SLOT-->` 替换为 `{% content_for 'blocks' %}`
3. **无需新加表达式跟踪机制** — block 的设置由各自 entry 的 `useBlockSettings` 处理(已有)

**对比 v1 设计**:

| 维度 | v1 (useBlockLoop) | v2 (`<BlockSlot>`) |
|---|---|---|
| 数据流 | React 显式迭代 blocks(数据不可知) | Shopify 自动迭代,React 不知情 |
| JSON bridge | 每 block 独立(需新机制) | 复用现有机制(block 自带 bridge) |
| 嵌套支持 | 需递归处理 | Shopify 天然支持 |
| `limit` 校验 | React 不感知 | schema 保证 |
| 复杂度 | 高(需新跟踪机制) | 低(替换占位符) |

**示例代码**:
```tsx
// 主报告 §6.2 中的 image-banner.tsx 改用 <BlockSlot />
export default function ImageBanner() {
  return (
    <div className="banner">
      <div className="banner__media">
        <ImageTag image="section.settings.image" width={3840} />
      </div>
      <div className="banner__content">
        <BlockSlot />  {/* ← 由 Shopify 渲染所有 block */}
      </div>
    </div>
  );
}

// heading block (frontend/blocks/Heading.tsx)
export const blockMeta = {
  name: "Heading",
  settings: [
    { type: "inline_richtext", id: "heading", label: "Heading" },
    { type: "select", id: "heading_size", label: "Size", options: [...] },
  ],
} satisfies BlockMeta;

export default function Heading() {
  const heading = useBlockSettings("heading");  // {{ block.settings.heading }}
  const size = useBlockSettings("heading_size");
  return <h2 className={clsx("banner__heading", "inline-richtext", `banner__heading--${size}`)}>{heading}</h2>;
}
```

**风险**:🟢 LOW(沿用现有机制,改动小)

**可行性结论**:🟢 **HIGH**,推荐方案。

---

### 4.2 `<StaticBlock>` 组件(替代 useStaticBlock)

**签名**:
```ts
interface StaticBlockProps {
  type: string;       // block 文件名,如 "slide"
  id: string;         // 块唯一 ID(在 presets 中声明)
  data?: Record<string, string | number>;  // 传给子 block 的数据
}
function StaticBlock(props: StaticBlockProps): JSX.Element;
```

**SSR 行为**:
- 渲染为 `{% content_for "block", type: spec.type, id: spec.id, data_key: data.value %}`
- 注意:`data` 参数中的 value 若是 Liquid 表达式,需要跟踪
- 若是字面量,直接拼接到表达式

**CSR 行为**:渲染为 null

**边缘情况**:
- `data` 中的 value 是字面量 vs 变量:`{% content_for "block", ..., accent: "#fff" %}` vs `accent: settings.X`
- 子 block 接收:`{{ accent | default: '#000' }}`

**实现路径**:
- 字符串模板生成 `{% content_for "block", ... %}` 表达式
- 跟踪 data 引用到的所有表达式

**风险**:
- 🟢 LOW
- 🟡 **MEDIUM**:data 传值需要类型检查,避免传 React 引用

**可行性结论**:🟢 **HIGH**

---

### 4.2 ~~`useBlockContext`~~ / ~~`useBlockRouter`~~ — **移除**

**v1 设计的问题**:
- `useBlockContext` 用于从 React context 读 block 数据 — **新设计不需要 block context**,因为 block 是独立 React entry,直接在 entry 内 `useBlockSettings` 即可
- `useBlockRouter` 用于根据 block.type 查表 — **新设计不需要**,因为每个 block 是独立 .tsx 文件,Shopify 的 `content_for 'blocks'` 直接渲染对应 block 文件

**实现路径**:**无需实现**。

**风险**:🟢 无

**§6.2 image-banner 范例更新**:
- 删除 `BlockRouter.tsx` 组件
- `ImageBanner.tsx` 用 `<BlockSlot />` 代替循环
- 每个 block 独立 entry,`frontend/blocks/Heading.tsx` 等直接是 React 组件

**§5.3 Block 决策更新**:
- 块升级为 Theme Block 的策略**不变**(仍是 30+ 个 Theme Block)
- 但实现方式:每个 block 是独立 React entry + 独立 .liquid 文件
- 不再需要在 section 端做 block 分发

---

## 5. D 类 — i18n Hook(🟢 HIGH 可行性)

> 字典查找,build 时从 `locales/*.json` 生成,运行时 React context 提供当前 locale + dict。

### 5.1 `useT()` / `useLocale()` ★ 关键

**签名**:
```ts
interface I18nContextValue {
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: string) => Promise<void>;
  availableLocales: string[];
}

function useT(): I18nContextValue['t'];
function useLocale(): I18nContextValue;
```

**SSR 行为**:
- 初始 locale 从 `window.__SHOPIFY_I18N__.locale` 读取(theme.liquid 注入)
- 初始 locale 字典**内联到 vendor chunk**(避免延迟)
- `t('sections.image-banner.name')` 简单字典查找

**CSR 行为**:
- `LocaleProvider` 包裹整个 App
- 切换 locale 时动态 `import()` 目标 locale chunk
- 所有 `useT` 调用重新计算

**构建时(插件任务)**:
1. 读 `locales/*.json`(用户配置 `i18n.locales: ['en', 'zh-CN', ...]`)
2. 转 TypeScript:
   ```ts
   // frontend/i18n/locales/en.ts
   export const messages = {
     "sections.image-banner.name": "Image banner",
     "sections.image-banner.settings.image.label": "Image",
     // ... 全部键
   } as const;
   ```
3. 初始 locale 内联进 vendor,其他 locale 用 `import()` 异步加载
4. 校验:每个 locale 必须覆盖 en.default.json 的所有键(缺失 build error)

**实现路径**:
- 插件新增 `generateI18nLocales(options)` 函数
- 在 `compileAllEntries` 之前调用一次,生成 `frontend/i18n/locales/*.ts`
- 运行时:`frontend/i18n/LocaleProvider.tsx` 包裹 React 树

**风险**:
- 🟢 LOW:字典查找 + 异步加载是标准模式
- 🟡 **MEDIUM**:Shopify locale 文件格式(JSON,可能嵌套)需要 flatten 成 dot-separated key
- 🟡 **MEDIUM**:Pluralization (Dawn 的 `t: count: N` 形式)需要支持

**Pluralization 处理**:
```ts
t('cart.items_added.other', { count: 3 })  // → "3 items added"
t('cart.items_added.one', { count: 1 })   // → "1 item added"
```
需要在字典查找时根据 `count` 选择键后缀。

**可行性结论**:🟢 HIGH

---

## 6. SSG / Vite 插件改造

### 6.1 标记替换机制(支撑 B 类 hook)

**改动位置**:
- `packages/vite-plugin-react-shopify/src/ssg/renderer.ts`
- `packages/vite-plugin-react-shopify/src/ssg/post-process.ts`

**新增**:
- `RawLiquid` 虚拟组件(已在 §3.1 设计)
- 全局占位符池:渲染前 `Map<id, code>` 清空,渲染时分配 id
- 后处理:扫描输出 HTML,正则替换 `<!--RAW-LIQUID-(\d+)-->`

**风险**:🟢 LOW

---

### 6.2 CSS Modules 支持

**改动位置**:
- `packages/vite-plugin-react-shopify/src/ssg/bundler.ts`(当前 strip CSS)
- `packages/vite-plugin-react-shopify/src/ssg/css-manager.ts`

**现状**:
- `bundler.ts` 中 `ssg-strip-css` 插件强制把 `.css` 文件转为 `""`
- CSS Modules(`.module.css`)被转为 Proxy 对象

**改动**:
- 保留 CSS Modules 解析(让 Vite/esbuild 处理),但 SSR bundle 仍需 strip 实际 CSS 内容
- 客户端 bundle 正常处理(交给 Vite)
- SSR 时,class 名映射通过 Vite manifest 解析

**难点**:
- Vite manifest 已经是产物后的引用,但 SSR 渲染发生在 Vite build 之前
- 解决方案:**CSS Modules 的类名需要在源码中作为变量引用**,React 组件中 `className={styles.banner}` 是合法 JS
- SSR 渲染时,`styles.banner` 是个变量引用,React 输出 `class="banner_xyz123"`(由 Vite 编译时静态替换)
- 关键:**SSR 渲染时不能 strip CSS Modules 的 JS 部分**(只 strip CSS 内容)

**实现**:
```ts
// bundler.ts 改造:对 .module.css 仍 strip CSS,但保留 JS Proxy
{
  name: "ssg-strip-css",
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => ({ namespace: "ssg-css", path: args.path }));
    build.onLoad({ filter: /.*/, namespace: "ssg-css" }, (args) => {
      // CSS Modules: 返回 Proxy 模拟 export
      // 普通 CSS: 返回空
      if (args.path.endsWith(".module.css")) {
        return { contents: "module.exports = new Proxy({}, { get: (_, k) => String(k) });", loader: "js" };
      }
      return { contents: "", loader: "js" };
    });
  }
}
```

**风险**:
- 🟡 **MEDIUM**:CSS Modules 的真实类名(`banner_xyz123`)是 Vite 编译期生成的,SSR 时只能拿到占位符名(如 `banner`),导致 SSR HTML 类名与客户端不一致
- **解决**:CSS Modules 类名必须在 SSR 时用真实名。Vite 提供 `?modules` 查询或 `cssModules` 配置,生成静态类名
- 或者:**避免在 React 组件中用 CSS Modules**,改用普通 CSS + BEM 命名约定

**降级方案**:在 Dawn 迁移期间,**禁止使用 `.module.css`**,全部用普通 CSS,类名遵循 Dawn 命名规范(`.banner__content` 等)。阶段 6 再决定是否启用 CSS Modules。

**可行性结论**:🟡 MEDIUM(需要谨慎处理类名同步)

---

### 6.3 Filter 跟踪扩展

**改动位置**:`packages/vite-plugin-react-shopify/src/ssg/renderer.ts` 中 `DEFAULT_LIQUID_FILTERS`

**新增**:
```ts
const DEFAULT_LIQUID_FILTERS: Record<string, string> = {
  textarea: " | newline_to_br",
  image_picker: " | img_url: 'master'",
  // 新增:
  asset_url: "",         // useAsset 的 url 模式
  inline_asset_content: "", // useAsset 的 inline 模式
  placeholder_svg_tag: " | placeholder_svg_tag: 'placeholder-svg'",
};
```

**实现**:在 useLiquidValue 输出表达式时,根据 expression 类型自动附加 filter。

**风险**:🟢 LOW

---

### 6.4 i18n locale 文件生成

**改动位置**:新建 `packages/vite-plugin-react-shopify/src/i18n/generator.ts`

**实现**:
```ts
async function generateI18nLocales(options) {
  const { localesDir, outputDir, locales, defaultLocale } = options;
  for (const locale of locales) {
    const file = path.join(localesDir, `${locale}.json`);
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const flat = flattenKeys(data);
    const tsContent = `export const messages = ${JSON.stringify(flat, null, 2)} as const;\n`;
    fs.writeFileSync(path.join(outputDir, `${locale}.ts`), tsContent);
  }
}
```

**风险**:🟢 LOW

---

### 6.5 App Block 支持

**改动位置**:
- `packages/vite-plugin-react-shopify/src/ssg/liquid-assembler.ts` 中 `buildBlock`(已支持 `{%- doc -%}` 包装)
- `packages/vite-plugin-react-shopify/src/types/shopify.ts` 中 `BlockDefinition`(已支持 `type: "@app"`)

**实现**:渲染 `@app` 块时输出 `{% content_for "block", type: "@app" %}`,允许商家插入 app block

**风险**:🟢 LOW(Shopify 端处理)

---

### 6.6 Vite 配置

**新增选项**:
```ts
interface Options {
  // ... existing
  i18n?: {
    locales: string[];         // 支持的语言
    defaultLocale: string;     // 默认语言
    sourceDir?: string;        // locales 目录,默认 'locales'
  };
  blocksPrefix?: string;       // block 文件名前缀,默认 'react-'
}
```

**风险**:🟢 LOW

---

## 7. 风险汇总(v2 修订)

| 风险 | 等级 | 影响 hook/组件 | 缓解 |
|---|---|---|---|
| 水合时 DOM 与 React 树结构不匹配 | 🟠 MED-HIGH | useRawLiquid, useForm, usePaginate, useStaticBlock, **`<ImageTag>`** | 用 Fragment 包裹占位符;SSR 渲染为注释节点,客户端渲染为 null;严格测试 |
| ~~Block JSON bridge 嵌套与命名冲突~~ | ~~🟠 MED-HIGH~~ | ~~useBlockLoop~~ | **已解决**:v2 改用 `<BlockSlot>`,block 独立 entry,沿用现有 JSON bridge 机制 |
| CSS Modules 类名 SSR/CSR 不同步 | 🟡 MED | (任何用 .module.css 的组件) | 阶段 1 禁止 CSS Modules;阶段 6 再评估 |
| `{% form %}` 提交行为与 Shopify 原生差异 | 🟠 MED | useForm | 分两阶段:B.1 只做标记替换,B.2 完整接管 |
| `{% paginate %}` URL 同步与 SEO link | 🟡 MED | usePaginate | B 类降级方案:只做标记替换,客户端不接管 |
| Pluralization 翻译 | 🟡 MED | useT (i18n) | 字典查找时支持 `key.other` / `key.one` 后缀 |
| i18n 文件体积 | 🟢 LOW | useT | 初始 locale 内联,其他按需加载 |
| ~~`useShopifyAttributes` spread~~ | ~~🟠 MED~~ | ~~useBlockLoop~~ | **已解决**:v1 错误设计,整个 hook 移除;插件已自动注入 `shopify_attributes` 到 block wrapper |
| `<ImageTag>` 替换为 HTML 片段时 DOM 元素插入位置 | 🟡 MED | `<ImageTag>` | 标记替换模式;SSR 注释节点 + CSR null;在测试中验证水合 |
| `<BlockSlot>` 与现有 `content_for 'blocks'` 机制的语义对齐 | 🟢 LOW | `<BlockSlot>` | 直接替换,无新机制 |

---

## 8. 实施优先级建议(v2 修订)

| 阶段 | Hook/组件 | 工作量 | 阻塞的下游 |
|---|---|---|---|
| **1.1** | useImageUrl, useAsset, useFontFace, usePlaceholderSvg | 1 天 | 全部图片密集 section |
| **1.2** | useThemeSettings, useColorScheme, useBlockType | 0.5 天 | 全部 section |
| **1.3** | useSectionPadding, useImageBehavior, useSectionAspect, useIconUrl | 1 天 | image-banner 类 |
| **1.4** | useRawLiquid + 标记替换机制 | 2-3 天 | main-product, slideshow, 所有 block-iterating |
| **1.5** | `<ImageTag>` 组件 + 标记替换 | 1-2 天 | 全部图片密集 section |
| **1.6** | `<BlockSlot>` 组件 + 标记替换 | 0.5-1 天 | 几乎所有 section(用 block) |
| **1.7** | `<StaticBlock>` 组件 | 0.5 天 | slideshow controls |
| **1.8** | useForm (B.1 标记替换) | 1 天 | newsletter, contact, login |
| **1.9** | useForm (B.2 完整接管) | 3-4 天 | (可选,先 B.1 跑通) |
| **1.10** | usePaginate (B 类降级方案) | 1-2 天 | collection grid, search |
| **1.11** | i18n locale 生成 + useT / useLocale | 2-3 天 | 全部 section |
| **1.12** | CSS Modules 支持 | 2-3 天 | (可选,先禁用) |
| **1.13** | App Block | 0.5 天 | (utility) |
| **移除** | ~~useShopifyAttributes, useBlockLoop, useBlockContext, useBlockRouter~~ | — | v1 错误设计,无需实现 |

**总工作量估算**:阶段 1 全部完成需 **~22-28 工作日**(v2 减少了 4 个 hook 的实现工作量)。

---

## 9. 评审检查清单(v2 修订)

评审每个 hook/组件时,关注以下问题:

- [ ] **签名是否合理**?参数命名、类型、可选性
- [ ] **SSR 行为是否清晰**?输出什么、跟踪什么、加入哪个 bridge
- [ ] **CSR 行为是否清晰**?客户端拿到字符串后怎么处理
- [ ] **水合是否安全**?DOM 与 React 树是否结构对齐(**v1 错误主要在此**)
- [ ] **是否产生 HTML 元素碎片**?如果有,**必须**用组件+标记替换,不能返回字符串
- [ ] **是否依赖 React 树中数据不可知的内容**(如 blocks 数组)?如果有,**必须**用 Shopify 机制(内容提供)而非 React 迭代
- [ ] **边缘情况是否覆盖**?空值、嵌套、配对、不存在 block
- [ ] **实现路径是否可行**?代码改动量、风险点
- [ ] **是否阻塞下游**?不实现的话,哪些 section/snippet 没法做
- [ ] **降级方案是否合理**?如果做不了,有什么 workaround

**v1 → v2 三个错误的核心教训**:
1. **不要用字符串 hook 输出 HTML 元素** — 改用组件 + 标记替换
2. **不要造 hook 实现现有功能** — 插件已经处理 `shopify_attributes`,不需新 hook
3. **不要用 React 迭代 Shopify 数据** — 改用 Shopify 机制(`content_for 'blocks'`)

---

## 10. 等待评审(v2 修订)

按以下顺序逐个评审(或批量评审同类):

1. **A 类(10 个,v1:11)** — 可批量评审,改动小
   - ~~useImageTag~~ → 已改造为 `<ImageTag>` 组件,见 A' 类
2. **A' 类 `<ImageTag>` 组件** — 重要评审项
3. **B 类 3.1 useRawLiquid** — 关键基础设施
4. **B 类 3.2 useForm** — 决定 newsletter/contact 迁移路径
5. **B 类 3.3 usePaginate** — 决定 collection grid 迁移路径
6. **C' 类 `<BlockSlot>` 组件** — 替代 v1 的 useBlockLoop,核心架构变更
7. **C' 类 `<StaticBlock>` 组件** — 简单
8. **D 类 5.1 useT** — i18n 关键
9. **SSG 6.1-6.6** — 与 hook 评审并行

**评审方式**:对每个 hook/组件,回答"通过 / 打回需返工 / 需要更多信息"。我会根据评审结果调整实现方案。
