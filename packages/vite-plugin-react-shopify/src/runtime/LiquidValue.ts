import { useMemo } from "react";
import {
  compileShopifyReference,
  isShopifyReference,
  unsafeShopifyReference,
  type ShopifyCondition,
  type ShopifyReference,
} from "../contract/expression";
import { useShopifyContext } from "./ShopifyContext";

export type LiquidResolvedValue = string | number | boolean;
export type LiquidConditionInput = ShopifyCondition | string;

export type LiquidValue =
  | { kind: "expression"; reference: ShopifyReference<LiquidResolvedValue, any> }
  | {
      kind: "choice";
      branches: Array<[condition: LiquidConditionInput, value: LiquidResolvedValue]>;
      fallback: LiquidResolvedValue;
    };

export interface LiquidCssVarSpec {
  value?: ShopifyReference<string | number, any>;
  /** @deprecated Use `value` with a typed Shopify reference. */
  liquid?: string;
  fallback: string;
  when?: LiquidConditionInput;
  key?: string;
}

function compileCondition(condition: LiquidConditionInput): string {
  return isShopifyReference(condition) ? compileShopifyReference(condition) : condition;
}

function compileValue(value: ShopifyReference<unknown, any> | string): string {
  return isShopifyReference(value) ? compileShopifyReference(value) : value;
}

export function liquid(
  expression: ShopifyReference<LiquidResolvedValue, any> | string,
): LiquidValue {
  return {
    kind: "expression",
    reference: isShopifyReference(expression)
      ? expression
      : unsafeShopifyReference<LiquidResolvedValue>(expression),
  };
}

export function liquidChoice(
  branches: Array<[condition: LiquidConditionInput, value: LiquidResolvedValue]>,
  fallback: LiquidResolvedValue,
): LiquidValue {
  return { kind: "choice", branches, fallback };
}

export function liquidIf(
  condition: LiquidConditionInput,
  truthy: LiquidResolvedValue,
  fallback: LiquidResolvedValue = "",
): LiquidValue {
  return liquidChoice([[condition, truthy]], fallback);
}

function liquidLiteral(value: LiquidResolvedValue): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

export function assignLiquidValue(varName: string, value: LiquidValue): string[] {
  if (value.kind === "expression") {
    return [`assign ${varName} = ${compileShopifyReference(value.reference)}`];
  }

  const lines = [`assign ${varName} = ${liquidLiteral(value.fallback)}`];
  value.branches.forEach(([condition, branchValue], index) => {
    lines.push(`${index === 0 ? "if" : "elsif"} ${compileCondition(condition)}`);
    lines.push(`  assign ${varName} = ${liquidLiteral(branchValue)}`);
  });
  lines.push("endif");
  return lines;
}

function resolveCssValue(spec: LiquidCssVarSpec): string {
  if (spec.value) return compileShopifyReference(spec.value);
  if (spec.liquid) return spec.liquid;
  throw new TypeError("Liquid CSS variable requires a typed `value`");
}

function cssBridgeValue(spec: LiquidCssVarSpec): string {
  const value = resolveCssValue(spec);
  const fallback = JSON.stringify(spec.fallback);
  if (!spec.when) return `{{ ${value} | json }}`;
  return `{% if ${compileCondition(spec.when)} %}{{ ${value} | json }}{% else %}${fallback}{% endif %}`;
}

function cssSsgValue(spec: LiquidCssVarSpec): string {
  const value = resolveCssValue(spec);
  if (!spec.when) return `{{ ${value} }}`;
  return `{% if ${compileCondition(spec.when)} %}{{ ${value} }}{% else %}${spec.fallback}{% endif %}`;
}

export function useLiquidCssVars(
  vars: Record<`--${string}`, LiquidCssVarSpec>,
): React.CSSProperties {
  const ctx = useShopifyContext();

  return useMemo(() => {
    const style: Record<string, string> = {};

    for (const [name, spec] of Object.entries(vars)) {
      const value = resolveCssValue(spec);
      const condition = spec.when ? compileCondition(spec.when) : "";
      const key = spec.key ?? `css:${name}:${value}:${condition}`;
      if (ctx.phase === "ssg") {
        ctx.track(key, { bridge: cssBridgeValue(spec) });
        style[name] = ctx.serialize(cssSsgValue(spec));
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
  condition: LiquidConditionInput,
  className: string,
  options?: { key?: string; unless?: boolean },
): string | undefined {
  const ctx = useShopifyContext();
  const compiled = compileCondition(condition);
  const key = options?.key ?? `class:${compiled}:${className}:${options?.unless ? "unless" : "if"}`;

  if (ctx.phase === "ssg") {
    ctx.track(key, {
      type: "boolean",
      bridge: `{% if ${compiled} %}true{% else %}false{% endif %}`,
    });
    return ctx.serialize(
      `{% ${options?.unless ? "unless" : "if"} ${compiled} %}${className}{% end${options?.unless ? "unless" : "if"} %}`,
    );
  }

  const matched = isTruthy(ctx.read(key));
  return options?.unless ? (matched ? undefined : className) : matched ? className : undefined;
}

export function useLiquidDynamicClass(
  condition: LiquidConditionInput,
  value: ShopifyReference<string, any> | string,
  className: (value: string) => string,
  trackKey?: string,
): string | undefined {
  const ctx = useShopifyContext();
  const compiledCondition = compileCondition(condition);
  const compiledValue = compileValue(value);
  const key = trackKey ?? `class:${compiledCondition}:${compiledValue}`;

  if (ctx.phase === "ssg") {
    ctx.track(key, {
      bridge: `{% if ${compiledCondition} %}{{ ${compiledValue} | json }}{% else %}null{% endif %}`,
    });
    return ctx.serialize(
      `{% if ${compiledCondition} %}${className(`{{ ${compiledValue} }}`)}{% endif %}`,
    );
  }

  const resolved = ctx.read(key);
  return typeof resolved === "string" && resolved ? className(resolved) : undefined;
}

export type LiquidValueInput<T extends string | number = string> =
  | T
  | ShopifyReference<T, any>
  | LiquidValue
  | (T extends string ? string : never);
