import { createElement, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { compileShopifyReference, path, type ShopifyReference } from "../contract/expression";
import { useShopifyContext } from "./ShopifyContext";

export type ShopifyLoopValue<T> = T | ShopifyReference<T, "object">;

export interface LiquidEachProps<T> {
  collection: ShopifyReference<readonly T[], "object">;
  children: (item: ShopifyLoopValue<T>, index: number) => ReactNode;
  fallback?: ReactNode;
  itemName?: string;
  trackKey?: string;
}

let loopId = 0;

function LiquidEachImpl<T>({
  collection,
  children,
  fallback = null,
  itemName,
  trackKey,
}: LiquidEachProps<T>) {
  const ctx = useShopifyContext();
  const expression = compileShopifyReference(collection);
  const key = trackKey ?? `collection:${expression}`;

  if (ctx.phase === "ssg") {
    ctx.track(key, { expression });
    const variableName = itemName ?? `shopify_item_${loopId++}`;
    const item = path<T, "object">(variableName);
    return (
      <>
        {ctx.serialize(`{% for ${variableName} in ${expression} %}`)}
        {children(item, 0)}
        {fallback === null ? null : ctx.serialize("{% else %}")}
        {fallback}
        {ctx.serialize("{% endfor %}")}
      </>
    );
  }

  const value = ctx.read(key);
  if (!Array.isArray(value) || value.length === 0) return <Fragment>{fallback}</Fragment>;
  return (
    <>
      {value.map((item, index) => (
        <Fragment key={index}>{children(item as T, index)}</Fragment>
      ))}
    </>
  );
}

export function each<T>(
  collection: ShopifyReference<readonly T[], "object">,
  render: (item: ShopifyLoopValue<T>, index: number) => ReactNode,
  fallback?: ReactNode | (() => ReactNode),
): ReactElement {
  return createElement(LiquidEachImpl<T>, {
    collection,
    children: render,
    fallback: typeof fallback === "function" ? fallback() : fallback,
  });
}
