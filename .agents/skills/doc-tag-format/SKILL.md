---
name: doc-tag-format
description: 'Write and validate {% doc %} tags in Shopify Liquid snippets/block/section files. Use when writing @param annotations, documenting component parameters, creating new snippet doc blocks, or reviewing parameter documentation. Front-load trigger keywords: doc, @param, documentation, 参数, 注释'
allowed-tools: Bash(grep:*), Glob, Read, Edit
---

# Liquid `{% doc %}` 标签格式规范

## 规则

### 必选参数

无 `[]` 包裹，必须传入：

```
@param {type} name   说明文字
```

### 可选参数

`[]` 包裹参数名，默认值写在说明中：

```
@param {type} [name]  说明文字（默认 xxx）
```

### 其他约束

- **一行一个参数**，不能多个参数合并一行
- **类型只能写一个**，使用 `{}` 包裹
- **类型只能使用 Shopify 支持的内置类型**

## 允许的类型

| 类型 | 说明 |
|------|------|
| `product` | Shopify 产品对象 |
| `variant` | Shopify 变体对象 |
| `image` | Shopify 图片对象 |
| `collection` | Shopify 集合对象 |
| `block` | Shopify block 对象 |
| `string` | 字符串 |
| `number` | 数字 |
| `boolean` | 布尔值 |
| `array` | 数组 |

## 完整示例

```liquid
{% doc %}
  component-name — 组件说明

  功能描述。

  @param {product} product               Shopify 产品对象
  @param {variant} [variant]             变体对象，默认 product.selected_or_first_available_variant
  @param {string} [title]                覆盖标题，默认自动读取
  @param {number} [price]                覆盖价格（分为单位）
  @param {boolean} [show_price]          显示价格区域（默认 true）
  @param {string} [tags_slot]            标签区域 DOM
  @param {image} [scene_image_pc]        PC 场景图，传入即启用场景图
{% enddoc %}
```

## 反例

```liquid
❌ @param {string} {number} bad_param               — 不能有多个类型
❌ @param [name]                                     — 缺少类型
❌ @param {string} name1 / name2                      — 不能一行多个参数
❌ @param {object} complex_type                       — object 不是允许的类型，改用具体 Shopify 类型
❌ @param {product} product   @param {string} title   — 不能一行多个 @param
❌ @param {string} key | filter                       — 参数名不能用 Liquid 语法
```

## 检查清单

执行或审查 doc 块时，逐项确认：

1. 必选参数无 `[]`，可选参数有 `[]`
2. 每行一个 `@param`
3. `{type}` 只有一个，且属于允许类型列表
4. 说明包含默认值（可选参数）
5. doc 中声明的参数与代码中实际 `render` 调用传递的参数一致（无遗漏、无多余）
