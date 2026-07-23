# React-first Shopify 编译器 v1 方案设计

## 1. 文档状态

- 日期：2026-07-23
- 状态：讨论稿，不进入实现
- 关联体检报告：[2026-07-23-react-liquid-ssg-health-check.md](./2026-07-23-react-liquid-ssg-health-check.md)

本方案基于已确认的范围：

- v1 只支持 React。
- 业务组件中不出现 Liquid 语法。
- Liquid 由编译器作为后端文本格式生成。
- `frontend/snippets` 是显式 Snippet 提取边界。
- 同时支持 SSR、SSR + hydration、client-only。
- page/template JSON、Vue、非 Shopify 输出暂不进入 v1。

## 2. 核心判断

这不是“React SSR 后把字符串替换成 Liquid”的问题，而是一个小型跨平台编译器问题：

```text
React/TypeScript source
        │
        ├─ Schema / Props contract
        ├─ Liquid expression IR
        ├─ React render tree
        └─ Render mode
              │
              ├─ Shopify target：Liquid + JSON bridge + assets
              └─ Browser target：真实值 + React hydration/client mount
```

ORM 类比成立，但需要同时具备两个执行器：

1. **SSG/Liquid emitter**：把表达式树和控制节点输出为 Liquid。
2. **Browser evaluator**：把同一份 contract 使用 bridge 数据执行为 JavaScript/React。

普通 JavaScript 控制流不能直接承载未知的 Shopify 值。以下代码在 SSG 阶段会提前执行错误：

```tsx
if (settings.visible) {
  return <Banner />;
}
```

v1 应使用可被双端解释的控制节点：

```tsx
return when(settings.visible, () => <Banner />);
```

## 3. 分层设计

### 3.1 Source layer

开发者主要书写：

- React Component；
- TypeScript props；
- schema builder；
- typed Shopify expressions；
- `when`、`each`、`render` 等控制函数；
- React state、事件和 client-only 逻辑。

开发者不直接书写：

- `{{ ... }}`；
- `{% if %}`、`{% for %}`、`{% render %}`；
- `section.settings.*`、`block.settings.*` 字符串路径；
- JSON bridge 脚本。

### 3.2 Contract layer

Contract 是所有跨边界数据的来源，包括：

- Section/Block settings；
- Snippet props；
- 默认值和类型；
- 可序列化能力；
- schema metadata；
- bridge key 和 Liquid expression。

Contract 必须同时服务：

```text
schema JSON
Liquid emitter
SSR renderer
browser bridge
TypeScript inference
validator
```

### 3.3 IR layer

建议定义不可变、可序列化的表达式节点，而不是保留 Liquid 字符串：

```ts
type Expr<T> =
  | LiteralExpr<T>
  | PathExpr<T>
  | FilterExpr<T>
  | BinaryExpr<T>
  | LogicalExpr<T>
  | PropertyExpr<T>;

type RenderNode =
  | TextNode
  | ElementNode
  | WhenNode
  | EachNode
  | RenderSnippetNode
  | IslandNode
  | ClientOnlyNode;
```

IR 不能依赖 React，也不能依赖 Shopify 字符串拼接。这样后续才有机会拆出：

```text
core package
  ├─ contracts
  ├─ expression IR
  ├─ render modes
  └─ validation

shopify package
  ├─ Liquid emitter
  ├─ Shopify schema emitter
  ├─ bridge emitter
  └─ Shopify runtime

future vue package
  └─ Vue adapter
```

## 4. Props 与数据传递模型

这是本方案最重要的边界。React props、Liquid named arguments、Section settings、JSON bridge 和 client-only props 不能当作同一种东西。

### 4.1 传递类型对照

| 来源/目标 | 可以传递 | 不应传递 | 编译策略 |
| --- | --- | --- | --- |
| React Component → React Component | 任意 JSX/JS 值、children、callback、context | 无强制限制 | 普通 React import |
| Section settings → Component | `Expr<T>` / 浏览器真实值 | callback、ReactNode | contract + bridge |
| Snippet caller → Snippet | literal、Shopify expression、可序列化对象 | callback、ref、ReactNode、客户端 state | Liquid named arguments |
| SSR Component → Browser hydration | 可被 JSON bridge 表达的值 | 函数、类实例、DOM 引用 | canonical bridge key |
| Client-only → Browser | 任意运行时 JS 值、callback、state | 无需 Liquid 传递 | client mount |
| Island → React | Liquid 生成的 HTML 字符串 | Island 内部 React ownership | capture + frozen subtree |

### 4.2 传参的四种模式

#### Literal

```tsx
<ProductCard size="small" />
```

可以直接编译为固定参数或直接内联。

#### Shopify expression

```tsx
<ProductCard product={section.product} />
```

Snippet 调用时生成 Liquid named argument；浏览器 hydration 时通过同一个 canonical key 读取真实值。

#### React value

```tsx
<ProductCard product={selectedProduct} />
```

如果 `selectedProduct` 来自 client state，不能进入 SSR Snippet 参数。组件必须保持 React inline 或处于 client-only boundary。

#### Children / callback

```tsx
<ProductCard onSelect={onSelect}>...</ProductCard>
```

这类值不能直接跨 Liquid Snippet 边界。v1 默认禁止作为 Snippet props；需要 children 时先保持源码级 React Component 复用。

### 4.3 一个 contract、一个 props hook

建议不要让组件逐个调用 `useLiquid`，而是让 contract 提供一个聚合读取方法：

```tsx
const hero = defineSection({
  settings: {
    title: textSetting({ label: "Title", default: "Hello" }),
    image: imageSetting({ label: "Image" }),
    visible: checkboxSetting({ label: "Visible", default: true }),
  },
});

export default function Hero() {
  const props = hero.useProps();

  return when(props.visible, () => (
    <section>
      <h1>{props.title}</h1>
      <ShopifyImage image={props.image} />
    </section>
  ));
}
```

`hero.useProps()` 的返回值在不同阶段具有同一语义：

```text
SSG       → Expr<T> / Liquid placeholder
Shopify   → Liquid 实际值
Browser   → bridge 中的 T
```

类型系统可以对外暴露统一的 `ShopifyValue<T>`，避免开发者感知底层阶段差异。

## 5. Schema builder 与 validator

### 5.1 Builder 目标

`textSetting`、`imageSetting` 等函数不只是 JSON shorthand，应返回带 metadata 的 descriptor：

```ts
type SettingDescriptor<T, Kind extends string> = {
  kind: Kind;
  id?: string;
  schema: ShopifySettingSchema;
  defaultValue?: T;
  ref: SettingRef<T>;
};
```

对象 key 默认推导 setting ID，减少重复声明：

```tsx
settings: {
  title: textSetting({ label: "Title" }),
}
```

等价于：

```json
{
  "id": "title",
  "type": "text",
  "label": "Title"
}
```

### 5.2 Validator 分层

必须保留独立、可直接单测的 validator：

1. **Setting validator**：字段类型、default、options、范围。
2. **Contract validator**：ID 冲突、引用存在、props 类型可序列化。
3. **Shopify target validator**：section/block 允许字段、tag、preset、scope。
4. **Render validator**：SSR、Snippet、client-only 是否使用了不允许的值。
5. **Output validator**：Liquid/JSON/schema/HTML 语法和输出路径。

Builder 负责让正确写法简单；validator 负责让错误写法尽早失败。

## 6. Component → Snippet

### 6.1 v1 边界

`frontend/snippets` 是显式提取边界：

```text
frontend/components/Button.tsx
  → 普通 React Component，源码复用

frontend/snippets/ProductCard.tsx
  → 可生成 Shopify Snippet 的 React Component
```

不做任意组件自动提取，也不要求组件添加 Shopify-specific decorator。

### 6.2 Snippet 名称

默认生成的 Snippet 名称应视为 compiler-owned internal name：

- 由相对路径、源码 hash 或稳定 entry identity 生成；
- 所有调用点由本次构建同步更新；
- 不承诺外部原生 Liquid 的稳定调用契约。

如果未来需要与原生 Liquid 互操作，再增加显式 public name，而不是让所有内部组件承担命名兼容成本。

### 6.3 SSR 调用与浏览器 mirror

当 Section 中引用 Snippet Component：

```tsx
<ProductCard product={props.product} />
```

SSG 侧可以输出：

```liquid
{% render 'internal-product-card-a1b2', product: section.settings.product %}
```

浏览器侧仍需要以 React Component 作为 hydration mirror。因而编译器必须保证：

1. Liquid Snippet 的最终 HTML 与 React 首次 render 等价。
2. Snippet props 的 bridge key 在父 hydration root 中可读取。
3. Snippet 内部的 `when`、`each` 使用同一 contract。
4. callback、client state 不被错误地送入 Liquid。

如果无法满足这些条件，组件必须退回源码 inline 或 client-only，而不是强制生成 Snippet。

## 7. Render mode 与 Island

### 7.1 三种有效模式

```text
SSR static
  Liquid/HTML 输出，无 React client script

SSR hydrate
  Liquid/HTML 输出 + bridge + React hydrate

Client-only
  输出 root/fallback + bridge，浏览器 mount React
```

建议将“是否 SSR”和“是否 hydration”拆成两个维度，不再用单一 `runtime` 字段承载全部语义。

### 7.2 Island 的职责

Island 只负责 Liquid-owned DOM：

- `image_tag`；
- `video_tag`；
- `content_for 'blocks'`；
- merchant HTML/richtext；
- Shopify 生成的复杂 DOM。

Island 不负责：

- settings 驱动的 React 条件分支；
- React state 初始化；
- 任意 client-only 组件；
- React 事件绑定到 Liquid-owned subtree 内部。

### 7.3 Client-only 的职责

Client-only 可以存在于：

- 整个 Section/Block entry；
- 任意 React 子树。

client-only 仍可以读取 Section/Block settings，但服务端只输出稳定 root/fallback，不尝试生成未知的完整 React DOM。

## 8. 函数式 Liquid DSL 的最小集合

v1 不应一次实现全部 Shopify Liquid，而应先跑通高频、可测试的集合：

### 数据

- `useProps()`；
- property access；
- literal；
- typed setting refs；
- bridge registration。

### 表达式

- `eq`、`neq`；
- `and`、`or`、`not`；
- `isTruthy`；
- `concat`；
- 常用 Shopify filters。

### 结构

- `when`；
- `each`；
- `render`；
- `capture`；
- `ClientOnly`；
- `Island`。

### 暂不优先

- 任意 Liquid tag 的 1:1 覆盖；
- children 跨 Snippet boundary；
- callback 跨 Snippet boundary；
- 自动把任意 JavaScript 代码转换成 Liquid；
- Template/page JSON。

## 9. 测试策略

### 9.1 IR / evaluator

- 同一 `Expr<T>` 在 SSG emitter 和 Browser evaluator 中得到等价语义。
- `when` 的 true/false 两条分支。
- `each` 空数组、单项、多项。
- expression 类型和 filter 参数验证。

### 9.2 Props contract

- Section settings 生成 schema、refs 和 bridge。
- Snippet literal / expression / invalid prop。
- callback、children、ReactNode 穿越 Snippet 时构建失败。
- prop rename 后生成调用点和 Snippet 同步变化。

### 9.3 Render mode

- SSR static 不生成 client script。
- SSR hydrate bridge + hydration root 一致。
- client-only 只输出稳定 root/fallback。
- 同一组件在 SSR 和 client-only 模式下共享 props contract。

### 9.4 真实运行时

- 使用真实 React DOM，而不是源码字符串 fixture。
- 使用真实 `hydrateRoot`。
- 覆盖 editor section load/unload。
- 覆盖 nested Section/Block/Island。
- 生成文件通过 Liquid/HTML/schema parser 或 Theme Check。

## 10. 分阶段实施建议

### Phase 1：Contract 与 Schema

- 引入 setting builders；
- 引入独立 validator；
- 用一个 `useProps()` 替代逐个 `useLiquid`；
- 保留旧 API 作为兼容层，但不再扩展。

### Phase 2：Expression IR 与双端执行

- 实现 `Expr<T>`；
- 实现 SSG Liquid emitter；
- 实现 Browser evaluator；
- 先支持 leaf value、`when`、`each`。

### Phase 3：Render modes

- 拆分 SSR/static、SSR/hydrate、client-only；
- 将 Island 限定为 Liquid-owned DOM；
- 增加稳定 fallback/root 约定。

### Phase 4：Snippet boundary

- 固定 `frontend/snippets` 约定；
- 解析普通 React props；
- 生成 internal Snippet；
- 处理 literal/expression props；
- 对 callback/children/client state 给出编译错误。

### Phase 5：回归与清理

- 迁移示例；
- 移除业务层 Liquid 字符串；
- 补齐真实 DOM、SSR、client-only、Snippet 和 schema 测试；
- 再评估是否拆出 core package。

## 11. 当前仍需确认的三个细节

1. `frontend/snippets` 是否只允许默认导出函数组件，还是允许 named export + default export？建议 v1 只允许 default component，减少提取复杂度。
2. Snippet 是否暂时禁止 `children`？建议禁止，先保证 named props 传递闭环。
3. client-only 是否同时支持 entry 级和子树级？建议都支持，entry 级只是默认 root 的简写。

本稿只细化设计边界和数据契约，不修改现有实现，也不等同于最终 API 定稿。
