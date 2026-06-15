import { useMemo } from "react";
import { useShopifyContext } from "./ShopifyContext";

export type LiquidResolvedValue = string | number | boolean;

export type LiquidValue =
  | { kind: "expression"; expression: string }
  | { kind: "choice"; branches: Array<[condition: string, value: LiquidResolvedValue]>; fallback: LiquidResolvedValue };

export interface LiquidCssVarSpec {
  liquid: string;
  fallback: string;
  when?: string;
  key?: string;
}

export function liquid(expression: string): LiquidValue {
  return { kind: "expression", expression };
}

export function liquidChoice(
  branches: Array<[condition: string, value: LiquidResolvedValue]>,
  fallback: LiquidResolvedValue,
): LiquidValue {
  return { kind: "choice", branches, fallback };
}

export function liquidIf(
  condition: string,
  truthy: LiquidResolvedValue,
  fallback: LiquidResolvedValue = "",
): LiquidValue {
  return liquidChoice([[condition, truthy]], fallback);
}

function liquidLiteral(value: LiquidResolvedValue): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replace(/'/g, "\\'")}'`;
}

export function assignLiquidValue(varName: string, value: LiquidValue): string[] {
  if (value.kind === "expression") return [`assign ${varName} = ${value.expression}`];

  const lines = [`assign ${varName} = ${liquidLiteral(value.fallback)}`];
  value.branches.forEach(([condition, branchValue], index) => {
    lines.push(`${index === 0 ? "if" : "elsif"} ${condition}`);
    lines.push(`  assign ${varName} = ${liquidLiteral(branchValue)}`);
  });
  lines.push("endif");
  return lines;
}

function cssBridgeValue(spec: LiquidCssVarSpec): string {
  const fallback = JSON.stringify(spec.fallback);
  if (!spec.when) return `{{ ${spec.liquid} | json }}`;
  return `{% if ${spec.when} %}{{ ${spec.liquid} | json }}{% else %}${fallback}{% endif %}`;
}

function cssSsgValue(spec: LiquidCssVarSpec): string {
  if (!spec.when) return `{{ ${spec.liquid} }}`;
  return `{% if ${spec.when} %}{{ ${spec.liquid} }}{% else %}${spec.fallback}{% endif %}`;
}

export function useLiquidCssVars(
  vars: Record<`--${string}`, LiquidCssVarSpec>,
): React.CSSProperties {
  const ctx = useShopifyContext();

  return useMemo(() => {
    const style: Record<string, string> = {};

    for (const [name, spec] of Object.entries(vars)) {
      const key = spec.key ?? `css:${name}:${spec.liquid}:${spec.when ?? ""}`;
      if (ctx.phase === "ssg") {
        ctx.track(key, { bridge: cssBridgeValue(spec) });
        style[name] = cssSsgValue(spec);
      } else {
        style[name] = String(ctx.read(key) ?? spec.fallback);
      }
    }

    return style as React.CSSProperties;
  }, [ctx.phase, vars]);
}

function isTruthy(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

export function useLiquidClass(
  condition: string,
  className: string,
  options?: { key?: string; unless?: boolean },
): string | undefined {
  const ctx = useShopifyContext();
  const key = options?.key ?? `class:${condition}:${className}:${options?.unless ? "unless" : "if"}`;

  if (ctx.phase === "ssg") {
    ctx.track(key, {
      type: "boolean",
      bridge: `{% if ${condition} %}true{% else %}false{% endif %}`,
    });
    return `{% ${options?.unless ? "unless" : "if"} ${condition} %}${className}{% end${options?.unless ? "unless" : "if"} %}`;
  }

  const matched = isTruthy(ctx.read(key));
  return options?.unless ? (matched ? undefined : className) : matched ? className : undefined;
}

export function useLiquidDynamicClass(
  condition: string,
  valueExpr: string,
  className: (value: string) => string,
  key = `class:${condition}:${valueExpr}`,
): string | undefined {
  const ctx = useShopifyContext();

  if (ctx.phase === "ssg") {
    ctx.track(key, {
      bridge: `{% if ${condition} %}{{ ${valueExpr} | json }}{% else %}null{% endif %}`,
    });
    return `{% if ${condition} %}${className(`{{ ${valueExpr} }}`)}{% endif %}`;
  }

  const value = ctx.read(key);
  return typeof value === "string" && value ? className(value) : undefined;
}

export type LiquidValueInput<T extends string | number = string> = T | LiquidValue;
