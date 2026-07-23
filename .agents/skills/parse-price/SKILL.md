---
name: parse-price
description: Use this skill when the user requests price rendering, price parsing, or discount calculation. The skill parses regular prices, promotional prices, and common price formats found in Shopify stores.
allowed-tools: Read
---

# parse-price

## 概述

本 skill 提供 Shopify 主题中价格解析的标准方法。需要了解完整实现细节时，请 Read 以下核心源码文件。

## 核心文件

- **价格解析器**: `snippets/ndev-parse-price.liquid`
  将用户输入的货币字符串（如 `"$100.00"`、`"€100,00"`）或已为分格式的整数（如 `10000`）统一转为整数分格式（如 `$100.00 → 10000`）。

- **价格渲染组件**: `blocks/ndev-price.liquid`
  消费 `ndev-parse-price` 的解析结果，负责渲染售价、原价和折扣标签。

Read 这两个文件可获取完整实现逻辑、货币格式检测、千位分隔符处理、CSS 变量用法等细节。

这两个文件可以直接复用，用于快速价格处理与解析。

## 关键概念

### ndev-parse-price.liquid

- **输入**: `input_price` 参数，接受以下格式:
  - 带货币符号: `"$100.00"`, `"€100,00"`, `"¥1,999.99"`
  - 带货币代码: `"$100.00 USD"`, `"$100.00 USE"`
  - 纯字符串数字: `"100.00"`, `"100,00"`
  - 已为分格式的整数: `10000` (来自 `shopify variant.price`)
- **输出**: 整数分，通过 `echo` 输出，需配合 `capture` 接收。解析失败时返回 `0`
- **格式检测**: 自动根据店铺 `money` filter 输出判断小数点是 `. ` 还是 `,`，并据此处理千位分隔符

### ndev-price.liquid 工作流程

1. `capture` 调用 `render 'ndev-parse-price', input_price: price_input` → 获取价格字符串，无小数，单位为分
2. `| plus: 0` → 将 capture 得到的字符串结果转为数字类型，确保后续可参与数学运算
3. `| money` → 格式化售价和原价为带货币符号的显示字符串
4. `| money_without_trailing_zeros` → 格式化折扣金额（去除无意义的末尾零）
5. 折扣计算: `current_compare_price | minus: current_price`

### 价格输入优先级

```
Section 块设置 (section.settings.price / section.settings.compare_price / block.settings.price / block.settings.compare_price)
  → 变体 metafields (add_variant.price / add_variant.original_price)
  → 产品原生价格 (variant.price / variant.compare_at_price)
```

## 使用示例

```liquid
{%- liquid
  # 获取产品与变体
  assign cur_product = block.settings.product | default: product
  assign cur_variant = cur_product.selected_or_first_available_variant

  # 价格优先级：块设置 → 变体 metafields → 产品原生价格
  assign price_input = block.settings.price | default: cur_variant.metafields.add_variant.price | default: cur_variant.price
  assign compare_price_input = block.settings.compare_price | default: cur_variant.metafields.add_variant.original_price | default: cur_variant.compare_at_price

  # 1. 解析价格（capture 接收 echo 输出）
  capture current_price
    render 'ndev-parse-price', input_price: price_input
  endcapture
  capture current_compare_price
    render 'ndev-parse-price', input_price: compare_price_input
  endcapture

  # 2. 转换为数字类型
  assign current_price = current_price | plus: 0
  assign current_compare_price = current_compare_price | plus: 0

  # 3. 计算折扣（可选）
  if current_compare_price > current_price and current_price > 0
    assign discount_value = current_compare_price | minus: current_price
    assign formatted_discount = discount_value | money_without_trailing_zeros
  endif

  # 4. 格式化显示
  assign formatted_price = current_price | money
  assign formatted_compare_price = current_compare_price | money
%}

<span class="sale-price">{{ formatted_price }}</span>
{% if current_compare_price > current_price %}
  <span class="original-price">{{ formatted_compare_price }}</span>
{% endif %}
{% if discount_value > 0 %}
  <span class="discount-badge">{{ formatted_discount }}</span>
{% endif %}
```

## 注意事项

- `capture` 获取的解析结果是 **字符串类型**，必须用 `| plus: 0` 转为数字才能进行数学运算和 `money` filter
- 价格在系统内部始终以 **分** 为单位存储和运算
- 比较价格 > 售价 且 售价 > 0 时才算有效折扣
- 空输入、解析失败均返回 `0`
