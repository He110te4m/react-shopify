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

部分组件需要在 React 树中"占一个位置",在 SSR 结束后被替换为真实 Liquid 代码。设计:

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
  React 树中 <!--RAW-LIQUID-0--> 渲染为 <span hidden data-raw-liquid-id="0"></span>
  水合时,占位 span 是空 div,DOM 树结构对齐(无 hydration mismatch)
  真实 Liquid 在服务端已被 Shopify 求值,水合后 span 仍在但内容已渲染
```

### 0.3 JSON Bridge:统一数据流,不分层

> **v5 修正(用户反馈)**:v1-v4 把 bridge 分为"Section 级 / Block 级 / Snippet 级"。**这是错误的过度设计**。Bridge 本质是"Liquid 表达式 → 客户端 React state"的反向序列化通道,与 React 树的 Section/Block 划分**无关**。
>
> 一个 bridge 一份 map,key 是完整表达式字符串(包含 `block.settings.X` 等),value 是 Liquid 求值后的结果。Shopify 在 SSR 阶段会按上下文自动解析 `block.settings.X` 为当前 block 的值,React 端通过 `useBlockSettings("X")` 自动从当前 React tree 节点获取。

**修正后的统一数据流**:

```
SSR 阶段:
  1. 渲染 React 树,跟踪所有 useLiquidValue / useSectionSettings / useBlockSettings 调用
  2. 收集到的所有表达式,加入单次渲染的 __shopify_ssg_liquid_track: Set<string>
  3. 渲染完成后,把这些表达式输出到单个 <script type="application/json" data-ssg-liquid>
  4. 整个 .liquid 文件中,这个 bridge 出现一次

Shopify SSR 阶段(在 .liquid 渲染时):
  - 解析 {{ expr }} 时,按当前 Liquid 上下文(section / block / snippet)求值
  - block.settings.X 自动指向当前 for-loop 块

客户端 hydration:
  - LiquidDataProvider 注入 bridge 数据
  - useLiquidValue / useBlockSettings 等 hook 从 React tree 当前位置读值
  - 当前 React tree 节点 = 当前 block(由 Shopify 的 {% content_for 'blocks' %} 决定)
```

**为什么不需要 block 独立的 bridge**:
- Shopify 的 `{% for block in section.blocks %}` 在 `{{ block.settings.X }}` 求值时,**Liquid 引擎自动按当前 for-loop 迭代上下文解析**,不需要额外的命名空间
- 客户端 React 也按 React tree 的位置自动路由到正确的 block
- 唯一需要的是:**每个 block 是独立的 React entry**(由 `<BlockSlot>` + 独立 entry 实现),每个 entry 渲染自己**局部**的 JSON bridge

**结论**:bridge 不分层,每 entry 一个 bridge,内部 key 用完整表达式字符串(包含 `block.settings.X`)。

**v1-v4 "Section/Block 分层" 是错误设计**:
- 多余的层级概念增加理解成本
- 实际上 Shopify 引擎 + React tree 自然处理了"作用域"
- v5 起文档统一使用"entry 级 bridge" 概念,一个 entry(section / block / snippet)对应一个 bridge

### 0.4 ID 生成:内部化,不暴露(v6 重写,统一论证)

> **v6 修正(用户反馈 v5)**:v5 文档中 §0.4 / §0.5 / §2.1.1 三处对 useId vs uuid vs 自增计数器 的论证**互相矛盾**(一会说用 uuid,一会说不用 uuid,一会说不能用 useId,一会又分析 useId 适用场景)。这里给出**单一连贯**的决策。

**核心事实**:**占位符 id 不进入最终产物**。
- SSR 阶段:`<ImageTag>` 渲染为 `<span data-img-id="img-1" hidden>`
- SSR 后处理:`<span data-img-id="img-1" hidden>` 被替换为完整的 `<img src="...">` 标签
- 客户端水合:占位符已不存在,`<ImageTag>` 组件返回 null,React 不需要这个 id
- **最终 HTML 中,这个 id 从未出现过**

**这个事实的推论**:
- ❌ **不需要 server/client 稳定 id** — 客户端永远不读它
- ❌ **不需要跨进程全局唯一** — 每次 SSR 是一次性渲染
- ❌ **不需要 HTML 属性安全的格式** — 它不进 DOM 属性
- ❌ **不需要跨渲染稳定** — 占位符临时,被替换后消失
- ✅ **只需要**:单次 SSR 渲染内唯一,够区分多个组件

**候选方案对比**:

| 方案 | 满足需求? | 代价 | 评价 |
|---|---|---|---|
| **自增计数器** | ✅ | 5 行代码,0 KB | 满足所有要求,**最简单** |
| `React.useId()` | ✅ | 0 行(React 自带) | 满足,但它提供的"server/client 稳定"特性对我们是**浪费** |
| `uuid` npm 包 | ✅ | 3 KB gzipped,1 个依赖 | 满足,但提供"全局唯一"是**过度设计** |
| 注释占位 `<!--IMG-N-->` | ✅ | 0 行 | 满足,但 HTML 注释解析不如 data-attr 稳定(已被 v5 放弃) |

**决策**:**自增计数器**(5 行实现,无依赖)。
- 用户反馈"自增 id 在 React tree 多次渲染时可能冲突" — **不会**。我们在 `useRef` 内缓存,组件重渲染不重新生成;SSR 进程内单调递增,无冲突可能
- "不引入外部依赖" — 0 KB 体积,符合 Dawn 迁移期"压体积"原则
- "5 行实现,可读可改" — 不需要 uuid 的全局唯一(跨进程)能力,因为占位符不进最终产物

**对比 v5 矛盾**:

| v5 错误表述 | v6 修正 |
|---|---|
| "uuid v4 的字符串简单清晰" → 暗示用 uuid | **不**用 uuid,因为自增计数器已经够用 |
| "React.useId() 含 `:`" | `:` 没问题(不进 DOM),但 useId 的 server/client 稳定特性对我们是浪费 |
| "uuid 引入 3KB" → 不该用 | 不该用,**但理由是"过度设计"**而不是"3KB 太大"(对比自增计数器才有"过度"概念) |

**§0.5 旧版"React.useId() 适用场景"分析**:**保留作为知识背景**(`useId()` 真正适用场景是 `<label htmlFor>`/`<input id>` 等需要 server/client 稳定 id 的场景),但**已不属于本节**——本节只讲"占位符 id 怎么生成"。

**§2.1.1 旧版"为什么不用 useId"**:**删除**。既然 v6 决策是"自增计数器",对比对象是"uuid 是不是过度",而不是"useId 是不是合适"。

**实现** (5 行,无外部依赖):

```ts
// frontend/utils/use-unique-id.ts
let counter = 0;
export function useUniqueId(prefix: string = 'u'): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    counter = (counter + 1) & 0xffffffff;
    ref.current = `${prefix}-${counter.toString(36)}`;
  }
  return ref.current;
}
```

**主题开发者使用**(完全不感知):
```tsx
<ImageTag image={image} width={3840} />
```

**客户端 vs 服务端 id 一致性保证**:
- **不需要保证**。占位符是临时的,被替换后消失
- React 在客户端渲染 `<ImageTag>` 时直接返回 null,完全不依赖占位符的 id

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

## 1. 关键评审反馈评估(v7,基于实证测试)

> 来源:`docs/2026-06-03-plugin-api-review.md`(v2,852 行)+ `docs/2026-06-03-plugin-api-review.test.cjs`(21 个测试)
>
> **方法学重要说明**:运行 `node docs/2026-06-03-plugin-api-review.test.cjs` 显示 21/21 通过,但其中 **5 个测试是 `assert(true, "...")` 形式** — 这些**永远通过,无论实际行为如何**。本节严格区分"测试真实证明"与"评审者基于文档的推断"。

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

> **v8 关键修正**:`docs/2026-06-03-plugin-api-rebuttal-verify.cjs` 的驳回验证测试**反证了我的驳回**。
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

## 2. A 类 — 简单值 Hook(🟢 HIGH 可行性)

> 这些 hook 在 SSR 时返回 `{{ expr }}` 字符串并跟踪,在客户端从 context 读值。**与现有 `useLiquidValue` 行为一致,只需新增参数或命名。**
>
> ⚠️ **重要约束**:返回字符串的 hook 只能用于以下场景:
> - 作为元素 attribute 值(字符串本身)
> - 作为文本子节点,且文本本身就是 Liquid 表达式(SSR 后被 Liquid 替换)
> - **不**能用于产生 HTML 元素碎片的场景(那会破坏水合)

### 2.1 ~~`useImageTag`~~ → `<ImageTag>` 组件(A' 类,**v8 彻底重设计**)

**v1-v7 设计历史**(从错误到修正):
- v1:返回字符串 → hydration mismatch
- v2-v4:组件 + 标记替换(注释)
- v5-v6:`<span data-img-id>` 占位 + CSR null(评审发现 2 证实不可行)
- **v7**:放弃占位,渲染真实 `<img>` 元素 + Liquid 表达式属性(驳回验证测试**进一步发现问题**)
- **v8(当前)**:v7 进一步修正 — **必须默认 `loading="lazy"`**

**v7 → v8 关键修正**(基于驳回验证测试 驳回 3):

驳回验证测试(`rebuttal-verify.cjs`)对 React 19 自动 `<link rel="preload">` 触发条件做了精确测试:

| 输入 | preload 触发? |
|---|---|
| `<img src="...">` (极简) | ✓ **触发** |
| `<img src="..." loading="lazy">` | ✗ **不触发** |
| `<img src="..." className="x">` | ✓ 触发 |
| `<img alt="">` 无 src | ✗ 不触发 |
| `<picture><source srcSet><img src>` | ✗ **不触发** |
| `<img src="{{ ... }}">` (Liquid) | ✓ 触发 |

**关键发现**:
- ❌ **不是 srcSet 触发**(我之前驳回 3 的部分依据是错的)
- ❌ **不是 className 触发**(任意额外属性都触发)
- ✅ **"无 `loading='lazy'`" 是触发条件** — React 19 把没明确 lazy 的 img 视为 LCP 候选,自动预加载
- ✅ `<picture>` 包裹也避免 preload

**v8 设计 — 默认 `loading="lazy"`,移除 `fetchPriority`**:

```ts
interface ImageTagProps {
  image: string;             // Liquid 表达式,如 "section.settings.image"
  width?: number;            // image_url 宽度(默认 3840)
  alt?: string;
  className?: string;
  loading?: 'lazy' | 'eager'; // 默认 'lazy'(避免 React 19 自动 preload)
  asPlaceholder?: string;    // 当 image 为空时,显示的 placeholder svg 名
  // ❌ 不再支持:srcSet, sizes, widths, fetchPriority
  //   fetchPriority 与 loading 互斥
}
function ImageTag(props: ImageTagProps): JSX.Element;
```

**SSR 行为**(v8):
```tsx
function ImageTag({
  image,
  width = 3840,
  alt,
  className,
  loading = 'lazy',  // ★ 默认 lazy(避免 React 19 preload)
  asPlaceholder,
}: ImageTagProps) {
  if (typeof document === "undefined") {
    return (
      <img
        src={`{{ ${image} | image_url: width: ${width} }}`}
        alt={alt ?? ""}
        className={className}
        loading={loading}
      />
    );
  }

  // CSR
  const [resolvedSrc] = useLiquidValue(`${image} | image_url: width: ${width}`);
  return (
    <img
      src={resolvedSrc}
      alt={alt ?? ""}
      className={className}
      loading={loading}
    />
  );
}
```

**SSR 输出**(默认 loading='lazy'):
```html
<img src="{{ section.settings.image | image_url: width: 3840 }}"
     alt="..." class="banner__image" loading="lazy" />
```

**Shopify 处理后**:
```html
<img src="https://cdn.shopify.com/.../banner.jpg?width=3840"
     alt="..." class="banner__image" loading="lazy" />
```

**客户端 React 树** + **水合**: 元素结构完全一致,`src` 从 bridge 解析。

**v8 方案的代价(必须接受)**:
- ❌ 失去 `image_tag` filter 自动计算 srcset/sizes/width/height 的能力
- ❌ 失去 `fetchPriority` 精细控制(改由 `loading` 间接控制)
- ⚠️ Dawn 中 `image_tag` 输出包含大量属性(width, height, srcset, sizes),React 端要手写
- ⚠️ Dawn 现有 image 类名需要手动传入

**LCP 关键图(必须 `eager` 的图)的降级方案**:

如一张图是页面的 LCP 关键图(如 hero banner),需要 `loading="eager"` + `fetchPriority="high"` 以提升 LCP 分数。**这种情况 React 19 会插入 preload link**。

**降级方案 A:用 `<picture>` 包裹**(测试证实有效,推荐):
```tsx
function HeroImage(props) {
  return (
    <picture>
      <source srcSet={`{{ ${props.image} | image_url: width: 800 }} 800w`} />
      <img src={`{{ ${props.image} | image_url: width: 3840 }}`}} loading="eager" />
    </picture>
  );
}
```
测试证实 `<picture>` 包裹的 `<img>` **不触发 React 19 自动 preload**。

**降级方案 B:`useLiquidBlock` 模式**(彻底规避,最保守):
```tsx
function HeroImage(props) {
  // 客户端 React 树中不渲染 <img>,完全由 Liquid 注入
  useLiquidBlock(`<img src="{{ ${props.image} | image_url: width: 3840 }}" loading="eager" fetchpriority="high" alt="${props.alt ?? ''}" />`);
  return null;
}
```
- `<img>` 完全在 `data-ssg-hydrate` div **之外**(由 useLiquidBlock 注入)
- 不参与 React hydration(无 mismatch 风险)
- 失去 client-side state 管理(如交互式图片)
- 适用于纯展示的 LCP 关键图

**默认行为**:`loading="eager"` 图用 `useLiquidBlock` 模式;`loading="lazy"` 图用 `<ImageTag>` 组件。

**跟踪的表达式**:
- `image` (基础)
- `image | image_url: width: W` (实际 src 计算)
- 全部加入 JSON bridge

**v8 方案待验证项**(待 P0 阶段实施时实际测试):
- [ ] React 19 对 `<img src={{...}} loading="lazy">` 不插入 preload(已通过驳回验证测试 C 证实)
- [ ] alt 为空时的 hydration(空字符串 vs undefined)
- [ ] asPlaceholder fallback 路径
- [ ] 多图同位置 id 唯一性
- [ ] `<picture>` 包裹的实际 hydration 行为

**风险评估**:
- 🟢 **理论上安全**:`loading="lazy"` 默认值 + 不支持 srcSet 规避 React 19 preload
- 🟡 **MEDIUM**:LCP 关键图需降级方案,增加复杂度
- 🟡 **MEDIUM**:`<picture>` 包裹的实际 hydration 行为需测试

**可行性结论**:🟡 MEDIUM,**优先实施并测试**。

### 2.1.1 `useUniqueId(prefix?)` 内部 hook

**签名**:
```ts
function useUniqueId(prefix?: string): string;
```

**实现**:
```ts
// frontend/utils/use-unique-id.ts
let counter = 0;

export function useUniqueId(prefix: string = 'u'): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    counter = (counter + 1) & 0xffffffff;
    ref.current = `${prefix}-${counter.toString(36)}`;
  }
  return ref.current;
}
```

**为什么选自增计数器**(完整论证见 §0.4):
- 占位符 id 不进入最终产物(SSR 后处理替换),不需要 server/client 稳定 / 跨进程唯一 / HTML 安全的特性
- 自增计数器 5 行代码,无外部依赖
- `useRef` 缓存保证组件重渲染不重复生成
- 单次 SSR 进程内单调递增,无冲突可能

**风险**:
- 🟢 LOW:实现简单,无外部依赖
- 🟡 **MEDIUM**:Dawn 中 `image_tag` 的可选参数较多(width, height, sizes, widths, fetchPriority, loading, alt, class),组件 API 需完整覆盖

**可行性结论**:🟡 MEDIUM,实现可控,但需要细致测试水合一致性。

**与 Dawn 行为的兼容性**:
- Dawn 输出的 `<img>` 标签结构(包含 fetchPriority, sizes, widths)与本组件的 props 一一对应
- **JSX 属性拼写**:React JSX 中是 `fetchPriority` (camelCase),映射到 HTML 的 `fetchpriority` (lowercase)。组件 API 保持 camelCase
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

### 3.1 ~~`useRawLiquid(code)`~~ — **v7 降级为 `useLiquidBlock` 别名**(🟡 MEDIUM)

**v7 重新设计**(基于评审者发现 1+2):

**v1-v4 失败原因**(评审者发现 1):
- HTML 注释 `<!--` 被 `renderToStaticMarkup` 转义为 `&lt;!--`
- 后处理扫描不到原模式

**v5-v6 失败原因**(评审者发现 2 + §0.2):
- 改用 `<span hidden>` 占位
- CSR 返回 null
- 仍然 hydration mismatch(span/字符串 vs 真实 Liquid 元素)

**v7 决策**:**完全放弃 React 树中占位**,改用**全局收集机制**(类似现有 `useLiquidBlock`)。

**签名**(v7,与现有 `useLiquidBlock` 等价):
```ts
// useRawLiquid 是 useLiquidBlock 的别名(不增加新概念)
function useRawLiquid(code: string): void;
```

**SSR 行为**:
- 收集到全局 `__shopify_ssg_liquid_blocks` 数组(已存在)
- 跟踪 `code` 中的 `{{ ... }}` 表达式
- **不返回任何内容**(`void`)

**CSR 行为**:
- no-op

**渲染器侧**:
- 复用现有 `useLiquidBlock` 机制
- 收集的代码注入到 `data-ssg-hydrate` div **之前**(已实现)

**v7 的限制**:
- ❌ **不能在 React 树中"包裹" children**(已确认)
- ❌ 注入位置固定在 `data-ssg-hydrate` div 之前,不能在中间插入
- ✅ 适合"独立插入 Liquid 代码片段"场景(如 `{{ schema }}`, `{% style %}` 等)

**典型用例**:
```tsx
// 阶段 1-2 场景:独立插入
function MySection() {
  useRawLiquid('{% style %}.section-padding { ... }{% endstyle %}');
  return <section>...</section>;
}
```

**为 `useForm` 留路**:
- `{% form %}` 需要**包裹** children,这是不同的问题(见 §3.2)
- 阶段 1 不解决 form 包裹问题,降级为不实现
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
| H3 | 内联颜色 hex → rgb 转换 | `<div style={{ backgroundColor: "#fff" }} />` | 🟡 常见 | ⚠️ 自动改为 CSS 变量 | ✅ 可识别 |
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

#### H3 内联颜色 hex 转换

**场景**:
```tsx
// ❌ 浏览器把 hex 规范化为 rgb
<div style={{ backgroundColor: "#6c63ff" }} />
// SSR: style="background-color:#6c63ff"
// 客户端: style="background-color:rgb(108, 99, 255)" → mismatch
```

**正确做法**:
```tsx
// ✅ 用 CSS 变量
<div style={{ "--accent": "#6c63ff" } as React.CSSProperties} />
```
```css
.elem { background-color: var(--accent, #6c63ff); }
```

**插件自动修复**:
- 检测 `style={{ backgroundColor: "..." }}`(其他颜色属性同理)
- 自动改为 `style={{ "--color-name": "..." } as React.CSSProperties }`
- 转换名规则:`backgroundColor` → `--bg-color`,`color` → `--text-color`,等
- 输出 warn 让开发者确认转换是否合理

#### H4 Date/Number 本地化

**场景**:
```tsx
// ❌ 危险
<span>{new Date().toLocaleString()}</span>
<span>{(12345.67).toLocaleString()}</span>
```

**正确做法**:
```tsx
// ✅ useState + useEffect 同步
const [date, setDate] = useState('');
useEffect(() => { setDate(new Date().toLocaleString()); }, []);
```

**插件检测**:
- 扫描 `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString` 调用
- 输出 warn:`Hydration risk: locale-dependent method. Use useState + useEffect.`

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
  { id: 'H3', severity: 'error', detector: detectH3, fixer: fixH3 },
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

[hydration] H3 (error) frontend/sections/HeroBanner.tsx:18
  Inline color style detected. Auto-fixed to CSS variable.
  > style={{ backgroundColor: "#6c63ff" }}
  ↓
  > style={{ "--bg-color": "#6c63ff" } as React.CSSProperties}

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
- H3 (内联颜色):`error`,自动修复为 CSS 变量
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

## 7. 风险汇总(v8 修订,基于驳回验证测试)

| 风险 | 等级 | 影响 hook/组件 | 缓解 |
|---|---|---|---|
| **水合时 DOM 与 React 树结构不匹配** | 🔴 **HIGH** | `<ImageTag>`, useForm, usePaginate | **v8 修正**:`<ImageTag>` 渲染真实 `<img>` + `loading="lazy"` 默认;useForm/usePaginate 阶段 1 不实现 |
| ~~Block JSON bridge 嵌套与命名冲突~~ | ~~🟠 MED-HIGH~~ | ~~useBlockLoop~~ | **已解决**:v2 改用 `<BlockSlot>` |
| CSS Modules 类名 SSR/CSR 不同步 | 🟡 MED | (任何用 .module.css 的组件) | 阶段 1 禁止 CSS Modules |
| `{% form %}` 包裹 children 的根本困难 | 🔴 HIGH | useForm | **v8 决策**:阶段 1 不实现;阶段 2-3 useLiquidBlock;阶段 4+ 重写 |
| `{% paginate %}` SSR 数据不可用 | 🔴 HIGH | usePaginate | **v8 决策**:阶段 1 不实现;分页完全由 Liquid 处理 |
| **React 19 自动插入 `<link rel="preload">`** | 🔴 **HIGH** | **任何 `<img>` 元素** | **v8 修正**:`<ImageTag>` **默认 `loading="lazy"`**;LCP 关键图用 `<picture>` 包裹或 `useLiquidBlock` 模式;**新增 H13 规则检测** |
| Pluralization 翻译 | 🟡 MED | useT (i18n) | 字典查找时支持 `key.other` / `key.one` 后缀 |
| i18n 文件体积 | 🟢 LOW | useT | 初始 locale 内联,其他按需加载 |
| 唯一性 id 冲突 | 🟢 LOW | `<ImageTag>`, `<BlockSlot>` 等 | v5 新增 `useUniqueId` hook(已被 v8 ImageTag 重设计取代) |
| 客户端 useEffect 修改 DOM 引发的水合不一致 | 🟡 MED | 复杂组件 | 文档 + lint 提示;无法自动修复 |
| `bridge` 数据错位 | 🟢 LOW | (无 useBlockLoop) | bridge 不分层 |
| **水合 mismatch 风险(H1-H13)** | 🟠 MED-HIGH | **所有 React 组件** | hydration-rules 模块,H13 检测 `<img>` 是否缺 `loading="lazy"` |
| **HTML 属性中引号被转义** | 🟡 MED | useAsset, useFontFace 等 | **v8 加强**:避免在属性中放任何含 `'` 或 `"` 的字符串字面量(驳回 1 反证:单引号也会被转 `&#x27;`) |
| v1-v7 `<ImageTag>` 设计的根本错误 | 🔴 HIGH | (v5-v7 文档) | **v8 彻底重设计**:不再占位替换,渲染真实 `<img>`,默认 `loading="lazy"` |
| v1-v4 `<!--` HTML 注释占位 | 🟡 MED | useRawLiquid | v7 修正:useRawLiquid 改回 useLiquidBlock 别名 |

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
