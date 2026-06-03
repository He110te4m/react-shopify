# Plugin API Design — Dawn Migration Hooks

> 独立 API 评审文档 · 2026-06-03
> 用途:把主报告(v3)中所有 hook 需求从 §8 抽出,提供**完整 API 签名、SSR/CSR 双端行为、边缘情况、实现路径、可行性评级**。
> 主报告 v3 假设这些 hook 都可实现。本文档**诚实地标出每一个 hook 的真实可行性**,如有问题可提前调整主报告的迁移策略。
>
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
| **A 类 — 简单值 hook** | 🟢 HIGH | 行为类似现有 `useLiquidValue`,只是参数不同 | 11 |
| **B 类 — 标记替换 hook** | 🟡 MEDIUM | 需要在 React 树中插入占位符,SSR 后字符串替换 | 4 |
| **C 类 — 上下文驱动 hook** | 🟠 MEDIUM-HIGH | 引入 React context,每个 block 独立 JSON bridge | 3 |
| **D 类 — i18n hook** | 🟢 HIGH | 字典查找,build 时生成 | 2 |

---

## 2. A 类 — 简单值 Hook(🟢 HIGH 可行性)

> 这些 hook 在 SSR 时返回 `{{ expr }}` 字符串并跟踪,在客户端从 context 读值。**与现有 `useLiquidValue` 行为一致,只需新增参数或命名。**

### 2.1 `useImageTag(image, opts?)`

**签名**:
```ts
interface ImageTagOptions {
  width?: number;            // image_url 宽度
  sizes?: string;            // sizes 属性
  widths?: string;           // widths 列表(逗号分隔)
  alt?: string;
  class?: string;
  loading?: 'lazy' | 'eager';
  fetchpriority?: 'auto' | 'high' | 'low';
  preload?: boolean;
}
function useImageTag(
  image: string | undefined,  // Liquid: section.settings.image 等
  opts?: ImageTagOptions
): string;
```

**SSR 行为**:
- 返回:`{{ image | image_url: width: 3840 | image_tag: width: image.width, ... }}`
- 跟踪表达式:`image`(外加 `image.width` 等)
- 加入 section 级 JSON bridge

**CSR 行为**:
- 直接调用 React `<Image>` 组件,不再用 hook 字符串
- **实际:这个 hook 主要在 SSR 阶段使用,客户端不消费字符串**

**边缘情况**:
- `image` 为空时返回 `{{ 'placeholder' | placeholder_svg_tag: 'class' }}`(自动 fallback)
- `image` 是 object 形式(Liquid 解析后)时,需要确保 settings 通过 hook 读取而不是直接拿 string

**实现路径**:
- 在 `useLiquidRaw` 基础上,自动附加 `| image_url: width: W | image_tag: ...` 过滤器
- 跟踪的图片辅助表达式(`image.width`, `image.height`, `image.aspect_ratio`)加到默认跟踪列表

**风险**:🟢 无(纯字符串模板)

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

### 2.8 `useShopifyAttributes()`

**签名**:
```ts
function useShopifyAttributes(): string;
```

**SSR 行为**:
- 返回字面量字符串 `{{ block.shopify_attributes }}`
- 跟踪:`block.shopify_attributes`

**CSR 行为**:返回空字符串(属性由 SSG 已经注入到 DOM)

**实现路径**:在 `useLiquidRaw` 上层,硬编码表达式

**风险**:🟢 无(但要确保 SSR 阶段与 React 树中 `{...attrs}` 正确对接)

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

## 3. B 类 — 标记替换 Hook(🟡 MEDIUM 可行性)

> 这些 hook 在 React 树中渲染一个占位符节点,SSR 阶段被替换为真实 Liquid 代码。客户端水合时占位符节点为空,与 DOM 结构对齐(无 mismatch)。

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

### 4.1 `useBlockLoop(blocks, render)` ★ 关键

**签名**:
```ts
function useBlockLoop<TBlock>(
  blocks: TBlock[],
  render: (block: TBlock) => ReactNode
): ReactNode[];
```

**实现路径**:

```tsx
// 内部
function useBlockLoop(blocks, render) {
  return blocks.map((block) => (
    <BlockWrapper key={block.id} block={block}>
      {render(block)}
    </BlockWrapper>
  ));
}

// BlockWrapper
function BlockWrapper({ block, children }) {
  // SSR: 输出 <div data-ssg-block-id={block.id} data-ssg-hydrate>
  //   包含:
  //     - 该 block 的 JSON bridge
  //     - 子 React 树(其中 useBlockSettings 输出 {{ block.settings.X }})
  // CSR: 输出同样结构,JSON bridge 由 SSR 注入
  return (
    <BlockContext.Provider value={block}>
      <div data-ssg-block-id={block.id} data-ssg-hydrate>
        {/* JSON bridge for THIS block */}
        <script type="application/json" data-ssg-block-liquid>
          {JSON.stringify(blockSettingsToBridge(block))}
        </script>
        {children}
      </div>
    </BlockContext.Provider>
  );
}
```

**SSR 关键改动**:
- 渲染器需要在渲染每个 block 前**重置表达式跟踪器**(`__shopify_ssg_liquid_track`)
- 每个 block 的表达式独立收集,生成独立的 JSON bridge
- `block.id` 通过 `data-ssg-block-id` 属性暴露(客户端可识别)

**CSR 行为**:
- 客户端拿到 SSR HTML 后,每个 block 节点都有独立 JSON bridge
- `useBlockSettings("X")` 从当前 block context 读值
- 水合时,每个 block 节点独立 hydrate

**边缘情况**:
- **嵌套 block**:`Row` block 内部又有 `blocks: [{ type: "heading" }]`,需要嵌套 `<BlockWrapper>`,每层独立 bridge
- **块内 `{% form %}`**:`EmailForm` block 内部使用 `{% form 'customer' %}`,form 标记必须正确放置
- **块内 `useLiquidBlock`**:Dawn 的 slideshow 旧实现中,`{%- for block in section.blocks -%}` 的 for-loop 本身是 `useLiquidBlock` 注入的;新设计中,`useBlockLoop` 是 React 主导,这种情况不再需要 `useLiquidBlock`
- **顺序稳定性**:React key 用 `block.id`,确保 block 顺序变化时 hydration 不会错乱

**实现路径(详细)**:
1. 引入 `BlockContext` (`React.createContext<BlockData | null>(null)`)
2. `BlockWrapper` 组件:
   - SSR:渲染 `<div data-ssg-block-id data-ssg-hydrate>` + 内部 JSX
   - 维护 SSR 表达式跟踪上下文
3. 渲染器改造(`renderer.ts`):
   - 提供 `withBlockScope(block, fn)` API,临时切换 `__shopify_ssg_liquid_track` 到 block 私有 Set
   - 渲染 block 子树后,把该 Set 转 JSON bridge 注入
4. `useBlockSettings` 改造:
   - 从 BlockContext 读当前 block
   - 输出 `{{ block.settings.X }}`(在 block 作用域内 Liquid 自动解析正确)
5. presets 中的 blocks schema 声明:需支持 `[{ type: "heading", name: "Heading" }, ...]` 形式(已支持)

**风险**:
- 🟠 **MEDIUM-HIGH**:JSON bridge 嵌套结构在 React 树中渲染时,React 可能把它视为特殊 script 节点(无害,但要注意)
- 🟠 **MEDIUM**:嵌套 block 时,block.id 命名冲突需隔离(每个 block 树独立)
- 🟠 **MEDIUM-HIGH**:**`block.shopify_attributes` 的注入位置需要精确**。当前是手动 `{{ block.shopify_attributes }}`,新设计通过 `<div data-ssg-block-id>` 自动包含,但 Dawn 的真实属性是放在具体子元素上(如 `<h2 {{ block.shopify_attributes }}>`)

**修正 — `useShopifyAttributes` 与子元素配合**:
- `useShopifyAttributes()` 返回字符串,JSX 中 `{...spread}` 展开
- SSR 时,`block.shopify_attributes` 表达式被跟踪并加入 block 的 JSON bridge
- 客户端,React 的 spread 把属性注入到对应元素

**可行性结论**:🟠 MEDIUM-HIGH,需要重构当前渲染器的表达式跟踪机制。建议先实现**单 block、无嵌套**版本,验证水合后再扩展嵌套。

---

### 4.2 `useBlockContext()` (内部 hook)

**签名**:
```ts
function useBlockContext<T>(): T;
```

**SSR/CSR 行为**:
- 读 React Context
- 必须在 `<BlockWrapper>` 内部调用

**实现路径**:`useContext(BlockContext)` 简单包装

**风险**:🟢 无(标准 React context)

---

### 4.3 `useBlockRouter(type, registry)`

**签名**:
```ts
function useBlockRouter<P>(
  type: string,
  registry: Record<string, React.ComponentType<P>>
): React.ComponentType<P> | null;
```

**实现路径**:纯 lookup

**风险**:🟢 无(纯 JS utility)

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

## 7. 风险汇总

| 风险 | 等级 | 影响 hook | 缓解 |
|---|---|---|---|
| 水合时 DOM 与 React 树结构不匹配 | 🟠 MED-HIGH | useRawLiquid, useForm, usePaginate, useStaticBlock | 用 Fragment 包裹占位符;SSR 渲染为注释节点,客户端渲染为 null;严格测试 |
| Block JSON bridge 嵌套与命名冲突 | 🟠 MED-HIGH | useBlockLoop | 渲染器隔离 block 作用域;每 block 独立 bridge |
| CSS Modules 类名 SSR/CSR 不同步 | 🟡 MED | (任何用 .module.css 的组件) | 阶段 1 禁止 CSS Modules;阶段 6 再评估 |
| `{% form %}` 提交行为与 Shopify 原生差异 | 🟠 MED | useForm | 分两阶段:B.1 只做标记替换,B.2 完整接管 |
| `{% paginate %}` URL 同步与 SEO link | 🟡 MED | usePaginate | B 类降级方案:只做标记替换,客户端不接管 |
| Pluralization 翻译 | 🟡 MED | useT (i18n) | 字典查找时支持 `key.other` / `key.one` 后缀 |
| i18n 文件体积 | 🟢 LOW | useT | 初始 locale 内联,其他按需加载 |
| `useShopifyAttributes` spread 在 SSR 时是否正确 | 🟡 MED | useBlockLoop | 测试验证;Dawn 用例: `<h2 {{ block.shopify_attributes }}>` |
| `data-ssg-block-id` 与 `block.id` 一致性 | 🟡 MED | useBlockLoop | SSR 强制使用 `block.id` 字面量 |

---

## 8. 实施优先级建议

| 阶段 | Hook | 工作量 | 阻塞的下游 |
|---|---|---|---|
| **1.1** | useImageTag, useImageUrl, useAsset, useFontFace, usePlaceholderSvg | 1 天 | 全部图片密集 section |
| **1.2** | useThemeSettings, useColorScheme, useShopifyAttributes, useBlockType | 0.5 天 | 全部 section |
| **1.3** | useSectionPadding, useImageBehavior, useSectionAspect, useIconUrl | 1 天 | image-banner 类 |
| **1.4** | useRawLiquid + 标记替换机制 | 2-3 天 | main-product, slideshow, 所有 block-iterating |
| **1.5** | useBlockLoop + BlockContext + block-scope bridge | 3-4 天 | 几乎所有 section(用 block) |
| **1.6** | useForm (B.1 标记替换) | 1 天 | newsletter, contact, login |
| **1.7** | useForm (B.2 完整接管) | 3-4 天 | (可选,先 B.1 跑通) |
| **1.8** | usePaginate (B 类降级方案) | 1-2 天 | collection grid, search |
| **1.9** | useStaticBlock | 0.5 天 | slideshow controls |
| **1.10** | useBlockRouter | 0.5 天 | (utility) |
| **1.11** | i18n locale 生成 + useT / useLocale | 2-3 天 | 全部 section |
| **1.12** | CSS Modules 支持 | 2-3 天 | (可选,先禁用) |
| **1.13** | App Block | 0.5 天 | (utility) |

**总工作量估算**:阶段 1 全部完成需 **~25-30 工作日**。

---

## 9. 评审检查清单

评审每个 hook 时,关注以下问题:

- [ ] **签名是否合理**?参数命名、类型、可选性
- [ ] **SSR 行为是否清晰**?输出什么、跟踪什么、加入哪个 bridge
- [ ] **CSR 行为是否清晰**?客户端拿到字符串后怎么处理
- [ ] **水合是否安全**?DOM 与 React 树是否结构对齐
- [ ] **边缘情况是否覆盖**?空值、嵌套、配对、不存在 block
- [ ] **实现路径是否可行**?代码改动量、风险点
- [ ] **是否阻塞下游**?不实现的话,哪些 section/snippet 没法做
- [ ] **降级方案是否合理**?如果做不了,有什么 workaround

---

## 10. 等待评审

按以下顺序逐个评审 hook(或批量评审同类):

1. A 类(11 个)— 可批量通过
2. B 类 3.1 useRawLiquid — 关键基础设施,先评审
3. B 类 3.2 useForm — 决定 newsletter/contact 迁移路径
4. B 类 3.3 usePaginate — 决定 collection grid 迁移路径
5. B 类 3.4 useStaticBlock — 简单,先评审
6. C 类 4.1 useBlockLoop — 核心,需详细评审
7. C 类 4.2-4.3 — 简单,先评审
8. D 类 5.1 useT — i18n 关键
9. SSG 6.1-6.6 — 与 hook 评审并行

**评审方式**:对每个 hook,回答"通过 / 打回需返工 / 需要更多信息"。我会根据评审结果调整实现方案。
