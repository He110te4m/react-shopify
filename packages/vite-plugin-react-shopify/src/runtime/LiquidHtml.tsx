import { Island } from "./Island";

export interface LiquidHtmlProps {
  expression: string;
  as?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Explicit sink for Liquid expressions that resolve to HTML. */
export function LiquidHtml({ expression, ...props }: LiquidHtmlProps) {
  return <Island expression={`{{ ${expression} }}`} {...props} />;
}
