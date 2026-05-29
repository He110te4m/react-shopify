import { useContext, useEffect, useState } from "react";
import { LiquidDataContext } from "./provider";

function useLiquidRaw(expr: string): string | undefined {
  const data = useContext(LiquidDataContext) as Record<string, any>;

  if (typeof (globalThis as any).document === "undefined") {
    const tracker = (globalThis as any).__shopify_ssg_liquid_track as Set<string> | undefined;
    if (tracker) tracker.add(expr);
    return `{{ ${expr} }}`;
  }

  if (Object.prototype.hasOwnProperty.call(data, expr)) {
    return data[expr];
  }

  return undefined;
}

function useLiquidRawValues<T extends Record<string, string>>(
  map: T,
): { [K in keyof T]: string | undefined } {
  const data = useContext(LiquidDataContext) as Record<string, any>;

  if (typeof (globalThis as any).document === "undefined") {
    const tracker = (globalThis as any).__shopify_ssg_liquid_track as Set<string> | undefined;
    const values = {} as Record<string, string | undefined>;
    for (const [key, expr] of Object.entries(map)) {
      if (tracker) tracker.add(expr);
      values[key] = `{{ ${expr} }}`;
    }
    return values as { [K in keyof T]: string | undefined };
  }

  const values = {} as Record<string, string | undefined>;
  for (const [key, expr] of Object.entries(map)) {
    values[key] = Object.prototype.hasOwnProperty.call(data, expr)
      ? data[expr]
      : undefined;
  }
  return values as { [K in keyof T]: string | undefined };
}

export function parseLiquidBoolean(value: string | boolean | undefined | null): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  return value !== "" && value !== "0" && value !== "false";
}

export function parseLiquidNumber(
  value: string | number | undefined | null,
  defaultVal: number = 0,
): number {
  if (typeof value === "number") return Number.isNaN(value) ? defaultVal : value;
  if (value === undefined || value === null) return defaultVal;
  const num = Number(value);
  return Number.isNaN(num) ? defaultVal : num;
}

export type LiquidTypeMode = "string" | "number" | "boolean";

type Setter<T> = (val: T | ((prev: T) => T)) => void;

type ValueForMode<M extends LiquidTypeMode | undefined> =
  M extends "number" ? number
  : M extends "boolean" ? boolean
  : string | undefined;

function useLiquidValue(expr: string): [string | undefined, Setter<string | undefined>];
function useLiquidValue(expr: string, type: "string"): [string | undefined, Setter<string | undefined>];
function useLiquidValue(expr: string, type: "number"): [number, Setter<number>];
function useLiquidValue(expr: string, type: "boolean"): [boolean, Setter<boolean>];
function useLiquidValue(
  expr: string,
  type: LiquidTypeMode = "string",
): [string | number | boolean | undefined, Setter<any>] {
  const raw = useLiquidRaw(expr);

  const defaultVal: any = type === "number" ? 0 : type === "boolean" ? false : raw;
  const [val, setVal] = useState(defaultVal);

  useEffect(() => {
    if (type === "number") setVal(parseLiquidNumber(raw, 0));
    else if (type === "boolean") setVal(parseLiquidBoolean(raw));
    else setVal(raw);
  }, [raw]);

  return [val, setVal];
}

type TypeModes<T extends Record<string, string>> = Partial<{
  [K in keyof T & string]: LiquidTypeMode;
}>;

type InferValues<T extends Record<string, string>, Types extends TypeModes<T>> = {
  [K in keyof T & string]: ValueForMode<Types[K]>;
};

function useLiquidValues<T extends Record<string, string>, const Types extends TypeModes<T> = {}>(
  map: T,
  types?: Types,
): InferValues<T, Types> {
  const raw = useLiquidRawValues(map);
  const keys = Object.keys(map) as (keyof T & string)[];
  const rawDep = keys.map((k) => raw[k]).join("\0");

  const [parsed, setParsed] = useState(() => {
    const vals = {} as Record<string, string | number | boolean | undefined>;
    for (const k of keys) {
      const mode: LiquidTypeMode = (types as Record<string, LiquidTypeMode>)?.[k] ?? "string";
      vals[k] = mode === "number" ? 0 : mode === "boolean" ? false : raw[k];
    }
    return vals;
  });

  useEffect(() => {
    setParsed((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        const mode: LiquidTypeMode = (types as Record<string, LiquidTypeMode>)?.[k] ?? "string";
        let v: string | number | boolean | undefined;
        if (mode === "number") v = parseLiquidNumber(raw[k], 0);
        else if (mode === "boolean") v = parseLiquidBoolean(raw[k]);
        else v = raw[k];
        if (v !== prev[k]) {
          next[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rawDep]);

  return parsed as InferValues<T, Types>;
}

function useSectionSettings(key: string): { value: string | undefined } {
  return { value: useLiquidRaw(`section.settings.${key}`) };
}

function useBlockSettings(key: string): { value: string | undefined } {
  return { value: useLiquidRaw(`block.settings.${key}`) };
}

function useSnippetParams(key: string): { value: string | undefined } {
  return { value: useLiquidRaw(key) };
}

function useBlockParams(key: string): { value: string | undefined } {
  return { value: useLiquidRaw(key) };
}

export {
  useLiquidValue,
  useLiquidValues,
  useSectionSettings,
  useBlockSettings,
  useSnippetParams,
  useBlockParams,
};
