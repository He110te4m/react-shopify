import { Fragment, memo } from "react";
import { useShopifyContext } from "./ShopifyContext";

export interface LiquidIfProps {
  condition: string;
  trackKey?: string;
  unless?: boolean;
  children?: React.ReactNode;
}

function isTruthy(value: unknown): boolean {
  if (value === false || value == null || value === "" || value === "0" || value === "false") {
    return false;
  }
  return true;
}

function LiquidIfImpl({ condition, trackKey = condition, unless = false, children }: LiquidIfProps) {
  const ctx = useShopifyContext();

  if (ctx.phase === "ssg") {
    ctx.track(trackKey, {
      type: "boolean",
      bridge: `{% if ${condition} %}true{% else %}false{% endif %}`,
    });
    return (
      <>
        {`{% ${unless ? "unless" : "if"} ${condition} %}`}
        {children}
        {`{% end${unless ? "unless" : "if"} %}`}
      </>
    );
  }

  const matched = isTruthy(ctx.read(trackKey));
  if (unless ? matched : !matched) return null;
  return <Fragment>{children}</Fragment>;
}

export const LiquidIf = memo(LiquidIfImpl);
