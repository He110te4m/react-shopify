/**
 * @file StaticBlock component — renders a fixed-position Shopify theme block.
 *
 * Static blocks are Liquid-owned DOM, same as Island/BlockSlot content.  The
 * component emits a `{% content_for "block" ... %}` expression during SSG,
 * then replays Shopify-rendered HTML from the entry pre-capture map on the
 * client so hydration sees identical markup.
 */
import { createElement, memo, useContext, useLayoutEffect, useRef } from "react";
import { ATTR_ISLAND, GW_ISLAND_COUNTER } from "../constants/attributes";
import { useShopifyContext } from "./ShopifyContext";
import {
  LiquidDataContext,
  LIQUID_ISLAND_COUNTER_KEY,
  LIQUID_ISLAND_DATA_KEY,
} from "./provider";

const TAG_STATIC_BLOCK = "shopify-static-block";

export type StaticBlockLiquidValue = { liquid: string };
export type StaticBlockDataValue = string | number | boolean | null | StaticBlockLiquidValue;

export type StaticBlockProps = {
  type: string;
  id: string;
  data?: Record<string, StaticBlockDataValue>;
  as?: string;
  className?: string;
  style?: React.CSSProperties;
};

function escapeLiquidString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function assertLiquidName(name: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid StaticBlock data key: ${name}`);
  }
}

function isLiquidValue(value: StaticBlockDataValue): value is StaticBlockLiquidValue {
  return typeof value === "object" && value !== null && "liquid" in value;
}

function renderDataValue(value: StaticBlockDataValue): string {
  if (isLiquidValue(value)) return value.liquid;
  if (value === null) return "nil";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "nil";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `"${escapeLiquidString(value)}"`;
}

function buildStaticBlockExpression(
  type: string,
  id: string,
  data: Record<string, StaticBlockDataValue> | undefined,
): string {
  const parts = [
    `type: "${escapeLiquidString(type)}"`,
    `id: "${escapeLiquidString(id)}"`,
  ];

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      assertLiquidName(key);
      parts.push(`${key}: ${renderDataValue(value)}`);
    }
  }

  return `{% content_for "block", ${parts.join(", ")} %}`;
}

function StaticBlockImpl({
  type,
  id,
  data,
  as: Tag = TAG_STATIC_BLOCK,
  className,
  style,
}: StaticBlockProps) {
  const ctx = useShopifyContext();
  const liquidData = useContext(LiquidDataContext);
  const keyRef = useRef<string | null>(null);
  const ref = useRef<any>(null);

  if (ctx.phase === "ssg") {
    const counter: { count: number } =
      (globalThis as any)[GW_ISLAND_COUNTER] ?? { count: 0 };
    const key = `i${counter.count++}`;
    (globalThis as any)[GW_ISLAND_COUNTER] = counter;

    if (data) {
      for (const value of Object.values(data)) {
        if (isLiquidValue(value)) ctx.track(value.liquid);
      }
    }

    return createElement(Tag, {
      className,
      style,
      [ATTR_ISLAND]: key,
      suppressHydrationWarning: true,
      dangerouslySetInnerHTML: { __html: buildStaticBlockExpression(type, id, data) },
    });
  }

  if (keyRef.current === null) {
    const counter = liquidData[LIQUID_ISLAND_COUNTER_KEY] ?? { count: 0 };
    liquidData[LIQUID_ISLAND_COUNTER_KEY] = counter;
    keyRef.current = `i${counter.count++}`;
  }

  const key = keyRef.current;
  const html = liquidData[LIQUID_ISLAND_DATA_KEY]?.[key] ?? "";

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.dispatchEvent(
        new CustomEvent("ssg:blocks:ready", { bubbles: true }),
      );
    }
  });

  return createElement(Tag, {
    ref,
    className,
    style,
    [ATTR_ISLAND]: key,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: html },
  });
}

export const StaticBlock = memo(StaticBlockImpl, () => true);
