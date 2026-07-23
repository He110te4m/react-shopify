import type { ReactNode } from "react";
import {
  compileShopifyReference,
  isShopifyReference,
  type ShopifyReference,
} from "../contract/expression";
import { useShopifyContext } from "./ShopifyContext";

export interface ShopifyOutputProps<T extends string | number | boolean | null> {
  value: T | ShopifyReference<T, "text">;
}

/** Render a typed expression or its browser value as a React text node. */
export function ShopifyOutput<T extends string | number | boolean | null>({
  value,
}: ShopifyOutputProps<T>) {
  const ctx = useShopifyContext();
  if (!isShopifyReference(value)) return value as ReactNode;

  const expression = compileShopifyReference(value);
  if (ctx.phase === "ssg") {
    ctx.track(expression);
    return ctx.read(expression, value) as ReactNode;
  }
  return (ctx.read(expression) ?? null) as ReactNode;
}
