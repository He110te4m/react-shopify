import { Island } from "./Island";
import {
  compileShopifyReference,
  isShopifyReference,
  type ShopifyReference,
} from "../contract/expression";

export interface LiquidHtmlProps {
  expression: string | ShopifyReference<string, "html">;
  as?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Explicit sink for Liquid expressions that resolve to HTML. */
export function LiquidHtml({ expression, ...props }: LiquidHtmlProps) {
  const compiled = isShopifyReference(expression)
    ? compileShopifyReference(expression)
    : expression;
  return <Island expression={`{{ ${compiled} }}`} {...props} />;
}
