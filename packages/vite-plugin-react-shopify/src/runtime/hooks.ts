import { useContext } from "react";
import { LiquidDataContext } from "./provider";

function useLiquid(expr: string): { value: string | undefined } {
  const data = useContext(LiquidDataContext) as Record<string, any>;

  if (typeof (globalThis as any).document === "undefined") {
    const tracker = (globalThis as any).__shopify_ssg_liquid_track as Set<string> | undefined;
    if (tracker) tracker.add(expr);
    return { value: `{{ ${expr} }}` };
  }

  if (Object.prototype.hasOwnProperty.call(data, expr)) {
    return { value: data[expr] };
  }

  return { value: undefined };
}

function useLiquidValues<T extends Record<string, string>>(
  map: T,
): { values: { [K in keyof T]: string | undefined } } {
  const data = useContext(LiquidDataContext) as Record<string, any>;

  if (typeof (globalThis as any).document === "undefined") {
    const tracker = (globalThis as any).__shopify_ssg_liquid_track as Set<string> | undefined;
    const values = {} as Record<string, string | undefined>;
    for (const [key, expr] of Object.entries(map)) {
      if (tracker) tracker.add(expr);
      values[key] = `{{ ${expr} }}`;
    }
    return { values: values as { [K in keyof T]: string | undefined } };
  }

  const values = {} as Record<string, string | undefined>;
  for (const [key, expr] of Object.entries(map)) {
    values[key] = Object.prototype.hasOwnProperty.call(data, expr)
      ? data[expr]
      : undefined;
  }
  return { values: values as { [K in keyof T]: string | undefined } };
}

function useSectionSettings(key: string): { value: string | undefined } {
  return useLiquid(`section.settings.${key}`);
}

function useBlockSettings(key: string): { value: string | undefined } {
  return useLiquid(`block.settings.${key}`);
}

function useSnippetParams(key: string): { value: string | undefined } {
  return useLiquid(key);
}

function useBlockParams(key: string): { value: string | undefined } {
  return useLiquid(key);
}

export {
  useLiquid,
  useLiquidValues,
  useSectionSettings,
  useBlockSettings,
  useSnippetParams,
  useBlockParams,
};

/** SSR-safe boolean parser: treats Liquid expression strings as truthy, real booleans as-is */
export function parseLiquidBoolean(value: string | boolean | undefined | null): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  return value !== "" && value !== "0" && value !== "false";
}

/** SSR-safe number parser: returns defaultVal for unparseable SSR placeholders */
export function parseLiquidNumber(
  value: string | number | undefined | null,
  defaultVal: number = 0,
): number {
  if (typeof value === "number") return Number.isNaN(value) ? defaultVal : value;
  if (value === undefined || value === null) return defaultVal;
  const num = Number(value);
  return Number.isNaN(num) ? defaultVal : num;
}
