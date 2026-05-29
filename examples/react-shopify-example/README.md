# react-shopify-example

示例 Shopify 主题项目，演示如何在 Shopify 主题中用 React 编写 Section、Block、Snippet，以及各项功能的测试用例。

## 快速开始

```bash
pnpm install
pnpm build     # 生产构建
pnpm dev       # watch 模式开发
```

---

## 测试用例清单（`frontend/`）

### Sections

| 文件 | 测试场景 | 关键 API |
|------|----------|----------|
| `HelloWorld.tsx` | Settings 基础用法，共享组件 | `useSectionSettings` + `SharedCard` |
| `Counter.tsx` | 客户端交互，Liquid 数值处理 | `useSectionSettings` + `useLiquidValues` + `parseLiquidNumber`；`useState(0)` + `useEffect` 同步 |
| `TodoList.tsx` | 复杂客户端状态 | `useSectionSettings`；`useState` 管理列表 CRUD；controlled input |
| `SettingsTrackerTest.tsx` | Settings 按需追踪验证 | `useSectionSettings` + `parseLiquidBoolean`；`hidden` 属性条件显示 |
| `BlockTestSection.tsx` | **嵌套 Section+Block 水合** | `useSectionSettings` + `useLiquidValues`；`{% content_for 'blocks' %}`；交互计数器 |

### Blocks

| 文件 | 测试场景 | 关键 API |
|------|----------|----------|
| `TextBlock.tsx` | Block 基础，CSS 内联 | `useBlockSettings` |
| `GroupBlock.tsx` | Block 嵌套，Range settings | `useBlockSettings`；`blocks: [{ type: "@theme" }]` |
| `ColorBlock.tsx` | **子 Block 交互水合** | `useBlockSettings`；`useState` toggle + click counter；CSS 变量传值 |

### Snippets

| 文件 | 测试场景 | 关键 API |
|------|----------|----------|
| `ParamsSnippetTest.tsx` | Params 追踪验证 | `useSnippetParams` + `useLiquidValues`；无 `{% schema %}` |

### Components（共享）

| 文件 | 说明 |
|------|------|
| `SharedCard/SharedCard.tsx` | 可折叠卡片组件，CSS 多入口共享 → 提取为 snippet |

---

## 测试验证清单

### 水合无错误

- [ ] 浏览器 Console 无 React hydration error（`#418`、`#422` 等）
- [ ] Counter 按钮交互正常（`-`、`+`、`Reset`）
- [ ] TodoList 添加/删除/勾选交互正常
- [ ] SettingsTrackerTest 的 `show_banner` checkbox 切换正常
- [ ] BlockTestSection 内计数器交互正常
- [ ] ColorBlock 展开/折叠 + 点击计数交互正常

### 嵌套 Section+Block

- [ ] BlockTestSection 渲染 3 个 ColorBlock
- [ ] 每个 ColorBlock 有独立的 `data-ssg-liquid` 和 `data-ssg-hydrate`
- [ ] ColorBlock 的 `useBlockSettings` 读取正确的 block 级 settings
- [ ] BlockTestSection 的 `useSectionSettings` 读取正确的 section 级 settings
- [ ] Section 和 Block 的交互互不干扰

### Settings 追踪

- [ ] `react-settings-tracker-test.liquid` 中 `data-ssg-liquid` 仅含 render body 中访问的字段

### 构建产物

- [ ] 9 个 entry（sections: HelloWorld, Counter, TodoList, SettingsTrackerTest, BlockTestSection；blocks: TextBlock, GroupBlock, ColorBlock；snippet: ParamsSnippetTest）
- [ ] 所有 JS 文件含 content hash
- [ ] 共享 CSS 提取为 `snippets/css-SharedCard.liquid`
- [ ] importmap snippet 生成在 `snippets/shopify-importmap.liquid`
