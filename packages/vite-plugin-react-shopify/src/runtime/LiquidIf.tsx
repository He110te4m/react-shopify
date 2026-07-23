import { createElement, Fragment, memo } from "react";
import type { ReactNode } from "react";
import {
  compileShopifyReference,
  isShopifyReference,
  type ShopifyCondition,
} from "../contract/expression";
import { resolveShopifyReference, useShopifyContext } from "./ShopifyContext";

export interface LiquidIfProps {
  condition: string | boolean | ShopifyCondition;
  trackKey?: string;
  unless?: boolean;
  children?: ReactNode;
  fallback?: ReactNode;
}

function isTruthy(value: unknown): boolean {
  if (value === false || value == null || value === "" || value === "0" || value === "false") {
    return false;
  }
  return true;
}

function LiquidIfImpl({
  condition,
  trackKey,
  unless = false,
  children,
  fallback = null,
}: LiquidIfProps) {
  const ctx = useShopifyContext();
  const reference = isShopifyReference(condition) ? condition : resolveShopifyReference(condition);
  const compiled = reference
    ? compileShopifyReference(reference)
    : typeof condition === "boolean"
      ? condition
        ? "true"
        : "false"
      : condition;
  const key = trackKey ?? `condition:${unless ? "unless" : "if"}:${compiled}`;

  if (ctx.phase === "ssg") {
    ctx.track(key, {
      type: "boolean",
      bridge: `{% if ${compiled} %}true{% else %}false{% endif %}`,
    });
    return (
      <>
        {ctx.serialize(`{% ${unless ? "unless" : "if"} ${compiled} %}`)}
        {children}
        {fallback === null ? null : ctx.serialize("{% else %}")}
        {fallback}
        {ctx.serialize(`{% end${unless ? "unless" : "if"} %}`)}
      </>
    );
  }

  const matched = typeof condition === "boolean" ? condition : isTruthy(ctx.read(key));
  if (unless ? matched : !matched) return <Fragment>{fallback}</Fragment>;
  return <Fragment>{children}</Fragment>;
}

export const LiquidIf = memo(LiquidIfImpl);

type RenderBranch = ReactNode | (() => ReactNode);

function renderBranch(branch: RenderBranch | undefined): ReactNode {
  return typeof branch === "function" ? branch() : branch;
}

/** Functional conditional rendered as Liquid during SSG and React on the client. */
export function when(
  condition: boolean | ShopifyCondition,
  truthy: RenderBranch,
  fallback?: RenderBranch,
): React.ReactElement {
  return createElement(
    LiquidIf,
    { condition, fallback: renderBranch(fallback) },
    renderBranch(truthy),
  );
}

export function unless(
  condition: boolean | ShopifyCondition,
  truthy: RenderBranch,
  fallback?: RenderBranch,
): React.ReactElement {
  return createElement(
    LiquidIf,
    { condition, unless: true, fallback: renderBranch(fallback) },
    renderBranch(truthy),
  );
}
