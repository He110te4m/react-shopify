# React → Shopify Liquid SSG 方案体检报告

## 1. 报告信息

- 日期：2026-07-23
- 仓库：`/Users/sz-0203017618/codes/react-shopify`
- 分支：`refactor-dawn-theme`
- 基线提交：`1d7171a`
- 体检范围：`packages/vite-plugin-react-shopify`、`examples/react-dawn`、`template`、`docs`
- 本次动作：只读检查、源码定点复核、测试命令可执行性检查；未修改源码，未执行安装依赖，未创建提交。

## 2. 结论先行

当前实现已经是一个“React 组件 → Vite/SSR → Liquid + 浏览器 hydration”的可工作的原型。结合后续沟通，当前阶段应明确收敛为 **React-first**，Vue、page SSG 和非 Shopify 产物均不作为 v1 验收范围。当前最关键的偏差有四个：

1. **“不再编写 Liquid”尚未成立。** 开发者仍需手写 Liquid expression、filter、raw Liquid，并手动在 `layout/theme.liquid` 引入 importmap。
2. **React Component → 可复用 Snippet 的 props/调用协议尚未建立。** 当前 snippet 是独立 entry，不是普通 React 组件自动编译出的复用产物。
3. **Island 只解决 Liquid-owned DOM capture，没有解决由 settings 导致的 React 条件结构和初始 state 差异。**
4. **Schema 仍以手写 JSON 为主，类型、builder、独立校验和运行时引用没有形成单一声明来源。**

总体判断：**React-first 路线成立，但当前缺少类似 uni-app 的平台抽象层。** React 应负责主要模板与交互表达，Liquid 应成为编译目标和少量 escape hatch，而不是继续以字符串形式扩散到业务组件。入口命名、动态 CSS、schema 契约等已确认工程缺陷仍需处理，但不是本轮产品语义讨论的替代品。

## 3. 目标符合度矩阵

| 目标 | 当前状态 | 判断 |
| --- | --- | --- |
| React 组件 SSG 为 Liquid | 已有完整主链路 | **部分满足** |
| 开发者不再编写 Liquid | `useLiquidExpression`、`useLiquidCode`、filter 字符串仍是公开 API | **不满足** |
| React Component → Snippet 复用 | snippet 只能作为独立 entry 扫描；没有 props 声明与调用转换 | **不满足** |
| Island 混合技术栈 | `Island`、`BlockSlot`、非变更式 DOM capture 已实现 | **部分满足，边界很硬** |
| Schema builder 与独立校验 | 已有 TS 类型和部分 validator，但主要仍手写对象 | **部分满足** |
| Vue SSG | 计划在 React 跑通并拆出 core 后实现 | **当前范围外** |
| 组件单测与回归 | 有 153 个局部测试，但缺少真实编排和浏览器链路 | **部分满足** |
| 未来 page 单页面复用 | 计划读取 template JSON 后生成无 Liquid 产物 | **当前范围外** |
| 压缩、polyfill、兼容性治理 | 接受由 Vite `target` 统一处理 | **当前策略可接受** |

## 3.1 用户澄清后的当前范围

- v1 只跑通 React；Vue 应作为未来 core adapter 的消费者，而不是当前同时实现的目标。
- v1 不处理 page/template JSON 到纯页面产物；当前 template 路径问题保留记录，但不进入首轮重构优先级。
- polyfill 不单独建设兼容层，统一依赖 Vite `target` 和构建产物治理。
- “复用”指普通 React Component 的复用，以及必要时将其编译为 Snippet；不是复用 Section/Block entry。
- Liquid 的目标形态是编译后端：业务代码主要写 React，Liquid expression/tag/filter 应由上层 API 生成，raw Liquid 只保留为 escape hatch。

## 3.2 已确认的 v1 产品决策

1. **业务代码不出现 Liquid。** settings、snippet props、条件、循环、filter 等通过函数式、类型化 API 表达；编译器建立类似 ORM query AST 的中间表示，再输出 Liquid 文本。raw Liquid 不作为常规开发 API。
2. **Snippet 提取使用显式约定，不做任意组件自动分析。** 优先考虑专用目录或文件命名作为编译边界，避免向普通 React Component props 注入 Shopify 专用标记。
3. **同时支持 SSR 与 client-only。** 不能只依赖一种 Island/hydration 路径；需要显式渲染模式和稳定的 fallback/root 契约。

## 4. 当前架构事实

```text
frontend/{sections,blocks,snippets,templates}/*.tsx
        │
        ├─ scanner：文件系统扫描 + 正则提取 runtime/blocks
        ├─ Vite virtual entry：生成浏览器 hydration entry
        ├─ Vite browser build：manifest / JS / CSS
        └─ closeBundle：
             esbuild SSR bundle
             → static analyzer 推断 runtime
             → React renderToStaticMarkup
             → 收集 Liquid bridge / raw Liquid / islands
             → Liquid assembler
             → 写入 sections/blocks/snippets/templates
```

核心实现位置：

- 入口扫描：`src/ssg/scanner.ts:28-57`
- 浏览器虚拟入口：`src/core/entries.ts:18-61`
- SSG 编排：`src/ssg/compiler.ts:46-104`
- SSR 与 global registry：`src/ssg/renderer.ts:111-204`
- Liquid 组装：`src/ssg/liquid-assembler.ts:41-113`
- Island capture：`src/runtime/Island.tsx:59-118`、`src/core/entry-template.ts:37-105`

## 5. 高风险问题（建议优先解决）

### H-01：产品目标与公开 API 冲突——仍然需要理解和书写 Liquid

**证据**

- README 要求手动在 `layout/theme.liquid` 添加 `{% render 'shopify-importmap' %}`：`packages/vite-plugin-react-shopify/README.md:84-90`。
- `useLiquidCode` 明确接受 raw Liquid：`packages/vite-plugin-react-shopify/README.md:280-285`、`packages/vite-plugin-react-shopify/docs/design.md:373-381`。
- ImageBanner 示例直接拼接 Liquid filter、条件和表达式：`examples/react-dawn/frontend/sections/ImageBanner.tsx:24-35,80-116,128-155`。
- Snippet 调用示例仍是 `{% render ... %}`：`packages/vite-plugin-react-shopify/README.md:449-473`。
- runtime exports 没有 form helper；复杂 `{% form %}` 等能力仍需 raw Liquid：`packages/vite-plugin-react-shopify/src/runtime/index.ts:16-71`。

**影响**

当前实现把“Liquid 文件由编译器生成”做到了，但没有把 Liquid 从开发者心智模型中移除。复杂的 form、filter、对象路径、条件、`content_for` 仍需要开发者知道 Liquid 语义。对于“降低 Liquid 学习成本”的核心目标，这是首要偏差，而不是文档问题。

**需要先确认**

“不写 Liquid”究竟指：

- A. 不手写 `.liquid` 文件，但允许在 TSX 中写 Liquid expression/raw code；还是
- B. TSX 层也不能出现 Liquid 语法，必须由类型化 DSL/编译器 API 表达 Shopify 数据和 tags。

当前实现只能满足 A。

### H-02（重新分类）：Vue 路径不存在，但不属于当前阶段缺陷

**证据**

- scanner 只扫描 `tsx/jsx`：`src/ssg/scanner.ts:32-35`。
- esbuild loader 只接受 `tsx/jsx`：`src/ssg/bundler.ts:63-68`。
- 类型和 runtime 只围绕 React：`src/types/ssg.ts:1-6`、`src/types/shopify.ts:78-81`。

**调整后的判断**

当前先完成 React 是合理范围，不应为尚未验证的 Vue adapter 提前增加复杂度。现阶段只需保证 scanner、compiler、runtime 之间的边界未来可以拆出 core；本项从高风险降为后续演进约束。

### H-03：入口身份只使用 basename，跨目录/跨类型同名会覆盖或绑错

**证据**

- scanner 用文件 basename 生成 `kebabName`：`src/ssg/scanner.ts:36-43,96-103`。
- Vite input 以 `input[entry.kebabName]` 建立：`src/core/entries.ts:29-37`。
- virtual module load 只用 `entries.find(e => e.kebabName === ...)`：`src/core/entries.ts:46-54`。
- manifest、CSS 和 runtime lookup 也以 `kebabName` 为 key：`src/ssg/css-manager.ts:34-44`、`src/ssg/renderer.ts:216-224`。

**影响**

例如 `sections/Header.tsx` 与 `blocks/Header.tsx`，或不同子目录下的两个 `Card.tsx`，可能出现 Vite input 覆盖、SSR 组件取错、脚本引用错绑、CSS 统计错配。输出目录虽然按类型分开，但内部索引没有按类型/相对路径分区。

**风险等级：高。** 这是在主题规模扩大、共享命名增多后才会出现的隐蔽错误，且不一定在构建阶段报错。

### H-04（重新分类）：现有 Template 路径有缺陷，但不属于当前 v1 范围

**证据**

- scanner 和 output path 声称支持 template：`src/ssg/scanner.ts:32-54`、`src/ssg/liquid-paths.ts:18-37,49-69`。
- assembler 对 `template` 走 `buildSnippet`，但随后只排除 `snippet`，因此 template 也追加 `{% schema %}`：`src/ssg/liquid-assembler.ts:57-70,109-111`。
- 默认 template 前缀固定为 `page.react-`：`src/core/options.ts:32-36`。
- 当前 Liquid assembler 测试没有 `targetType: "template"` 场景：`src/__tests__/liquid.test.ts:122-205`。

按 Shopify 官方的 Section schema、Theme blocks、Templates 契约，JSON template 和 Liquid template 是不同产物类型；`{% schema %}` 不能沿用 section/block 的分支直接追加到 template。

**影响**

- `frontend/templates/Product.tsx` 也会默认变成 `templates/page.react-product.liquid`，不能表达 `product`、`cart`、`article` 等模板类型。
- “未来直接构建为 page 单页面”与当前“生成 Shopify template 文件”的语义混在一起。
- 后续若要支持 JSON template，现有 Liquid assembler 不能直接复用。

**调整后的判断**

当前不继续扩展 template/page 能力。现有问题需要避免误用或暂时关闭入口，但不应抢占 React Section/Block/Snippet 主链路的设计优先级。

### H-05：动态 import 的 CSS 可能被收集遗漏后再被清理

**证据**

- CSS 收集递归 `chunk.imports`，不递归 `chunk.dynamicImports`：`src/ssg/css-manager.ts:123-146`。
- client asset reachability 同时遍历静态和动态 import：`src/ssg/compiler.ts:266-283`。
- 清理阶段对带 `chunkPrefix` 的 CSS 没有可达性保护，JS 才检查 `reachable`：`src/ssg/compiler.ts:285-301`。

**影响**

如果 `.client` 模块或普通 `import()` 带有 CSS，该 CSS 可能没有内联到 Liquid、没有生成共享 stylesheet snippet，却在构建末尾被删除，导致懒加载交互的样式缺失或 404。该问题只有使用动态 CSS 时才触发，当前测试没有覆盖。

### H-06：SSG 与浏览器 hydration-fix 的作用域不一致，可能制造 SSR/client 树差异

**证据**

- Vite 浏览器插件只处理 `sourceCodeDir` 内的 TSX/JSX：`src/hydration-fix/vite-plugin.ts:17-33`。
- SSG esbuild 插件对加载到的所有 TSX/JSX 执行修复：`src/ssg/bundler.ts:99-115`。

**影响**

公共 workspace package 或其他源码依赖如果被 SSR bundle 加载，SSR 版本可能被自动改写，而浏览器版本没有改写；最终服务端 HTML 和 hydration 预期树不一致。这个问题与“共享 React 组件/公共库”目标直接相关。

### H-07：Shopify schema 类型和序列化器存在可通过 TypeScript、却生成非法契约的组合

#### H-07.1 `enabled_on` 与 `disabled_on` 未互斥校验

- 类型注释说明互斥，但 `ShopifyMeta` 同时暴露两个独立可选字段：`src/types/shopify.ts:51-66,83-118`。
- serializer 无条件同时输出：`src/ssg/schema.ts:51-52`。
- 测试还把两者同时提供并期待同时生成：`src/__tests__/schema.test.ts:174-184`。

按 Shopify 官方 Section schema 契约，`enabled_on` 与 `disabled_on` 应二选一，且 scope 至少应包含 `templates` 或 `groups`。

#### H-07.2 静态 preset block 的 nested `blocks` 会被静默丢弃

- 类型允许静态 preset block 携带 `blocks`：`src/types/shopify.ts:128-146`。
- serializer 只在 `!block.static` 时递归输出：`src/ssg/schema.ts:92-112`。

这类输入不会构建失败，而是输出不完整的 preset，属于“静默数据丢失”。

#### H-07.3 `TemplateScope` 可以为空

- 注释要求至少一个 `templates/groups`，接口却全部可选：`src/types/shopify.ts:51-66`。
- serializer 原样输出 `{ enabled_on: {} }` 或 `{ disabled_on: {} }`：`src/ssg/schema.ts:51-52`。

#### H-07.4 `tag: null` 对 section 未做 target-aware 校验

- 公共类型允许 `ShopifyMeta.tag?: string | null`：`src/types/shopify.ts:92-99`。
- serializer 对显式 `null` 原样输出：`src/ssg/schema.ts:37-42`。
- validation 规则没有检查 tag：`src/validate/index.ts:31-37`。

**总体影响**

schema 目前更像“结构透传器”，不是 Shopify schema compiler。错误往往要到 Theme Check、主题编辑器或上传阶段才暴露。

### H-08：当前没有 React Component → Snippet 的编译与 props 协议

**现状澄清**

普通 React Component 被 Section/Block import 时，会直接进入该 entry 的 SSR/bundle，不会自动成为独立 Shopify Snippet。当前只有位于 `frontend/snippets` 的文件会被 scanner 识别成 snippet entry：`src/ssg/scanner.ts:21-41`。

**证据**

- snippet 和 section/block 一样是独立 `SSGEntry`，没有“从组件引用提取 snippet”的分析过程：`src/ssg/scanner.ts:28-57`。
- SSR 始终执行 `createElement(Component)`，没有传入 props：`src/ssg/renderer.ts:184-185`。
- `buildSnippet` 只负责组装 wrapper、bridge 和 hydration root，不声明 snippet 参数：`src/ssg/liquid-assembler.ts:222-250`。
- README 示例仍由调用者手写 `{% render 'react-product-card', ... %}`：`packages/vite-plugin-react-shopify/README.md:449-473`。

**影响**

当前 generated snippet 可以读取全局 Liquid 对象或组件内部写死的表达式，但不能自然表达：

```tsx
<ProductCard product={product} showVendor={settings.showVendor} />
```

到以下 Liquid 调用之间的编译映射：

```liquid
{% render 'react-product-card', product: product, show_vendor: section.settings.show_vendor %}
```

要实现该复用目标，需要先定义：哪些组件会被提取为 snippet、props 如何声明、调用点如何转换、默认值/类型如何校验，以及 snippet 内如何读取参数。否则“生成 Snippet”只是多一个 entry，并没有解决透传成本。

### H-09：Island 没有解决 settings 驱动的结构和 state 首次渲染差异

**核心原因**

SSG 阶段拿到的是 Liquid 占位表达式，Shopify 响应阶段才得到真实 settings，客户端再从 JSON bridge 读取真实值。三阶段的数据值不同：

```text
SSG React render        → "{{ section.settings.show_banner }}"
Shopify Liquid render   → true / false / merchant value
Client first render     → JSON bridge 中的真实值
```

稳定文本和属性可以在 Liquid 替换后与客户端一致，但以下逻辑会产生结构或 state 差异：

- `{showBanner && <Banner />}`：SSG 时占位字符串 truthy，客户端可能是 false。
- `useState(Number(setting))`：SSG 占位符和客户端数字产生不同初值。
- settings 控制循环数量、元素类型、Island 数量或顺序。
- settings 控制不同组件分支，导致 SSG tree 与 client tree 不同。

仓库文档已经把条件渲染和 Liquid 初始化 state 列为已知限制：`packages/vite-plugin-react-shopify/README.md:626-694`、`docs/hydration-issues.md:162-264`。

**Island 的当前能力边界**

现有 `Island` 只适合把一整棵 DOM 定义为 Liquid-owned，并通过 capture + `dangerouslySetInnerHTML` 保持首屏一致；随后使用永久 memo 冻结：`src/runtime/Island.tsx:86-118`。它不能同时满足“Liquid 决定 DOM 结构”和“React 接管该结构内部交互”。

因此后续设计需要明确区分至少三类渲染所有权，而不是让一个 Island API 覆盖所有场景：

1. React-owned、结构稳定，仅叶子值由 Liquid 替换；
2. Liquid-owned subtree，React 不管理内部交互；
3. Client-owned dynamic subtree，使用稳定 shell 或延迟挂载，不尝试用未知 settings 做完整 SSG hydration。

## 6. 中风险问题

### M-01：`auto` static analyzer 不是可靠的交互判定器

**证据**

- 只识别直接 Identifier 形式的 hooks：`src/ssg/static-analyzer.ts:9-20,55-61`。
- `React.useState`、重命名后的 hook、外部自定义 hook 调用不会按同一规则识别。
- 本地 import 解析把 `frontend` 路径写死：`src/ssg/static-analyzer.ts:133-157`。

**影响**

`runtime: "auto"` 可能把实际有交互的组件判为 static，导致不生成 hydration script。当前 analyzer 是启发式优化器，不能作为运行时正确性的唯一来源；这也说明 README 中“auto”需要更明确的保守策略和失败模式。

### M-02：inline style 后处理会破坏 URL/data URI

**证据**

- `normalizeStyleAttributes` 对整个 style 字符串执行 `.replace(/:(\S)/g, ": $1")`：`src/ssg/post-process.ts:20-27`。

**影响**

`background:url(https://x)` 或 `data:image/...` 中的冒号也会被处理，可能变成无效 CSS。现有测试只覆盖普通 token，没有 URL/data URI 用例：`src/__tests__/post-process.test.ts:1-18`。

### M-03：构建配置会静默覆盖用户 Vite/Rolldown 配置

**证据**

- `external` 只保留数组，函数/正则形式被替换为空数组：`src/core/config.ts:44-48`。
- `manualChunks`、`entryFileNames`、`chunkFileNames`、`assetFileNames` 被插件固定覆盖：`src/core/config.ts:49-67`。
- `rolldownOptions` 和 `rollupOptions` 混用，entries 插件又只读取 `rollupOptions.input`：`src/core/config.ts:44-45`、`src/core/entries.ts:34-42`。

**影响**

主题项目的 monorepo external、代码分割和命名策略可能“配置被接受但不生效”。这会阻碍后续跨站点复用和复杂项目接入。

### M-04：esbuild 是硬依赖，但插件包未声明

**证据**

- SSG 通过消费项目 `createRequire()` 查找 `esbuild`，找不到直接使 entry 编译失败：`src/ssg/bundler.ts:39-47`、`src/ssg/compiler.ts:122-125`。
- 插件 `package.json` 没有 `esbuild` dependency/peerDependency；模板才单独声明 devDependency：`packages/vite-plugin-react-shopify/package.json:30-47`、`template/package.json:14-20`。

**影响**

消费者漏装时不是可选降级，而是 build 期间失败；包的安装契约不自洽。

### M-05：Island 类型允许 children，但实现同时传 `children` 和 `dangerouslySetInnerHTML`

**证据**

- `IslandProps` 声明 `children?: React.ReactNode`，但实现没有从 props 中取出 children，`...rest` 会把它继续传给 `createElement`：`src/runtime/Island.tsx:40-54`。
- 同一调用同时设置 `dangerouslySetInnerHTML`：`src/runtime/Island.tsx:62-83,98-105`。

**影响**

调用者一旦给 `Island` 传 children，就可能触发 React 对 children 与 `dangerouslySetInnerHTML` 冲突的错误。当前类型和实现表达了相反的契约。

同时，`React.memo(IslandImpl, () => true)` 会永久冻结 island：`src/runtime/Island.tsx:108-118`。这符合 Liquid-owned DOM 设计，但意味着 Island 内部不能承载 React 交互，不能把它当作通用 Island 组件。

### M-06：生成器与测试 fixture 已经发生漂移

- `src/__tests__/entries.test.ts:49-52` 的手写 `scan` 是“target 匹配时仍扫描 descendants”。
- 实际 `generateEntryModule` 是 `target.matches ? [target] : descendants`：`src/core/entry-template.ts:77-81`。

当前测试验证的是手写字符串，不是生成器的真实行为，不能阻止模板逻辑漂移。

### M-07：生成/清理生命周期并非完全事务化

- `compileAllEntries` 的 Liquid 输出有内存准备和回滚：`src/ssg/compiler.ts:58-104,190-233`。
- importmap 在编译完成后单独写入：`src/ssg/index.ts:49-55,82-108`。
- orphan cleanup 固定扫描 `sections/blocks/snippets/templates`，与自定义 `ssg.directories` 不完全一致：`src/ssg/compiler.ts:235-264`。

**影响**

当 importmap 写入失败、输出目录自定义、或多轮构建中间状态异常时，主题可能出现部分更新或生成文件清理范围不符合配置。

## 7. 测试与质量门禁体检

### 已有能力

- `src/__tests__` 共 17 个测试文件、153 个 `it`。
- 已覆盖 scanner、schema、assembler 部分分支、static analyzer、post-process、hydration-fix、配置和若干失败路径。
- `commitOutputs` 具备 staging、备份和失败回滚：`src/ssg/compiler.ts:190-233`。

### 关键缺口

1. `compileAllEntries` 只有“失败且保留旧文件”的测试：`src/__tests__/compiler.test.ts:14-46`；没有成功构建、多 entry、CSS、manifest、prune、orphan cleanup 的端到端测试。
2. `renderEntry` 没有直接测试，globalThis registry、runtime 决策、Liquid bridge、Island counter 生命周期未被真实验证。
3. Island、BlockSlot、entry hydration 多使用 React mock、源码字符串断言和空 document；没有真实 DOM、`hydrateRoot`、编辑器事件、嵌套 root 测试。
4. `LiquidHtml`、`LiquidIf`、`LiquidValue`、`ShopifyVideo`、`defineSettings` 等公开 runtime API 没有对应测试。
5. 没有 Liquid parser、Shopify Theme Check、HTML parser 或生成主题实际校验；大量断言只是 `toContain`/正则。
6. `vitest.config.ts:3-7` 只有 Node 环境和 include，没有 coverage、threshold、reporter、setup。
7. 未发现 CI workflow 或构建门禁。

### 本次可执行性验证

当前工作区没有 `node_modules`：

```text
pnpm --filter vite-plugin-react-shopify test
→ vitest: command not found

pnpm --filter vite-plugin-react-shopify typecheck
→ tsc: command not found
```

因此本次不能对测试结果或类型检查结果作通过/失败判断；只能确认依赖未安装，且仓库缺少无需外部环境即可执行的质量证据。

### 验证边界

- `examples/react-dawn/assets` 当前没有本插件生成的 JS/CSS/manifest，无法测量真实 bundle 体积、压缩率、target 语法和动态 chunk 行为。
- 本次没有 Shopify store、Theme Check 或浏览器环境，不能验证主题上传、编辑器动态加载和真实 hydration。
- JSON bridge 直接把 Liquid `json` 输出嵌入 `<script type="application/json">`：`src/runtime/bridge.ts:43-56`。对 `</script>`、U+2028/U+2029 和 merchant-controlled HTML 的转义安全需要在真实 Liquid 渲染环境单独核验，本报告不把它判定为已确认漏洞。

## 8. 构建、兼容性和发布契约

### 8.1 压缩与 polyfill

- `src/core/config.ts:34-97` 没有固定 JavaScript `build.target`，也没有 legacy/polyfill 插件。
- 示例只设置 `cssTarget: "chrome90"`：`examples/react-dawn/vite.config.ts:3-6`。
- runtime 产物依赖 `type="module"`、`Map`、`:scope`、optional chaining、`CustomEvent`：`src/ssg/liquid-assembler.ts:90-106`、`src/core/entry-template.ts:25-85`、`src/runtime/BlockSlot.tsx:63-76`。

结合当前目标，本项不需要单独建设 polyfill 系统。建议把浏览器兼容范围固化为 Vite `build.target` 配置和对应构建测试，让 Vite 负责语法降级；import map 等无法仅靠语法转换解决的能力再单独列出最低浏览器要求。

### 8.2 Node/Vite 版本矛盾

- 根包声明 Node `>=18.0.0`：`package.json:19-21`。
- 插件依赖 Vite `^8.0.0`：`packages/vite-plugin-react-shopify/package.json:42-47`。
- 锁文件中的 Vite 8 版本要求更高 Node 版本：`pnpm-lock.yaml:1734-1741`。

因此仓库公开 engines 与实际构建栈的可安装范围不一致，发布前需要统一 Node/Vite 支持矩阵。

### 8.3 共享 CSS 与资产命名

- 共享 CSS snippet 只取 basename：`src/ssg/css-manager.ts:66-79`。
- `a/common.css` 与 `b/common.css` 会争用同一个 `css-common.liquid` 输出路径，最终由 `commitOutputs` 报重复路径：`src/ssg/compiler.ts:196-204`。

## 9. React Component 与 Snippet 复用边界

对复用目标的修正理解如下：

- Section/Block 仍是 Shopify entry，不要求彼此复用。
- 业务 UI 和逻辑通过普通 React Component 复用。
- 当一个复用组件需要成为 Shopify 可调用产物时，再由编译器生成 Snippet。

这个方向可行，但必须区分两种完全不同的复用：

1. **源码级复用**：Section/Block 直接 import React Component，构建后组件代码被内联/打包到所属 entry，不产生 Snippet。
2. **产物级复用**：编译器为指定 Component 生成独立 Snippet，并把 React JSX 调用转换为 Liquid `render` 调用或等价产物。

当前实现只有“独立 snippet entry”，尚无源码组件提取、props 声明、调用点转换和参数 bridge。后续需要把 Snippet 视为一个 compiler artifact，而不只是另一个目录类型。

## 10. 已确认的正向设计

以下部分方向是成立的，后续重构应保留其意图：

- 以 Vite manifest 为浏览器 entry 与 CSS 追踪真相来源。
- SSG 输出先在内存准备，写盘时 staging/backup/rollback，避免一半成功一半失败。
- `Island` 使用 non-mutating capture，不在 hydration 前清空 Liquid 生成的图片、视频或 block DOM：`src/runtime/Island.tsx:86-105`、`src/core/entry-template.ts:37-49`。
- `BlockSlot` 通过 parent commit 后的 `ssg:blocks:ready` 协调 child block hydration：`src/runtime/BlockSlot.tsx:63-87`、`src/core/entry-template.ts:51-58,93-96`。
- `runtime: "static" | "hydrate" | "auto"` 具有明确的配置优先级，显式 static 与检测到交互冲突时会失败：`src/ssg/renderer.ts:117-130`。
- 生成文件带免责声明和前缀，不会默认覆盖没有生成标记的原生 Liquid：`src/ssg/liquid-assembler.ts:16-28`、`src/ssg/compiler.ts:235-264`。

## 11. 需要在重构前确认的产品决策

这些问题不是单靠修 bug 能决定的，建议作为下一轮讨论的输入：

1. **Liquid 抽象层**：v1 需要覆盖哪些高频能力——settings、snippet props、对象字段、filter、条件、循环、form、`content_for`？raw Liquid 是否只作为 escape hatch？
2. **Component → Snippet 协议**：哪些组件需要生成 Snippet；由显式 API、文件约定还是编译器分析标记？React props 调用如何转换为 Liquid 参数？
3. **Props API**：类似 Vue `defineProps` 的声明是仅返回 bridge 值，还是同时生成 snippet 参数、setting refs、默认值和校验？
4. **Island ownership**：哪些 settings 驱动场景必须保留 SSR；哪些允许 Liquid-owned subtree；哪些应使用 client-owned stable shell？
5. **Schema 单一来源**：`createTextSetting`、`createImageSetting` 等 builder 是否同时负责类型推导、schema JSON、默认值校验和 settings refs？
6. **质量门禁**：是否将 schema validator、Theme Check、真实浏览器 hydration、生成主题快照纳入 CI 验收？

Vue、page/template JSON 和非 Shopify 输出保留为后续 core 抽取的约束，不进入当前方案设计范围。

## 12. 建议的下一步（不进入重构实现）

在确认上述决策后，下一轮先产出一份“问题目录 + 验收标准”，至少覆盖：

- 入口 identity 与输出 identity 的规范；
- Liquid DSL/bridge 的最小能力集合；
- static/hydrate/island 的可观测语义；
- Section、Theme Block、Snippet 的产物契约；
- SSG 成功路径、Theme Check、真实 DOM hydration 的测试矩阵；
- Component → Snippet props 和调用转换协议；
- Schema builder、独立 validator 与 settings refs 的单一声明模型；
- 资产、CSS、Vite target、Node/Vite 支持矩阵。

本报告不提出具体重构方案，也不修改当前实现；它只作为后续痛点确认和方案评估的基线。

## 13. 外部契约参考

- [Shopify Section schema](https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema)
- [Shopify Theme blocks](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks)
- [Shopify Input settings](https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings)
- [Shopify Templates](https://shopify.dev/docs/storefronts/themes/architecture/templates)
