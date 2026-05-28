# react-shopify-example

示例 Shopify 主题项目，演示如何在 Shopify 主题中用 React 编写 Section、Block、Snippet，以及各项功能的测试用例。

## 快速开始

```bash
pnpm install
pnpm build     # 生产构建
pnpm dev       # watch 模式开发
```

构建后检查生成的 Liquid 文件和 `assets/build/` 下的 JS 产物。

---

## 测试用例清单（`frontend/`）

### Sections（`frontend/sections/`）

| 文件 | 测试场景 | 关键点 |
|------|----------|--------|
| `HelloWorld.tsx` | 最简 Section，无 settings，共享组件 | `shopifyMeta` 最小定义；使用 `SharedCard` 组件 |
| `Counter.tsx` | Settings 完整用法，客户端交互 | `useShopifySettings` + `InferSettings`；`text`/`number`/`select` 类型；`useState` 交互 |
| `TodoList.tsx` | 复杂客户端状态，预设覆盖 | `useState` 管理列表 CRUD；presets 中覆盖 `settings` 默认值；表单交互 |
| `SettingsTrackerTest.tsx` | **Settings 按需追踪验证** | 8 个 input settings，组件 render body 只访问 4 个 → 验证 bridge JSON 只含 4 个字段；`effect_only_text` 仅在 `useEffect` 中访问 → 验证 SSR 未追踪、hydration 后为 `undefined` |

### Blocks（`frontend/blocks/`）

| 文件 | 测试场景 | 关键点 |
|------|----------|--------|
| `TextBlock.tsx` | Block 基础，CSS 内联 | Block 生成 `{%- doc -%}` 和 `{{ block.shopify_attributes }}`；CSS 内联到 `{% stylesheet %}`；`text_alignment` 类型 |
| `GroupBlock.tsx` | Block 子嵌套，Range settings | `blocks: [{ type: "@theme" }]` → 生成 `{% content_for 'blocks' %}`；`range` 类型（min/max/step/unit）；presets 分组 |

### Snippets（`frontend/snippets/`）

| 文件 | 测试场景 | 关键点 |
|------|----------|--------|
| `ParamsSnippetTest.tsx` | **Params 按需追踪验证** | 4 个 params 定义，只用 2 个 → 验证 bridge 只含 2 个字段；无 `{% schema %}`；`useShopifyParams`；`useEffect` 检测未追踪 params |

### Components（`frontend/components/`）

| 文件 | 测试场景 | 关键点 |
|------|----------|--------|
| `SharedCard/SharedCard.tsx` | 共享组件 + CSS 提取 | 不生成独立 Liquid；CSS 被多入口引用 → 提取为 `snippets/css-SharedCard.liquid`；`useState` 折叠展开 |

---

## 测试验证清单

构建后检查以下内容：

### Settings 追踪（`SettingsTrackerTest`）

- [ ] `sections/react-settings-tracker-test.liquid` 中 `data-ssg-props` 仅含 `title`、`description`、`show_banner`、`banner_position` 四个字段
- [ ] `font_size`、`accent_color`、`image`、`effect_only_text` 不出现在 bridge JSON 中
- [ ] 无 `data-ssg-params`（Section 不支持 params）
- [ ] 浏览器加载后 `useEffect` 输出：`font_size/accent_color/image/effect_only_text` 均为 `undefined`

### Params 追踪（`ParamsSnippetTest`）

- [ ] `snippets/react-params-snippet-test.liquid` 中 `data-ssg-params` 仅含 `product_title`、`product_price`
- [ ] `product_image`、`product_badge` 不出现在 bridge 中
- [ ] 无 `{% schema %}` 块
- [ ] 无 `data-ssg-props`

### Block 特性（`TextBlock`、`GroupBlock`）

- [ ] 生成的 Liquid 包含 `{%- doc -%}` 和 `{{ block.shopify_attributes }}`
- [ ] `GroupBlock` 包含 `{% content_for 'blocks' %}`
- [ ] Block 级 CSS 内联在 `{% stylesheet %}` 中

### 共享组件（`SharedCard`）

- [ ] `SharedCard.css` 被提取到 `snippets/css-SharedCard.liquid`
- [ ] `HelloWorld` 和 `Counter` 的 Liquid 中通过 `{% render 'css-SharedCard' %}` 引用

### 构建产物

- [ ] 所有 JS 文件含 content hash（如 `hello-world-DfPDnyCi.js`）
- [ ] 公共 chunk 含 hash（如 `jsx-runtime-Chh81ZAy.js`）
- [ ] importmap snippet 生成在 `snippets/shopify-importmap.liquid`
