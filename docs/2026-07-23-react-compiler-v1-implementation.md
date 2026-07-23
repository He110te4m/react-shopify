# React-first Shopify 编译器 v1 实现交付

## 状态

- 日期：2026-07-23
- 范围：React、Section、Theme Block、Snippet
- 暂不包含：Vue、page/template JSON、非 Shopify target

## 已实现

### Contract 与 Schema

- `createTextSetting`、`createImageSetting`、`createCheckboxSetting`
- `createSelectSetting`、`createRangeSetting`、`createNumberSetting`
- `createInlineRichTextSetting`、`createUrlSetting`
- `createColorSchemeSetting`、`createHeaderSetting`、`createParagraphSetting`
- 对象 key 推导 setting ID
- 独立 schema validator 与稳定错误码
- `defineSettings(scope, descriptors)` 同时提供 `schema`、`refs`、`useProps()`

### Expression IR 与函数式 DSL

- 不可变 node IR，不再把 expression 存为普通字符串
- path、literal、property、binary、logical、filter 节点
- `eq`、`neq`、`and`、`or`、`not`、范围比较
- `dividedBy`、`multiply`、`round`、`append`、`escape`
- `when`、`unless`、`each`
- `ShopifyOutput` 用于循环变量等 typed expression 的文本输出

raw Liquid API 仍作为兼容逃生口保留，但 `examples/react-dawn/frontend` 已不依赖它。

### Snippet boundary

`frontend/snippets` 是显式产物边界：

```tsx
import ButtonSnippet from "../snippets/Button";

<ButtonSnippet label={label} link={link} style="button--primary" />;
```

浏览器 target 保持普通 React Component；SSG target 自动输出：

```liquid
{% render 'react-button', label: label_value, link: block.settings.button_link_1, style: 'button--primary' %}
```

带 filter 的参数会先生成局部 `assign`，满足 Shopify `render` 参数契约。

v1 约束：

- Snippet 使用 default function component。
- props 使用函数参数对象解构声明。
- 支持 literal 与 Shopify reference。
- 禁止 children、callback、ref、client state 和不可序列化对象跨边界。

### Render modes

- `runtime: "static"`：Liquid/HTML，无 React client entry。
- `runtime: "hydrate"`：SSR + JSON bridge + `hydrateRoot`。
- `runtime: "client"`：稳定 fallback + JSON bridge + `createRoot`。
- 局部 `<ClientOnly>`：SSR/hydration 首屏输出 fallback，mounted 后显示客户端子树。

### Entry identity

entry 的编译身份由 entry type 与相对源码路径共同生成，避免同名 Section、Block、Snippet 或嵌套目录入口覆盖。

## Example 验收入口

- Static Section：`examples/react-dawn/frontend/sections/ImageBanner.tsx`
- React → Snippet：`examples/react-dawn/frontend/snippets/Button.tsx`
- Snippet caller：`examples/react-dawn/frontend/blocks/ButtonBlock.tsx`
- SSR hydrate：`examples/react-dawn/frontend/blocks/HydratedCounterBlock.tsx`
- Entry client-only：`examples/react-dawn/frontend/blocks/ClientOnlyBlock.tsx`
- 主题配置：`examples/react-dawn/templates/index.json`

生成产物：

- `examples/react-dawn/sections/react-image-banner.liquid`
- `examples/react-dawn/blocks/react-*.liquid`
- `examples/react-dawn/snippets/react-button.liquid`
- `examples/react-dawn/assets/react-shopify-*.js`

## 验证结果

已通过：

- 插件 TypeScript typecheck
- 21 个 Vitest 文件、173 个测试
- 插件 package build
- example TypeScript typecheck
- example Vite build，7 个 entry 完成 SSG
- 业务 `frontend` 中无 `section.settings`、`block.settings`、raw Liquid tag 或旧 Liquid hooks
- Theme Check 未发现本次生成文件的 error

Theme Check 全主题仍有 2 个原 Dawn 错误：`sections/featured-product.liquid` 引用了缺失的 schema translation key；不属于本次生成产物。

## 后续边界

- Snippet props 暂不支持 children 或对象序列化协议。
- Snippet prop 自动提取当前只覆盖 default function component 的对象解构形式。
- `each` 已具备 Liquid emitter 与 browser collection 执行，但 example 暂未加入 Shopify 集合型 setting 场景。
- page/template JSON、Vue adapter 与 core package 拆分留待后续阶段。
