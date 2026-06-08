# Plugin API Design — v3.0 Runtime API

> ✅ **v3.0 更新(2026-06-08)** — 匹配当前代码实现。v1-v9 的 14+ hook 设计已简化为 2 个核心原语 + 4 个组件。
> 历史:经历 v1-v9.1 多轮设计迭代(4 轮评审),v3.0 起大幅简化 API 表面。
> **状态**: 核心 API 已实施(useLiquid/useLiquidCode/Island/BlockSlot/ShopifyImage/ShopifyVideo)。i18n 和 StaticBlock 待实施。
>
> **v3.0 关键变化**:14+ 专用 hook → 2 个核心原语(`useLiquid`/ `useLiquidCode`) + Island 水合边界 + 4 个组件。纯 JS 工具函数移到用户空间。
>
> 用途:把主报告(v11)中所有 hook 需求从 §8 抽出,提供**完整 API 签名、SSR/CSR 双端行为、边缘情况、实现路径、可行性评级**。
> 评审方法:每个 hook 单独评审,通过/打回/打回需返工,逐个推进。
> 配套文档:`docs/2026-06-03-react-dawn-refactor.md`(v11 终态)

---

## 0. 设计原则

### 0.1 SSR/CSR 双端对称

所有 hook 必须同时在两个环境中工作:

| 端 | 角色 | 关键能力 |
|---|---|---|
| **SSR**(Node.js, esbuild 临时 bundle) | 渲染 React 树,产出 HTML | 跟踪 Liquid 表达式,生成占位符,组装最终 Liquid |
| **CSR**(浏览器) | 拿到 SSR 产出的 HTML 后,接管 hydration | 从 JSON bridge 读值,接管 React state |

### 0.2 Island 水合边界机制

> **v3.0 起**:用 **Island 模式**替代了 v1-v8 所有的占位符方案(HTML 注释 / span / 标记替换)。
> 核心思路:在 React 树中用 `<Island>` 包裹「需要 Liquid 生成 HTML」的区域,
> 通过自定义元素 + `dangerouslySetInnerHTML` + 客户端 capture/restore 两阶段,实现 SSR 与 CSR 的水合一致。

**Island 工作流**:

```
SSR 阶段:
  React 树中放入 <Island expression="{{ image_url | image_tag }}" />
  ↓ renderToStaticMarkup
  <ssg-island data-ssg-i="i3" suppressHydrationWarning>
    {{ section.settings.image | image_url: width: 800 | image_tag }}
  </ssg-island>
  ↓ Shopify Liquid 引擎处理
  <ssg-island data-ssg-i="i3">
    <img src="..." srcset="..." sizes="..." loading="lazy" />  ← 实际 HTML
  </ssg-island>

客户端 hydration:
  1. entry-template 预捕获:将每个 Island 的 innerHTML 替换为 "__SSG_ISLAND__" 哨兵,
     真实 HTML 保存到 el._ssgHtml
  2. React hydrateRoot:看到 innerHTML = "__SSG_ISLAND__" → 与 React 树匹配 → 水合成功
  3. Island.useLayoutEffect:从 el._ssgHtml 恢复真实 HTML → DOM 完整
  4. React.memo(() => true):永久阻止重新渲染,Liquid 内容冻结
```

**可用的「插入 Liquid」机制**:

| API | 位置 | 用途 |
|---|---|---|
| `useLiquidCode(code)` | `data-ssg-hydrate` div **之前** | 独立的 Liquid 片段(`{% style %}`, `{% content_for "block" %}` 等) |
| `<Island expression={...}>` | React 树**中间** | 需要 Liquid 生成 HTML 的区域(图片、视频、`{% form %}` 等) |
| `<BlockSlot />` | React 树**中间** | `{% content_for 'blocks' %}` block 注入点(Island 模式封装) |

**不在 React 树中的 Liquid**(如 `{% style %}`, `{% schema %}`):
- `useLiquidCode` 推入 `globalThis.__shopify_ssg_liquid_blocks`,由 `liquid-assembler.ts` 注入到 wrapper 之外

**不适合用 Island 的场景**(如 `{% form %}` 包裹 children):
- Island 适合「完整 HTML 片段」,不适合「开启/关闭标签包裹 React children」
- `useForm` 阶段 1 不实现,阶段 4+ 重写(详见 §3.2)

### 0.3 JSON Bridge:统一数据流,不分层

**核心设计**:bridge 本质是"Liquid 表达式 → 客户端 React state"的反向序列化通道。
一个 entry(section / block / snippet)对应一个 bridge,key 是完整表达式字符串(如 `"section.settings.image"`)。

**实际实现流程**:

```
SSR 阶段:
  1. useLiquid("section.settings.image") → ctx.track("section.settings.image")
     ↓ 写入 globalThis.__shopify_ssg_liquid_track Map
  2. renderToStaticMarkup 完成后,调用 buildLiquidBridge()
     ↓ 从 Map 读取所有跟踪项,生成:
     <script type="application/json" data-ssg-liquid>
       { "section.settings.image": {{ section.settings.image | json }} }
     </script>
  3. liquid-assembler.ts 将 bridge 注入到 section wrapper 内,data-ssg-h 前

Shopify Liquid 引擎处理:
  {{ section.settings.image | json }} → 实际图片 URL(JSON 转义)

客户端 hydration:
  1. entry-template 中 readLiquidData(el):
     el.querySelector(':scope > script[data-ssg-liquid]') → JSON.parse()
  2. LiquidDataProvider 注入 bridge 数据到 React context
  3. useLiquid(path) → ctx.read(path) → bridge[path]

为什么 key 用完整表达式:
  - "section.settings.image" vs "block.settings.heading" 天然区分作用域
  - Shopify Liquid 引擎按 for-loop 上下文自动解析 block.settings.X
  - 客户端 bridge[key] 即返回正确值,无需分层

✨ v3.0 简化:所有 Liquid 值读取统一走 useLiquid,不再区分 section/block/theme 来源。
  路径字符串本身携带了作用域信息,`useLiquid("section.settings.X")` 和 `useLiquid("block.settings.X")`
  在同一个 bridge 中共存。

### 0.4 Island 内部 ID 分配

> **v3.0**:`useUniqueId` 不再作为公共 API。Island 内部使用自增计数器分配 `data-ssg-i="i3"`,
> 用于客户端预捕获阶段定位元素。id 不进入最终产物(客户端 `useLayoutEffect` 恢复后即被替换),
> 无需 server/client 稳定或跨进程唯一。实现:`globalThis.__shopify_ssg_island_counter`,5 行,无外部依赖。

---

## 1. API 分类总览 (v3.0)

> **v3.0 重大简化**:v1-v9 的 14+ 专用 hook 已被替换为 2 个核心原语 (`useLiquid` / `useLiquidCode`) + 4 个组件 (`Island` / `BlockSlot` / `ShopifyImage` / `ShopifyVideo`)。
> 设计哲学:插件提供**最小核心 API**,纯 JS 工具函数（`useImageBehavior` / `useColorScheme` 等）在用户空间 (`frontend/utils/`) 实现。

按职责分为 4 类:

| 类别 | 标记 | API | 描述 |
|------|------|-----|------|
| **核心原语** | 🟢 DONE | `useLiquid<T>(path, opts?)` | 统一读 Liquid 值,替换所有专用读 hook |
| | 🟢 DONE | `useLiquidCode(code, expr?)` | 注入原始 Liquid 片段到 wrapper 之外 |
| **水合边界** | 🟢 DONE | `<Island expression={...}>` | 通用 hydration 边界,包裹需要 Liquid 生成 HTML 的区域 |
| | 🟢 DONE | `<BlockSlot />` | block 注入点,渲染 `{% content_for 'blocks' %}` |
| **媒体组件** | 🟢 DONE | `<ShopifyImage>` | CDN 图片,`image_url \| image_tag` 管道 |
| | 🟢 DONE | `<ShopifyVideo>` | `video_tag` 管道 |
| **上下文** | 🟢 DONE | `LiquidDataProvider` | bridge 数据注入到 React context |
| **用户空间** | 🟢 不进插件 | `useImageBehavior` / `useColorScheme` / `useBlockType` / `clsx` 等 | 纯 JS utility,在 `frontend/utils/` 中实现 |
| **待实现** | 🟡 TODO | i18n 系统 | `useT` / `useLocale` / `LocaleProvider` |
| | 🟡 TODO | `<StaticBlock>` | 静态 block 注入 |

**v1-v9 中已移除的 hook 对照**:

| 已移除 | 替代方案 |
|--------|---------|
| `useSectionSettings(key)` | `useLiquid("section.settings." + key)` |
| `useBlockSettings(key)` | `useLiquid("block.settings." + key)` |
| `useThemeSettings(key)` | `useLiquid("settings." + key)` |
| `useLiquidValue(path)` | `useLiquid(path)` |
| `useRawLiquid(code)` | `useLiquidCode(code)` |
| `useImageUrl(image, w)` | 直接用 `<ShopifyImage>` 组件 |
| `useAsset(path, mode)` | `useLiquidCode("{{ 'path' | asset_url }}")` |
| `useFontFace(font)` | `useLiquidCode("{{ font | font_face }}")` |
| `usePlaceholderSvg(name)` | `useLiquidCode("{{ 'name' | placeholder_svg_tag }}")` |
| `useShopifyAttributes` | 插件自动注入,无需手动 |
| `useBlockLoop` | `<BlockSlot>` 组件 |
| `useBlockContext` / `useBlockRouter` | 每 block 独立 entry,无需 context |

> 来源:API 设计经过 4 轮评审,经实证测试与驳回验证逐步收敛。
>
> **方法学重要说明**:本节对每条评审意见区分"测试真实证明"与"评审者基于文档的推断"。**测试文件已被清理**(评审过程产物不应留在 docs/ 目录污染判断),结论已沉淀到本节表格。

### 1.1 逐条评估(严格区分证据等级)

| 发现 | 测试是否真实证明? | 严重度 | 我的评估 |
|---|---|---|---|
| 1. HTML 注释被转义为 `&lt;!--` | ✅ 真实断言(2 个) | 🟡 MED | ✅ 接受 — 但 v6 已改用 `<span data-img-id>`,v6 不受影响 |
| 2. `<ImageTag>` null return 与 DOM 结构不匹配 | 🟡 child count 真实但 `assert(true)` 收尾 | 🔴 CRITICAL | ✅ 接受严重度,**v5/v6 设计有真实风险**,但**测试未做实际 hydration 验证** |
| 3. `dangerouslySetInnerHTML` 也不解决 | ❌ 只验证不转义,没验证水合 | 🟡 MED | 🟡 部分驳回 — 结论是推断,非测试证明 |
| 4. 单引号/双引号在 HTML 属性中被转义 | ✅ 真实断言(3 个) | 🟡 MED | ✅ 接受结论 — 但**描述错误**,实际是双引号被转 `&quot;` 而非单引号转 `&#x27;` |
| 5. Fragment 包裹 null 节点 | ✅ 真实断言 | 🟢 LOW | ✅ 接受 |
| 6. React 19 自动插入 `<link rel="preload">` | ❌ `assert(true)` | 🟠 MED | 🟡 结论对(我亲眼看到输出),但**测试不验证** |
| 7. style hex 序列化 | ✅ 真实断言 SSR 输出 | 🟡 MED | ✅ 接受 — React 18+ 水合 tolerance 是已知行为 |
| 8. 自定义元素可作占位符 | ❌ `assert(true)` | 🟢 LOW | 🟡 驳回作为关键论据 |

### 1.2 关键驳回(评审者错误/夸大处)

#### 驳回 1 ❌ **错误**:发现 4 的事实错误 — **v8 修正**

> **v8 关键修正**:驳回验证测试**反证了我的驳回**(评审者用补充测试反证 v7 设计者的驳回 1 错误)。
>
> 我之前的"实际是双引号被转义为 `&quot;`"结论**是错的**。我看到的是驳回测试 B 的输出(`{{ "Banner" }}` 用双引号包含,被转 `&quot;`),但混淆成了驳回测试 A。
>
> **驳回验证测试 A 实际输出**:
> ```js
> alt: "{{ image.alt | default: 'Banner' }}"
> // ↓
> <img alt="{{ image.alt | default: &#x27;Banner&#x27; }}"/>
> ```
> **单引号在 HTML 属性中**确实**被转义为 `&#x27;`**(不是 `&quot;`)。
>
> | 字符串内含 | 转义后 |
> |---|---|
> | `'Banner'` (单引号) | `&#x27;Banner&#x27;` |
> | `"Banner"` (双引号) | `&quot;Banner&quot;` |
> | 纯 Liquid 表达式(无字面量) | 原样保留 |
>
> **结论**:v7 文档 "驳回 1" 完全错误,**两种引号都会被转义,只是 entity 形式不同**。`&#x27;` 在 Liquid 中可能无法正确解析(因为 `'` 是 Liquid 字符串分隔符),需要进一步验证 Shopify 引擎行为。
>
> **修正行动**:
> 1. 承认驳回 1 错误,接受评审者原始发现 4 的描述
> 2. 文档 §2.x 中所有"避免在属性中用字符串字面量"的建议**加强**:v8 起明确"避免在 HTML 属性中放任何含引号的字符串字面量"

#### 驳回 2:评审者修正方案忽略发现 6(部分正确,需要修正)

评审者建议 `<ImageTag>` 改为渲染真实 `<img>`:
```tsx
<img src={`{{ ${image} | image_url: width: ${width} }}`} srcSet={`...`} />
```

**驳回验证测试(react 19 preload 触发条件)**:

| 输入 | preload 触发? |
|---|---|
| `<img src="...">` (极简) | **✓ 触发** |
| `<img src="..." loading="lazy">` | ✗ **不触发** |
| `<img src="..." className="x">` | ✓ 触发 |
| `<img alt="">` 无 src | ✗ 不触发 |
| `<picture><source srcSet><img src>` | ✗ **不触发** |
| `<img src="{{ ... }}">` (Liquid) | ✓ 触发 |

**关键修正**:
- preload 触发条件**不是 srcSet**(我之前驳回 3 的部分依据)
- preload 触发条件是**"无 loading='lazy' 的 `<img>`"**(评审者发现 6 真相)
- **`<picture>` 包裹**也能避免 preload
- **`<noscript>` 包裹**(评审者 F/G 测试)避免 preload,但 `<noscript>` 内的 img 不显示

**v7 修正方案必须重新评估**:
- 方案 A:**强制 `loading="lazy"`**(除 LCP 关键图外,默认 lazy)
- 方案 B:LCP 关键图用 `<picture>` 包裹
- 方案 C:**走 useLiquidBlock 模式**,把 `<img>` 注入到 `data-ssg-hydrate` div 之外(完全不参与 React 渲染)

#### 驳回 3:发现 3 的"路径 A"是 useLiquidBlock 重命名

评审者建议 useForm 用 useLiquidBlock 注入。但 useLiquidBlock **注入到 `data-ssg-hydrate` 之前**,而 `{% form %}` **需要包裹 children**。这是结构性矛盾,不是简单改个名字能解决。

**真正可行路径**:
- 阶段 2-3:仅做 `useLiquidBlock` 注入(只支持**没有 form 包裹 children** 的场景,如 ProductPrice)
- 阶段 4-5:重写,React 自己生成 `<form>` + JS 提交(放弃 `{% form %}` 语法)

### 1.3 必须接受的设计缺陷

**`<ImageTag>` v5/v6 设计的真实问题**:
- v5 设计:返回 null,SSR 渲染为占位 span
- v6 设计:同 v5
- **实际问题**:即使 v6 用 `<span data-img-id>` 替代注释,CSR 仍返回 null
- React hydration 会按 React 树结构对比 DOM,期望 `<div></div>` 但看到 `<div><img></div>` → mismatch

**useForm / usePaginate 的根本困难**:
- 包裹 children 的需求与"占位符在 React 树中"的设计矛盾
- 当前架构下不可行,需分阶段降级

### 1.4 受影响文档章节(v8 修订)

- **§2.1 `<ImageTag>`**(v7 → v8 进一步修正):
  - **v7 失败**:v7 设计的"`<img src>` 不带 srcSet 也不会触发 React 19 preload"假设**是错的**。驳回验证测试 C 证实,**任何无 `loading="lazy"` 的 `<img>` 都会触发 preload**
  - **v8 修正**:`loading` 默认 `'lazy'`,移除 `fetchPriority`;LCP 关键图用 `<picture>` 包裹或 `useLiquidBlock` 模式
- **§2.x 文档加强**:"避免在 HTML 属性中放任何含引号的字符串字面量"——驳回 1 反证后加强(单引号也会被转 `&#x27;`)
- **§3.1 useRawLiquid**:v1-v4 的 HTML 注释方案已废弃,v5/v6 的 span + null 也有问题,**需彻底重设计**
- **§3.2 useForm**:需分两阶段降级
- **§3.3 usePaginate**:需移除或大幅降级
- **§3.4 useStaticBlock**:仍可走 useLiquidBlock 模式
- **§6.5 hydration 规则**:H3(自动改 CSS 变量)的方案需重新设计;新增规则 H13(检测 React 19 自动 link preload,触发条件是"无 loading=lazy")

---

## 2. 核心原语与媒体组件 (🟢 DONE)

> v3.0 起,所有 Liquid 值读取统一走 `useLiquid`,所有 Liquid 代码注入统一走 `useLiquidCode`。
> 不再需要 10+ 个专用 hook。本节描述插件提供的核心 API,纯 JS 工具函数(`useImageBehavior`、`useColorScheme` 等)
> 应在用户项目 `frontend/utils/` 中实现,不进插件(见 §2.5)。

### 2.1 `useLiquid<T>(path, opts?)` — 统一 Liquid 值读取 ★ 核心

**签名**:
```ts
function useLiquid<T>(path: string, opts?: UseLiquidOptions): [T, (val: T) => void];
interface UseLiquidOptions {
  type?: 'string' | 'number' | 'boolean' | 'json' | 'html';
  bridge?: boolean;
  defaultValue?: T;
}
```

**SSR 行为**:
- 返回 `["{{ path }}", setter]`(占位符字符串)
- `ctx.track(path, opts)` 将表达式注册到 `globalThis.__shopify_ssg_liquid_track` Map
- `buildLiquidBridge()` 将所有跟踪项输出到 `<script data-ssg-liquid>`

**CSR 行为**:
- 从 `LiquidDataProvider` context 中 `ctx.read(path)` 获取值
- `coerce()` 根据 `opts.type` 进行类型转换(number/boolean/json/html)
- 返回 `[coercedValue, setter]`(setter 仅本地临时覆盖,不同步回 Shopify)

**替代所有旧 hook**:
```tsx
// 旧: useSectionSettings("image")
const [image] = useLiquid<string>("section.settings.image");

// 旧: useBlockSettings("heading")
const [heading] = useLiquid<string>("block.settings.heading");

// 旧: useThemeSettings("animations_reveal_on_scroll")
const [anim] = useLiquid<boolean>("settings.animations_reveal_on_scroll", { type: "boolean" });

// 旧: useLiquidValue("section.id")
const [id] = useLiquid<string>("section.id");
```

**实现**:`packages/vite-plugin-react-shopify/src/runtime/useLiquid.ts`

**风险**:🟢 NONE(已实现,被 example 项目验证)

### 2.2 `useLiquidCode(code, trackedExprs?)` — 注入原始 Liquid

**签名**:
```ts
function useLiquidCode(code: string, trackedExprs?: string[]): void;
```

**SSR 行为**:
- `ctx.inject(code)` 将代码推入 `globalThis.__shopify_ssg_liquid_blocks` 数组
- 可选 `track(expr)` 跟踪引用的表达式
- 渲染器(`liquid-assembler.ts`)将其注入到 `data-ssg-hydrate` div **之前**

**CSR 行为**:no-op

**替代所有旧 hook**:
```tsx
// 旧: useRawLiquid('{% style %}.section-padding ...{% endstyle %}')
useLiquidCode('{% style %}.section-padding { padding-top: 36px; }{% endstyle %}');

// 旧: useAsset('icon-arrow.svg', 'inline')
useLiquidCode("{{ 'icon-arrow.svg' | inline_asset_content }}");

// 旧: usePlaceholderSvg('hero-apparel-1')
useLiquidCode("{{ 'hero-apparel-1' | placeholder_svg_tag: 'placeholder-svg' }}");

// 旧: useFontFace(settings.type_body_font)  — 但 Dawn 中不在此调用(在 theme.liquid 层)
useLiquidCode("{{ settings.type_body_font | font_face: font_display: 'swap' }}");
```

**定位**:注入在 React 树之外,不产生 DOM 节点。适合 `{% style %}`、`{% schema %}` 等独立 Liquid 片段。
**不适用于**包裹 React children 的场景(`{% form %}...{% endform %}`),见 §3.2。

**实现**:`packages/vite-plugin-react-shopify/src/runtime/useLiquid.ts`

**风险**:🟢 NONE(已实现)

---

### 2.3 `<Island expression={...}>` — 通用 hydration 边界 ★ 核心

**签名**:
```ts
interface IslandProps {
  expression: string;          // Liquid 表达式,如 "{{ image | image_tag }}"
  as?: string;                 // 自定义元素标签,默认 "ssg-island"
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;  // 仅 CSR 使用,SSR 忽略
}
const Island: React.MemoExoticComponent<(props: IslandProps) => JSX.Element>;
```

**SSR 行为**:
- 渲染 `<ssg-island data-ssg-i="i3" suppressHydrationWarning />`
- 通过 `dangerouslySetInnerHTML` 输出 expression(Liquid 表达式)
- 分配稳定的递增 key(`data-ssg-i`),用于客户端预捕获定位

**CSR 行为**(两阶段):
1. **预捕获**:entry-template 将每个 Island 的 actual innerHTML 替换为 `"__SSG_ISLAND__"` 哨兵,真实 HTML 保存到 `el._ssgHtml`
2. **恢复**:Island 的 `useLayoutEffect` 从 `el._ssgHtml` 恢复真实 HTML
3. `React.memo(() => true)` 永久阻止重新渲染,Liquid 内容冻结

**为什么需要 Island**:
- `renderToStaticMarkup` 无法输出 HTML 注释(转义为 `&lt;!--`)
- 自定义元素 + `dangerouslySetInnerHTML` 保留 Liquid 表达式原样
- 客户端 sentinel 替换确保水合 DOM 与 React 树完全匹配

**典型用例**:
```tsx
// 在 React 树中间插入 Shopify 生成的 HTML 片段
<Island expression="{{ section.settings.image | image_url: width: 800 | image_tag }}" />

// 封装为高层组件
function ShopifyImage(props) {
  const expr = buildImageExpression(props);
  return <Island as="span" style={{ display: "contents" }} expression={expr} />;
}
```

**实现**:`packages/vite-plugin-react-shopify/src/runtime/Island.tsx`

**风险**:🟢 LOW(已实现,通过 entry-template capture/restore 机制验证)

---

### 2.4 `<ShopifyImage>` 组件 (🟢 DONE)

> ✅ **已实施**(`packages/vite-plugin-react-shopify/src/runtime/ShopifyImage.tsx`)。
> 使用 `<Island>` 包裹,SSR 输出 `image_url | image_tag` 完整管道。

**签名**:
```ts
interface ShopifyImageProps {
  image: string;              // Liquid 表达式,如 "section.settings.image"
  width?: number;
  height?: number;
  crop?: 'top' | 'center' | 'bottom' | 'left' | 'right';
  alt?: string;
  loading?: 'lazy' | 'eager'; // 未传时由 section.index 自动推断
  fetchPriority?: 'high' | 'low' | 'medium' | 'auto';
  decoding?: 'async' | 'sync' | 'auto';
  preload?: boolean;
  tagWidth?: number;
  tagHeight?: number;
  sizes?: string;
  widths?: string;
  className?: string;
}
```

**`section.index` 自动推断**:当 `loading` / `fetchPriority` / `preload` 未显式传入时:
| `section.index` | `loading` | `fetchPriority` | `preload` |
|-----------------|-----------|-----------------|-----------|
| `< 4` | `eager` | `high` | `true` |
| `4 ≤ idx < 8` | `lazy` | `medium` | `false` |
| `≥ 8` | `lazy` | `low` | `false` |

**风险**:🟢 LOW(已实现,146 单测全过)

---

### 2.5 `<ShopifyVideo>` 组件 (🟢 DONE)

> ✅ **已实施**(`packages/vite-plugin-react-shopify/src/runtime/ShopifyVideo.tsx`)。
> 与 `<ShopifyImage>` 架构一致,输出 `video_tag` 完整表达式。

**签名**:
```ts
interface ShopifyVideoProps {
  media: string;
  imageSize?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
}
```

**风险**:🟢 LOW(已实现)

---

### 2.6 用户空间 Utility(不进插件)

以下函数是**纯 JS 逻辑**,不依赖 SSG/SSR。应在用户项目 `frontend/utils/` 中实现,不进 `vite-plugin-react-shopify`:

| 函数 | 用途 | 建议路径 |
|------|------|---------|
| `useImageBehavior(behavior)` | 根据 `image_behavior` 返回 widths/sizes 等 | `frontend/utils/images.ts` |
| `useColorScheme(id)` | 返回 `color-${id} gradient` className | `frontend/utils/colors.ts` |
| `useBlockType<T>(blocks, type)` | 过滤特定 type 的 block | `frontend/utils/blocks.ts` |
| `clsx(...args)` | 条件 className 拼接 | `frontend/utils/classes.ts` |
| `parseLiquidBoolean(val)` | Liquid 布尔值 → JS boolean | `frontend/utils/parsers.ts` |

**`useSectionPadding` 替代方案**:
```tsx
// 方案 1: CSS 变量(推荐)
// .elem { padding-top: var(--section-padding-top, 36px); }

// 方案 2: React <style> 元素 + useLiquid
const [paddingTop] = useLiquid<string>("section.settings.padding_top");
const [paddingBottom] = useLiquid<string>("section.settings.padding_bottom");
<style>{`.section-${id}-padding { padding-top: ${paddingTop}px; padding-bottom: ${paddingBottom}px; }`}</style>
```

**风险**:🟢 NONE(不进插件,用户完全可控)

---
## 3. 注入类 API (🟢 DONE / 🟡 TODO)

> v3.0: v1-v9 的"标记替换"模式已被 Island 机制替代。`useRawLiquid` 改为 `useLiquidCode`(已实现)。
> `useForm` 和 `usePaginate` 正确推迟到阶段 4+,`<StaticBlock>` 待实现。

> 这些 hook 在 React 树中渲染一个占位符节点,SSR 阶段被替换为真实 Liquid 代码。客户端水合时占位符节点为空,与 DOM 结构对齐(无 mismatch)。
>
> **B 类总量从 v1 的 4 个减为 3 个**:`useShopifyAttributes` 移除(v1 错误设计)

### 3.1 `useLiquidCode` — 原始 Liquid 注入 (🟢 DONE)

> ✅ **已实施**为 `useLiquidCode(code, trackedExprs?)`,是 `useLiquidBlock` 的语义重命名。见 §2.2。

**API 参见**: §2.2 `useLiquidCode`。

**签名**:
```ts
// useRawLiquid 是 useLiquidBlock 的语义别名(不增加新概念)
function useRawLiquid(code: string): void;
```

**SSR 行为**:
- 调用 `useLiquidBlock(code)`(已存在机制)
- 收集到全局 `__shopify_ssg_liquid_blocks` 数组
- 跟踪 `code` 中的 `{{ ... }}` 表达式
- **不返回任何内容**(`void`),不产生 DOM 节点

**SSR 行为**(v7+,与现有 `useLiquidBlock` 等价):
- 调用 `useLiquidBlock(code)`(已存在机制)
- 收集到全局 `__shopify_ssg_liquid_blocks` 数组
- 跟踪 `code` 中的 `{{ ... }}` 表达式

**CSR 行为**:no-op

**渲染器侧**(已存在,无需新实现):
- `liquid-assembler.ts` 中 `liquidPrepend` 逻辑
- 收集的代码注入到 `data-ssg-hydrate` div **之前**

**限制**:
- ❌ 不能在 React 树中包裹 children(已确认,见 §3.2 useForm)
- ❌ 注入位置固定在 `data-ssg-hydrate` div 之前,不能在中间插入
- ✅ 适合独立插入 Liquid 代码片段

**典型用例**:
```tsx
function MySection() {
  useLiquidCode('{% style %}.section-padding { ... }{% endstyle %}');
  useLiquidCode("{{ 'icon-arrow.svg' | inline_asset_content }}");
  return <section>...</section>;
}
```

### 3.2 ~~`useForm`~~ — **v7 降级为不实现**(🟠 MEDIUM-HIGH)

**v7 决策**:**v1-v6 的 `useForm` 设计均不可行**,阶段 1 不实现,推迟到阶段 4+ 重写。

**评审者提出的问题**(每个都成立):
1. `FormOpen` / `FormClose` 配对无保障(用户忘记 `FormClose` 会出错)
2. 评审者建议改为单一 `<Form>` 组件,但**仍需解决"在 React 树中包裹 `{% form %}`"的根本问题**
3. 完整 form type 列表(评审者指出文档遗漏):`form-tag.md` 中有 15 种,文档只列 10 种
4. `formState.errors` 类型应为 `{ form, email, translated_fields: { email } }` 而非 `Record<string, string[]>`

**v7 决策路径**:

| 阶段 | 处理 |
|---|---|
| **阶段 1(不实现)** | 不引入 useForm,form 类的 section 暂不迁移 |
| **阶段 2-3 临时方案** | 用 `useLiquidBlock` 注入 `{% form %}` 和 `{% endform %}` 到 `data-ssg-hydrate` div 之前(已有机制),但**不包裹 children** |
| **阶段 4+ 重写** | 完全放弃 `{% form %}` 语法,React 自己生成 `<form>` + JS 提交,重写 form state 管理 |

**降级方案示例**(阶段 2-3):
```tsx
// 注意: 这种方案只适用于"form 标签不包裹 children"的简单情况
// 复杂表单(包含 React 状态 children)需要阶段 4 重写
function NewsletterForm() {
  // 用 useLiquidBlock(全局注入,不在 React 树中)
  useLiquidBlock('{% form "customer", class: "newsletter-form" %}');
  useLiquidBlock('{% endform %}');
  
  // children 不在 form 内部!这是临时方案的局限
  return (
    <div className="newsletter-form-wrapper">
      <input type="email" name="contact[email]" />
      <button type="submit">Subscribe</button>
    </div>
  );
}
```

**v1-v6 错误总结**:
- 我之前把 `useForm` 当作普通 B 类 hook(标记替换)设计
- 实际上 `{% form %}` 需要**包裹 React children**,这是标记替换模式无法解决的
- 错误根源:没充分理解 `{% form %}` 的语义

**可行的最终方案**(阶段 4+):
```tsx
// 完整 React 实现,放弃 {% form %} 语法
function NewsletterForm() {
  const { submit, errors, posted } = useNewsletterSubmit();
  return (
    <form onSubmit={submit} className="newsletter-form">
      <input type="email" name="email" required />
      {errors.email && <span className="error">{errors.email[0]}</span>}
      {posted && <p>Thanks for subscribing!</p>}
      <button type="submit">Subscribe</button>
    </form>
  );
}

function useNewsletterSubmit() {
  const [posted, setPosted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const res = await fetch('/contact', { method: 'POST', body: formData });
    // 处理响应
  };
  return { submit, errors, posted };
}
```

**完整 form type 列表**(15 种,v7 完整,经 `form-tag.md` 校对):
```ts
type ShopifyFormType =
  | 'customer'
  | 'create_customer'
  | 'new_comment'
  | 'contact'
  | 'product'
  | 'cart'
  | 'storefront_password'
  | 'activate_account'
  | 'recover_customer_password'
  | 'reset_customer_password'
  | 'guest_login'
  | 'currency'
  | 'customer_address'
  | 'localization'
  | 'activate_customer_password';
```

**风险**:
- 🔴 **HIGH**:阶段 2-3 的降级方案会导致 form 行为异常(`{% form %}` 不包裹 children)
- 🟡 **MEDIUM**:阶段 4+ 的完整重写工作量大,需要逐一实现 15 种 form 的提交逻辑

---

### 3.3 ~~`usePaginate`~~ — **v7 降级为不实现**(🟠 MEDIUM-HIGH)

**v7 决策**:**v1-v6 的 `usePaginate` 设计均不可行**,阶段 1 不实现。

**评审者提出的根本问题**:
1. **SSR 数据不可用**:`usePaginate(items, perPage)` 需要 `items` 数组,但 SSR 时它实际是字符串 `{{ collection.products | json }}`,无法 `.length`/`.slice()`
2. 依赖 v1-v4 的标记替换(已证明不可行)
3. **paginate 表达式变量名编译时不可知**:`{% paginate collection.products by 16 %}` 中的 `collection.products` 在 React 编译时无法确定(可能来自不同 Liquid 对象)

**v7 决策路径**:

| 阶段 | 处理 |
|---|---|
| **阶段 1(不实现)** | 不引入 usePaginate |
| **阶段 2-3 临时方案** | 完全由 Liquid 处理分页,React 只负责单个 product card 的渲染 |
| **阶段 4+** | 视实际需要重写(可能用 React 端 API + virtualized list) |

**降级方案示例**(阶段 2-3,主推):
```tsx
// 分页完全由 Liquid 处理
// 最外层 section .liquid 用 {% paginate %} 包裹整个产品列表
// React 只负责渲染单个 product card 的 UI 逻辑
function MainCollectionProductGrid() {
  // 不调用 usePaginate
  // React 不知道分页(也不需要知道)
  
  return (
    <div className="collection-grid">
      {/* Shopify 的 {% paginate %} 在外面包裹整个 list */}
      <ProductCard />  {/* 单个 product */}
      {/* 分页导航由 Liquid 的 default_pagination 渲染 */}
    </div>
  );
}
```

**v1-v6 错误总结**:
- 我之前试图在 React 端做分页(`.slice()` 等)
- 实际上分页是 Liquid 引擎的计算,React 端无法在 SSR 阶段获取 `items.length`/`items.slice(0, 16)`
- 错误根源:把"展示逻辑"误认为"分页逻辑"

**阶段 4+ 的可能重写**:
- 客户端分页:用 React `useState` + 数组 slice(但数据已 SSR 加载,客户端无重新分页必要)
- 无限滚动:用 `IntersectionObserver` 触发 Shopify 的 paginate 重新请求
- 筛选/排序:走 form GET,整页 reload,React 重新 hydrate
- 这些都不需要 usePaginate hook,React 端独立实现

**风险**:
- 🟢 LOW:阶段 1 不实现,没有直接风险
- 🟡 MEDIUM:阶段 2-3 的降级方案限制了 React 端做交互式分页

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

## 4. 组件化 Slot (🟢 DONE)

> ✅ **v3.0 已实施**:`<BlockSlot>` 已实现为 Island 模式的封装,使用 `<shopify-block-slot>` 自定义元素,
> SSR 输出 `{% content_for \'blocks\' %}` 的 `dangerouslySetInnerHTML`,客户端通过 `ssg:blocks:ready` 事件触发 block hydration。
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
   - 当前的 `useLiquid("block.settings.X")` 已经是基于"当前 block 上下文"工作
   - 每个 block 单独 hydrate,JSON bridge 简单清晰
   - 不需要新加任何 hook,只需要让 React 知道"block 由 Shopify 渲染,React 负责水合"

### 4.1 `<BlockSlot>` 组件(替代 useBlockLoop)★ 关键 (🟢 DONE)

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
3. **无需新加表达式跟踪机制** — block 的设置由各自 entry 的 `useLiquid("block.settings.X")` 处理(已有)

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
  const [heading] = useLiquid<string>("block.settings.heading");
  const [size] = useLiquid<string>("block.settings.heading_size");
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
- `useBlockContext` 用于从 React context 读 block 数据 — **新设计不需要 block context**,因为 block 是独立 React entry,直接在 entry 内 `useLiquid("block.settings.X")` 即可
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

### 6.1 标记替换机制 — **v3.0 已废弃,被 Island 替代**

> ⚠️ 本节描述的是 v1-v9 的占位符方案,已被 Island 模式(§0.2)完全替代。
> 不再需要 "SSR 后处理字符串替换"。保留作历史参考。

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

### 6.3 Filter 跟踪扩展(v8 修正)

> **v8 修正**:v2 评审指出原文档中新增的 `asset_url` / `inline_asset_content` / `placeholder_svg_tag` 是**无效项**。`DEFAULT_LIQUID_FILTERS` 的 key 必须是 setting **type** 名(`textarea` / `image_picker`),但这些 filter 名不是 setting type。

**`DEFAULT_LIQUID_FILTERS` 真实匹配机制**(代码路径):
```ts
// packages/vite-plugin-react-shopify/src/ssg/renderer.ts
function buildLiquidFilterMap(settings, prefix) {
  const map = {};
  for (const s of settings) {
    const filter = DEFAULT_LIQUID_FILTERS[s.type];  // ← key 是 s.type
    if (filter) map[`${prefix}${s.id}`] = filter;
  }
  return map;
}
```

**正确的内容**(保留):
```ts
const DEFAULT_LIQUID_FILTERS: Record<string, string> = {
  textarea: " | newline_to_br",
  image_picker: " | img_url: 'master'",
  // ❌ 不需要为 useAsset / usePlaceholderSvg 加条目
  // 这些 hook 不使用 type-based filter 机制
  // 它们的 Liquid 字符串由 hook 内部直接生成完整表达式
};
```

**useAsset / usePlaceholderSvg 的实现方式**:
- **不调用** `useLiquid` 的 bridge 跟踪(避免进入 type-based filter 机制)
- 直接返回完整 Liquid 字符串,如 `{{ 'foo.svg' | asset_url }}`
- 由渲染器识别这是字面量表达式(没有变量),不进入 bridge
- 见 §3.4 useAsset 字面量跟踪冗余问题

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

## 6.5 Hydration 风险全景分析 + 插件检测策略(v5 新增,用户重点关注)

> 用户反馈:"关于水合作用的潜在问题,我需要你详细说明,并且提供对应的场景与解决方案,我希望尽可能在插件测自动化支持,比如插件目前实现的 `@packages/vite-plugin-react-shopify/src/hydration-fix/index.ts`,如果确实难以覆盖完全,至少需要在构建时提供必要的 warning (潜在问题) 或者 error(明确有问题,但是无法自动兼容修复) 提示,并且适当的进行阻碍构建操作,避免异常代码直接发布。"

### 6.5.1 现状回顾

当前插件的 `hydration-fix` 模块:
- 路径:`@packages/vite-plugin-react-shopify/src/hydration-fix/index.ts`
- 实现:用 OXC 解析 TSX 源码,遍历 AST,检测相邻 `JSXText` + `JSXExpressionContainer`,自动用模板字面量 `{\`...\`}` 包裹
- 处理:**仅**一类问题(相邻文本+表达式)
- 触发:在 `transform` 阶段对所有 `.tsx`/`.jsx` 文件应用,`enforce: "pre"`
- 输出:`log.warn` 而非 error,继续构建

**v5 扩展计划**:在现有基础上,新增 8 类常见 hydration mismatch 的自动检测/修复,并在 `validate` 阶段输出分级提示。

### 6.5.2 完整问题清单

| # | 问题 | 触发场景 | 严重度 | 插件可自动修复? | 插件可检测? |
|---|---|---|---|---|---|
| H1 | 相邻 JSXText + JSXExpressionContainer | `<li>title = {title}</li>` | 🟡 常见 | ✅ 已实现 | ✅ 已实现 |
| H2 | 条件渲染结构差异 | `{cond && <Banner />}` 与 SSR 状态不一致 | 🔴 严重 | ❌ | ⚠️ 静态扫描可识别语法(条件+JSX) |
| H3 | 内联颜色 hex → rgb 转换 | `<div style={{ backgroundColor: "#fff" }} />` | 🟡 常见 | 🧹 **仅 warn,不自动修复** | ✅ 可识别 |
| H4 | Date/Number 本地化差异 | `{new Date().toLocaleString()}` | 🔴 严重 | ❌ 取决于环境 | ❌ |
| H5 | Conditional className 拼接 | `clsx(cond && "a", "b")` | 🟡 常见 | ❌ | ❌ |
| H6 | 条件注释/`<></>` Fragment 结构 | `<>{cond ? <A/> : null}</>` | 🟠 中等 | ❌ | ⚠️ |
| H7 | 文本节点与 `<br/>` / `<wbr/>` 混排 | `<div>line1<br/>line2</div>` | 🟢 罕见 | ❌ | ❌ |
| H8 | dangerouslySetInnerHTML 内容 | HTML 实体编码差异 | 🟠 中等 | ❌ | ❌ |
| H9 | useState 初始化依赖外部变量 | `useState(Math.random())` | 🔴 严重 | ❌ | ✅ 可识别(SSR 警告) |
| H10 | 客户端修改 useEffect 后的 DOM | useEffect 副作用未完成就水合 | 🟡 常见 | ❌ | ❌ |
| H11 | JSX 字符串字面量含 Liquid 表达式 | `<div>{"{% if x %}"}</div>` | 🟡 Dawn 兼容 | ❌ | ⚠️ |
| H12 | Suspense / Async Server Components 边界 | React 19 新功能 | 🟠 中等 | ❌ | ❌ |

### 6.5.3 详细场景与方案

#### H1 相邻 JSXText + JSXExpressionContainer(已实现)

**场景**:
```tsx
// ❌ 错误
<button>-{step}</button>
<li>title = {title}</li>

// ✅ 正确(模板字面量)
<button>{`-${step}`}</button>
<li>{`title = ${title}`}</li>
```

**当前实现**:`hydration-fix/index.ts` 自动转换。

**改进**:从 `log.warn` 升级为默认 warn + 配置选项(可设为 error)。

#### H2 条件渲染结构差异

**场景**:
```tsx
// ❌ 危险
{showBanner && <Banner />}

// SSR: showBanner = true → 渲染 <Banner />
// 客户端 useState(false) → 渲染空 → mismatch
```

**正确做法**:
```tsx
// ✅ 用 hidden 属性
<section hidden={!showBanner}>
  <Banner />
</section>
```

**插件检测**:
- 在 `validate` 阶段,扫描 JSX 中 `cond && <Component/>` 模式
- 输出 warn:`Hydration risk: conditional render. Use 'hidden' attribute instead.`
- 配置项 `ssg.hydration.condRender: 'warn' | 'error' | 'off'`

**无法自动修复**:因为业务逻辑决定何时显示,插件无法智能判断。

#### H3 内联颜色 hex 转换(v8 修正)

> **v2 评审问题**:v6 文档的自动修复方案 `backgroundColor: "#6c63ff"` → `"--bg-color": "#6c63ff"` 改变了 CSS 语义。`background-color` 是标准 CSS 属性,`--bg-color` 是 CSS 自定义属性(必须配合 CSS 规则 `background-color: var(--bg-color)` 才生效)。自动修复的产物**不向后兼容**,会破坏现有样式。
>
> **v8 决策**:**H3 降级为 `warn`**,**不自动修复**。

**场景**:
```tsx
// ❌ 浏览器把 hex 规范化为 rgb
<div style={{ backgroundColor: "#6c63ff" }} />
// SSR: style="background-color:#6c63ff"
// 客户端: style="background-color:rgb(108, 99, 255)" → mismatch
```

**正确做法**:
```tsx
// ✅ 把颜色放在 CSS 文件中(非内联 style)
.elem { background-color: #6c63ff; }
<div className="elem" />
// 或 ✅ 用 CSS 变量(如果必须在 inline style 中)
<div style={{ backgroundColor: "var(--accent, #6c63ff)" } as React.CSSProperties} />
```

**插件检测**:
- 扫描 `style={{ 属性: "hex 值" }}` 模式
- **只 warn,不自动修复**(避免改变语义)
- 输出建议:`Inline color style detected. Move color to CSS file or use CSS variable.`
- `failOnError` 不阻塞构建

**修改默认配置**:
```ts
const rules: HydrationRule[] = [
  // ...
  { id: 'H3', severity: 'warn', detector: detectH3 },  // 移除 fixer
  // ...
];
```

#### H4 Date/Number 本地化(v8 扩展检测范围)

> **v2 评审问题**:v6 文档只检测 `toLocaleString` 等方法调用,缺失 `Intl.DateTimeFormat` / `Intl.NumberFormat` 等现代 API。

**场景**:
```tsx
// ❌ 危险(本地化方法)
<span>{new Date().toLocaleString()}</span>
<span>{(12345.67).toLocaleString()}</span>

// ❌ 危险(Intl 对象)
<span>{new Intl.DateTimeFormat('en-US').format(new Date())}</span>
<span>{new Intl.NumberFormat('en-US').format(12345.67)}</span>
<span>{(12345.67).toLocaleString('en-US')}</span>
```

**正确做法**:
```tsx
// ✅ useState + useEffect 同步
const [date, setDate] = useState('');
useEffect(() => { setDate(new Date().toLocaleString()); }, []);
```

**插件检测**(v8 扩展):
- 扫描以下方法调用:
  - `toLocaleString` / `toLocaleDateString` / `toLocaleTimeString` / `toLocaleString(locale)`
  - `new Intl.DateTimeFormat`
  - `new Intl.NumberFormat`
- 输出 warn:`Hydration risk: locale-dependent method/constructor. Use useState + useEffect.`

**无法自动修复**。

#### H5 Conditional className 拼接

**场景**:
```tsx
// ❌ 条件 class 字符串拼接(SSR/CSR 拼接顺序不一致会导致字符串不同)
<div className={`base ${cond ? "active" : ""}`} />
```

**正确做法**:
```tsx
// ✅ clsx
import { clsx } from "~/utils/classes";
<div className={clsx("base", cond && "active")} />
```

**插件检测**:
- 扫描 `className={\`... \${... ? ... : ...}\`}` 模板字面量
- 输出 warn:`Hydration risk: conditional class. Use clsx() instead.`

#### H9 useState 初始化依赖外部变量

**场景**:
```tsx
// ❌ 危险
const [count, setCount] = useState(Math.random());
const [name, setName] = useState(initial);
```

**正确做法**:
```tsx
// ✅ 默认值 + useEffect 同步
const [count, setCount] = useState(0);
useEffect(() => { setCount(initial); }, [initial]);
```

**插件检测**:
- 扫描 `useState(<非字面量>)` 模式
- 输出 warn:`Hydration risk: useState initialized with non-literal. Use useState(literal) + useEffect to sync.`

#### H10 useEffect 副作用修改 DOM

**场景**:
```tsx
// ❌ useEffect 修改了 SSR 渲染的 DOM
useEffect(() => {
  document.title = `Page ${page}`;
}, [page]);
```

**这种行为通常没问题**(useEffect 在水合后运行),但如果修改的是关键 DOM 结构,可能引发问题。

**插件检测**:❌ 难以静态扫描(useEffect 内容未知)。

#### H11 JSX 字符串字面量含 Liquid 表达式(Dawn 兼容)

**场景**:
```tsx
// Dawn 兼容写法:JSX 字符串包含 Liquid 表达式
<div>
  {"{%- if section.settings.show_banner -%}"}
  <Banner />
  {"{%- endif -%}"}
</div>
```

**SSR 行为**:React 渲染这些字符串为文本节点,Liquid 引擎解析为实际控制流。

**风险**:React 客户端水合时,这些文本节点是字面量字符串(未解析的 Liquid),但 Shopify 已处理为真实元素。**潜在 mismatch**。

**正确做法**:用 `<RawLiquid>` / `<ImageTag>` 等组件,不要用 JSX 字符串。

**插件检测**:
- 扫描 JSX 中的字符串字面量,匹配 `{%` `{{` `{%-` `{{-` 等 Liquid 标记
- 输出 warn:`Liquid string in JSX: prefer <RawLiquid> or <ImageTag> components.`

### 6.5.4 插件实现方案

**新增文件**:`packages/vite-plugin-react-shopify/src/hydration-rules/index.ts`

**规则注册**:
```ts
type Severity = 'off' | 'warn' | 'error';

interface HydrationRule {
  id: string;                  // 'H1', 'H2', ...
  severity: Severity;
  detector: (ast: AST.Program) => Issue[];
  fixer?: (source: string, issues: Issue[]) => string;  // 可选自动修复
}

const rules: HydrationRule[] = [
  { id: 'H1', severity: 'warn', detector: detectH1, fixer: fixH1 },     // 已有
  { id: 'H2', severity: 'warn', detector: detectH2 },
  // v9 修正: H3 移除 fixer,降级为 warn(自动修复会改变 CSS 语义,评审 §3.2)
  { id: 'H3', severity: 'warn', detector: detectH3 },
  { id: 'H4', severity: 'warn', detector: detectH4 },
  { id: 'H5', severity: 'warn', detector: detectH5 },
  { id: 'H9', severity: 'warn', detector: detectH9 },
  { id: 'H11', severity: 'warn', detector: detectH11 },
];
```

**配置项**:
```ts
interface Options {
  ssg?: {
    hydration?: {
      rules?: Record<string, Severity>;  // 覆盖默认
      // 例: { H2: 'error', H9: 'off' }
      failOnError?: boolean;             // 任何 error 级别问题 fail 构建
    };
  };
}
```

**执行时机**:在 `compileAllEntries` 之后,但在 `writeFileSync` 之前。如果 `failOnError: true` 且有任何 error,throw 阻止写入。

**输出**:
```
[hydration] H2 (warn) frontend/sections/MainProduct.tsx:42
  Conditional render detected. Use 'hidden' attribute instead.
  > {showBanner && <Banner />}

[hydration] H3 (warn) frontend/sections/HeroBanner.tsx:18
  Inline color style detected. Move color to CSS file or use CSS variable.
  > style={{ backgroundColor: "#6c63ff" }}
  (no auto-fix)

Build failed: 1 hydration error(s) in 1 file(s)
```

### 6.5.5 分级处理

| 级别 | 行为 | 适用 |
|---|---|---|
| `off` | 不检测 | 已知忽略(legacy 代码) |
| `warn` | log.warn,继续构建 | 默认值,潜在风险 |
| `error` + `failOnError: false` | log.error,继续构建 | CI 报警但允许通过 |
| `error` + `failOnError: true` | throw 阻止构建 | CI 强制要求 |

**默认配置**:
- H1 (相邻文本):`warn`,自动修复
- H2 (条件渲染):`warn`,仅提示
- H3 (内联颜色):`warn`,**仅提示**(v9 修正,移除自动修复)
- H4 (locale 方法):`warn`,仅提示
- H5 (条件 class):`warn`,仅提示
- H9 (useState 外部):`warn`,仅提示
- H11 (JSX Liquid 字符串):`warn`,仅提示

**Dawn 迁移的特别考虑**:
- H11 在 Dawn 迁移中**会大量触发**(因为 Dawn 代码里有大量 `{% if %}` `{% for %}` 嵌在 JSX)
- 阶段 1-2 时应将 H11 设为 `off` 或 `warn`
- 阶段 3+ 逐步收紧

### 6.5.6 与现有 hydration-fix 的关系

| 模块 | 角色 | 触发 |
|---|---|---|
| `hydration-fix/index.ts`(现有) | **修复**类(H1 自动包裹) | `enforce: "pre"`,对所有 .tsx |
| `hydration-rules/index.ts`(新增) | **检测 + 分级**类(H1-H13) | `closeBundle` 阶段,基于 AST 扫描 |

**两者协同**:
- `hydration-fix` 在源码 transform 阶段修复 H1
- `hydration-rules` 在 SSG 完成后检测剩余 H2-H13
- H1 在两个模块都覆盖(检测+修复)

### 6.5.7 v7 新增规则 H13:React 19 自动 link preload(评审发现 6)

**场景**:
```tsx
<img srcSet="{{ image | image_url: width: 480 }} 480w" />
```

**实际 React 19 行为**(实证测试):
```html
<link rel="preload" as="image" imageSrcSet="{{ image | image_url: width: 480 }} 480w" />
<img srcSet="{{ image | image_url: width: 480 }} 480w" />
```

React 19 自动插入 `<link rel="preload">` 元素,即使 srcSet 包含 Liquid 表达式。这会**影响 SSR HTML 的结构**(添加意外元素),水合时 React 树与 DOM 可能有元素数量差异。

**检测规则**:
- 扫描 `<img>` 元素的 `srcSet` 属性
- 检测 React 19 引入 `<link rel="preload">` 后的额外元素
- 输出 warn:`React 19 may auto-inject <link rel="preload"> for <img> with srcSet. This could cause hydration mismatch.`

**建议的规避**:
- 避免在 `<img>` 上使用 srcSet(只使用 src)
- 改用 React 18(项目已 React 19,不可行)
- 改用 `<picture>` + `<source>` 元素(可控)

**v7 ImageTag 设计已规避此问题**(见 §2.1) — 不支持 srcSet,只用 src。

### 6.5.8 局限性诚实说明

**插件无法保证的**:
- **H4 Date/Number 本地化**:取决于执行环境(服务器 vs 浏览器),插件只能提醒,不能修复
- **H10 useEffect DOM 修改**:静态分析无法预测运行时行为
- **业务逻辑条件**:插件不知道 `cond` 在 SSR 时是 true 还是 false,只知道"有条件渲染"
- **三方库副作用**:外部 hook(如 redux、zustand)的 hydration 行为插件无法控制

**插件能做的**:
- **静态语法扫描**:识别潜在风险模式
- **自动修复**:对可推导的修复(如 H1, H3)自动应用
- **构建时阻塞**:`failOnError` 阻止有问题的代码上线
- **详细文档**:每条规则附带示例代码和推荐做法

**最终用户责任**:
- 业务逻辑层面的 hydration 安全(条件渲染、动态数据)
- 测试覆盖:Dawn 与 React 版本的浏览器渲染对比

---

## 7. 风险汇总(v3.0 修订)

| 风险 | 等级 | 影响 hook/组件 | 缓解 |
|---|---|---|---|
| **水合时 DOM 与 React 树结构不匹配** | 🟢 **SOLVED** | `<Island>`, `<ShopifyImage>` | **v3.0 已解决**:Island 模式 + sentinel 替换;useForm/usePaginate 阶段 1 不实现 |
| ~~Block JSON bridge 嵌套与命名冲突~~ | ~~🟠 MED-HIGH~~ | ~~useBlockLoop~~ | **✅ DONE**:v2 改用 `<BlockSlot>`,v3.0 已实施 |
| CSS Modules 类名 SSR/CSR 不同步 | 🟡 MED | (任何用 .module.css 的组件) | 阶段 1 禁止 CSS Modules |
| `{% form %}` 包裹 children 的根本困难 | 🔴 HIGH | useForm | **v8 决策**:阶段 1 不实现;阶段 2-3 useLiquidBlock;阶段 4+ 重写 |
| `{% paginate %}` SSR 数据不可用 | 🔴 HIGH | usePaginate | **v8 决策**:阶段 1 不实现;分页完全由 Liquid 处理 |
| **React 19 自动插入 `<link rel="preload">`** | 🟢 **SOLVED** | `<ShopifyImage>` | **v3.0 已解决**:Island 不渲染 JSX `<img>`,React 19 无 preload 触发点 |
| Pluralization 翻译 | 🟡 MED | useT (i18n) | 字典查找时支持 `key.other` / `key.one` 后缀 |
| i18n 文件体积 | 🟢 LOW | useT | 初始 locale 内联,其他按需加载 |
| 唯一性 id 冲突 | 🟢 LOW | `<ImageTag>`, `<BlockSlot>` 等 | v5 新增 `useUniqueId` hook(已被 v8 ImageTag 重设计取代) |
| 客户端 useEffect 修改 DOM 引发的水合不一致 | 🟡 MED | 复杂组件 | 文档 + lint 提示;无法自动修复 |
| `bridge` 数据错位 | 🟢 LOW | (无 useBlockLoop) | bridge 不分层 |
| **水合 mismatch 风险(H1-H13)** | 🟠 MED-HIGH | **所有 React 组件** | hydration-rules 模块,H13 检测 `<img>` 是否缺 `loading="lazy"` |
| **HTML 属性中引号被转义** | 🟡 MED | useAsset, useFontFace 等 | **v8 加强**:避免在属性中放任何含 `'` 或 `"` 的字符串字面量(驳回 1 反证:单引号也会被转 `&#x27;`) |
| v1-v7 `<ImageTag>` 设计的根本错误 | 🟢 **SOLVED** | (历史文档) | **v3.0 已解决**:`<ShopifyImage>` + Island 替代所有占位方案 |
| v1-v4 `<!--` HTML 注释占位 | 🟢 **SOLVED** | useLiquidCode | **v3.0 已解决**:**不再使用占位符**,useLiquidCode 注入到 wrapper 外部 |

---

## 8. 实施状态 (v3.0)

| API | 状态 | 路径 |
|-----|------|------|
| `useLiquid` | ✅ DONE | `runtime/useLiquid.ts` |
| `useLiquidCode` | ✅ DONE | `runtime/useLiquid.ts` |
| `<Island>` | ✅ DONE | `runtime/Island.tsx` |
| `<BlockSlot>` | ✅ DONE | `runtime/BlockSlot.tsx` |
| `<ShopifyImage>` | ✅ DONE | `runtime/ShopifyImage.tsx` |
| `<ShopifyVideo>` | ✅ DONE | `runtime/ShopifyVideo.tsx` |
| `LiquidDataProvider` | ✅ DONE | `runtime/provider.ts` |
| `buildLiquidBridge` | ✅ DONE | `runtime/bridge.ts` |
| **i18n 系统** | 🟡 TODO | `useT` / `useLocale` / `LocaleProvider` + locale 生成 |
| **`<StaticBlock>`** | 🟡 TODO | 静态 block 注入组件 |
| **hydration-rules H2-H13** | 🟡 TODO | 检测器扩展 |

**已移除(不进插件)**:
| API | 替代方案 |
|-----|---------|
| `useSectionSettings` / `useBlockSettings` / `useThemeSettings` / `useLiquidValue` | `useLiquid(path)` |
| `useRawLiquid` | `useLiquidCode(code)` |
| `useImageUrl` / `useAsset` / `useFontFace` / `usePlaceholderSvg` | `useLiquidCode` + 完整表达式 |
| `useImageBehavior` / `useColorScheme` / `useBlockType` | 纯 JS,用户空间 `frontend/utils/` |
| `useShopifyAttributes` / `useBlockLoop` / `useBlockContext` / `useBlockRouter` / `useUniqueId` | 无需/已内部化
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

## 10. 待实施项

| 优先级 | 项目 | 说明 |
|--------|------|------|
| **P0** | `<StaticBlock>` 组件 | 静态 block 注入,语义类似 `<BlockSlot>` 但指定 type/id/data |
| **P1** | i18n 系统 | `LocaleProvider` + `useT` + `useLocale` + 插件 locale 生成(见 §5) |
| **P2** | hydration-rules H2-H13 | 扩展现有 H1 自动修复,新增条件渲染/内联颜色/Date本地化等检测 |
| **已实施** | 核心原语 + 媒体组件 + BlockSlot | 见 §8 状态表 |
