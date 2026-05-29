# React → Liquid 水合问题场景文档

记录了在开发过程中遇到并解决的所有水合失败场景，作为开发规范和后续自动化检测的参考。

---

## 场景 1：空白文本节点

### 问题描述

`data-ssg-hydrate` 容器标签与内部 HTML 内容之间有换行，浏览器 DOM 中产生空白文本节点，React hydration 期望容器首个子节点是元素节点。

### 错误现象

```
react-dom.js:8 Uncaught Error: Minified React error #418
```

### 修复前

```html
<!-- liquid.ts 生成的 Liquid 模板 -->
<div data-ssg-hydrate>
    <div class="...">...</div>   <!-- 换行+缩进 = DOM 中的 text node -->
</div>
```

### 修复后

```html
<div data-ssg-hydrate><div class="...">...</div></div>
```

### 修复位置

`src/plugin/ssg/liquid.ts` — `buildSection`/`buildBlock`/`buildSnippet` 中 `data-ssg-hydrate` 的组装方式，内容直接拼接在标签后面，无换行。

---

## 场景 2：style 中颜色值被浏览器规范化

### 问题描述

内联 `style` 中的 hex 颜色值（如 `#e17055`）被浏览器规范化为 `rgb(225, 112, 85)` 格式，导致 SSR 输出的 `style` 属性值与浏览器 DOM 中的值不一致。

### 错误现象

```
react-dom.js:8 Uncaught Error: Minified React error #418
# 对比 style 属性:
#   Liquid: style="background-color:#e17055"
#   浏览器: style="background-color: rgb(225, 112, 85)"
```

### 修复方案

用 CSS 自定义属性替代内联 `background-color`：

```tsx
// ❌ 内联颜色值（会被浏览器规范化）
<div style={{ backgroundColor: accentColor }} />

// ✅ CSS 自定义属性（不会被规范化）
<div style={{ "--accent": accentColor } as React.CSSProperties} />
```

```css
.SharedCard-accentLine {
  background-color: var(--accent, #6c63ff);  /* 颜色由 CSS 掌控 */
}
```

同时在 `post-process.ts` 中规范化 SSR 输出的 style 格式，添加分号和空格：

```
--accent:#e17055  →  --accent: #e17055;
```

### 修复位置

- `examples/.../SharedCard.tsx` — 改用 CSS 自定义属性
- `examples/.../SharedCard.css` — 通过 `var(--accent)` 读取颜色
- `src/plugin/ssg/post-process.ts` — 新增 `normalizeStyleAttributes()` 规范化 style 格式

---

## 场景 3：void 元素自闭合斜杠

### 问题描述

`renderToStaticMarkup` 对 void 元素（如 `<input>`）输出 XHTML 风格的自闭合 `/>`，但浏览器按 HTML5 规范解析时去除斜杠和空格，导致属性字符串不一致。

### 错误现象

```
react-dom.js:8 Uncaught Error: Minified React error #418
# 对比:
#   SSR:  <input value="" />
#   浏览器: <input value="">
# 差异: " />" vs ">"
```

### 修复方案

在 post-process 中将 void 元素的自闭合斜杠移除：

```
<input value="" />  →  <input value="">
<br />               →  <br>
<img src="..." />    →  <img src="...">
```

### 规范化的 void 元素列表

```
area, base, br, col, embed, hr, img, input,
link, meta, param, source, track, wbr
```

### 修复位置

`src/plugin/ssg/post-process.ts` — 新增 `normalizeVoidElements()`

---

## 场景 4：JSX 中相邻文本与表达式的节点拆分 ⭐

### 问题描述

**这是最常见也是最隐蔽的水合失败原因。**

JSX 中混合字面量文本和表达式（如 `<button>-{step}</button>`）在 React 运行时表示为多个子节点：

```
children: ["-", expression]
```

SSR 时 `renderToStaticMarkup` 将相邻文本节点合并为一个文本节点输出：

```html
<button>-{{ section.settings.step }}</button>   <!-- 一个文本节点 -->
```

浏览器解析后 DOM 中也是一个文本节点。但客户端 hydration 时 React 期望**两个独立的文本节点**：

```
"-"   ← text node
"1"   ← text node
```

DOM 中只有一个文本节点 `-1`，React 期望两个 → 文本内容不匹配。

### 错误现象

```
react-dom.js:8 Uncaught Error: Minified React error #418
# args: Server: "+1" (one node)  Client: "+" (first of two nodes)
```

### 受影响的模式

```tsx
// ❌ 相邻文本节点 — 水合失败
<button>-{step}</button>
<button>+{step}</button>
<li>title = {title}</li>
<li>show_banner = {String(value)}</li>
<p>effect_only_text = {result}</p>
```

### 修复方案

使用 **模板字面量**（`{`text ${expr}`}`）将所有内容合并为单个表达式：

```tsx
// ✅ 模板字面量 — 始终一个文本节点
<button>{`-${step}`}</button>
<button>{`+${step}`}</button>
<li>{`title = ${title}`}</li>
<li>{`show_banner = ${String(value)}`}</li>
<p>{`effect_only_text = ${result}`}</p>
```

### 不受影响的模式（安全）

```tsx
// ✅ 纯表达式 — 一个文本节点
<h1>{title}</h1>
<p>{count}</p>
<span>{todo.text}</span>

// ✅ 纯字面量 — 一个文本节点
<button>Reset</button>
<p>No items yet.</p>
```

### 开发规范

> **JSX 子节点中，如果同时包含字面量文本和表达式，必须使用模板字面量包裹。**

```tsx
// ❌ 禁止
<tag>literal {expr}</tag>
<tag>{expr1} middle {expr2}</tag>

// ✅ 正确
<tag>{`literal ${expr}`}</tag>
<tag>{`${expr1} middle ${expr2}`}</tag>
```

### 修复位置

- `examples/.../Counter.tsx`（2 处）
- `examples/.../SettingsTrackerTest.tsx`（5 处）

---

## 场景 5：`useState` 初始化依赖 Liquid 值

### 问题描述

`useState(initialValue)` 中 `initialValue` 依赖 `useLiquid` 返回值时，SSR 阶段 Liquid 表达式是字符串 `"{{ expr }}"`，无法通过 `Number()` 等转换函数，导致 SSR 初始化值与客户端水合时的初始化值不同。

### 示例

```tsx
// ❌ SSR 时 Number("{{ section.settings.initial_count }}") = NaN → useState(NaN||0) = 0
//    客户端时 Number(10) = 10 → useState(10) = 10
//    SSR 渲染 0，客户端期望 10 → 不匹配
const [count, setCount] = useState(Number(s.initial) || 0)
```

### 修复方案

`useState` 使用固定默认值，水合后通过 `useEffect` 同步实际值：

```tsx
// ✅ SSR 时 useState(0) = 0，客户端 useState(0) = 0 → 匹配
//    水合后 useEffect → setCount(actualValue) → 更新
const [count, setCount] = useState(0)
useEffect(() => { setCount(initialCount) }, [])
```

### 开发规范

> `useState` 的初始值**不能**依赖 `useLiquid` / `useSectionSettings` 等 hook 的返回值。需要 Liquid 值初始化 state 时，用 `useState(default)` + `useEffect(() => setState(liquidValue), [])` 模式。

---

## 修复汇总

| # | 场景 | 修复方式 | 文件 |
|---|------|---------|------|
| 1 | 空白文本节点 | 内容直接拼接在标签后 | `src/plugin/ssg/liquid.ts` |
| 2 | style 颜色规范化 | CSS 自定义属性 + normalize | `SharedCard.tsx` + `post-process.ts` |
| 3 | void 元素自闭合 | post-process 去除 `/>` | `src/plugin/ssg/post-process.ts` |
| 4 | JSX 相邻文本节点 | 模板字面量替换 | Counter.tsx, SettingsTrackerTest.tsx |
| 5 | useState 依赖 Liquid | `useState(default)` + `useEffect` | Counter.tsx |

## 待处理

- [ ] ESLint 规则自动检测 JSX 中相邻文本+表达式模式（场景 4）
- [ ] SSR 时自动检测并警告 `useState` 中使用 Liquid 值（场景 5）
- [ ] 考虑在 post-process 中自动合并相邻文本+表达式为模板字面量
