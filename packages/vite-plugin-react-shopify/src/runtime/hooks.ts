/**
 * @file Runtime hooks for Shopify SSG React components.
 *
 * Provides React hooks that bridge Liquid template expressions and React state.
 * During SSR, hooks return raw `{{ expr }}` strings and register expressions
 * in a global tracker for the assembler. On the client, they read resolved
 * values from LiquidDataContext (populated by the JSON bridge injected into
 * the rendered HTML).
 */
import { useContext, useEffect, useState, useMemo } from "react";
import { LiquidDataContext } from "./provider";
import { GW_TRACK, GW_BLOCKS, GW_FILTERS } from "../constants/attributes";

/**
 * Returns the Liquid filter suffix (e.g. `" | img_url: 'master'"`) for a given
 * expression, based on the globally-registered filter map populated by the
 * renderer before SSR rendering.
 */
function getLiquidFilter(expr: string): string {
  const filterMap = (globalThis as any)[GW_FILTERS] as Record<string, string> | undefined;
  return filterMap?.[expr] ?? "";
}

/**
 * Resolves a single Liquid expression to its raw value.
 *
 * - **SSR**: registers the expression in `__shopify_ssg_liquid_track` and
 *   returns a raw `{{ expr }}` string (with optional filter suffix).
 * - **Client**: reads the resolved string value from LiquidDataContext.
 *
 * @returns The raw Liquid expression string (SSR) or the resolved value from
 *   the JSON bridge (client), or `undefined` if not found.
 */
function useLiquidRaw(expr: string): string | undefined {
  const data = useContext(LiquidDataContext) as Record<string, any>;

  if (typeof (globalThis as any).document === "undefined") {
    const tracker = (globalThis as any)[GW_TRACK] as Set<string> | undefined;
    if (tracker) tracker.add(expr);
    const filter = getLiquidFilter(expr);
    return `{{ ${expr}${filter} }}`;
  }

  if (Object.prototype.hasOwnProperty.call(data, expr)) {
    return data[expr];
  }

  return undefined;
}

/**
 * Batched version of `useLiquidRaw` — resolves multiple expressions at once.
 *
 * Accepts a name-to-expression mapping and returns the same shape with
 * resolved values. On SSR, all expressions are tracked in a single pass.
 *
 * @param map - Object mapping keys to Liquid expression strings.
 * @returns Object with the same keys, each mapped to the resolved value.
 */
function useLiquidRawValues<T extends Record<string, string>>(
  map: T,
): { [K in keyof T]: string | undefined } {
  const data = useContext(LiquidDataContext) as Record<string, any>;

  if (typeof (globalThis as any).document === "undefined") {
    const tracker = (globalThis as any)[GW_TRACK] as Set<string> | undefined;
    const values = {} as Record<string, string | undefined>;
    for (const [key, expr] of Object.entries(map)) {
      if (tracker) tracker.add(expr);
      const filter = getLiquidFilter(expr);
      values[key] = `{{ ${expr}${filter} }}`;
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

/**
 * Parses a Liquid value into a boolean following Shopify truthiness rules:
 * `false`, `""`, `"0"`, `undefined`, and `null` are falsy; everything else is
 * truthy.
 */
export function parseLiquidBoolean(value: string | boolean | undefined | null): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  return value !== "" && value !== "0" && value !== "false";
}

/**
 * Parses a Liquid value into a number, falling back to `defaultVal` (default 0)
 * when the value is `undefined`, `null`, or unparseable.
 */
export function parseLiquidNumber(
  value: string | number | undefined | null,
  defaultVal: number = 0,
): number {
  if (typeof value === "number") return Number.isNaN(value) ? defaultVal : value;
  if (value === undefined || value === null) return defaultVal;
  const num = Number(value);
  return Number.isNaN(num) ? defaultVal : num;
}

/** Type mode hint for `useLiquidValue` — controls how the raw string is coerced. */
export type LiquidTypeMode = "string" | "number" | "boolean";

type Setter<T> = (val: T | ((prev: T) => T)) => void;

type ValueForMode<M extends LiquidTypeMode | undefined> =
  M extends "number" ? number
  : M extends "boolean" ? boolean
  : string | undefined;

/**
 * Reads a single Liquid setting and returns a React state tuple.
 *
 * Overloads allow compile-time type narrowing based on the `type` argument:
 * - No `type` or `"string"` → `[string | undefined, Setter]`
 * - `"number"` → `[number, Setter]`
 * - `"boolean"` → `[boolean, Setter]`
 *
 * @param expr - Liquid expression to read (e.g. `"section.settings.title"`).
 * @param type  - Type coercion mode: `"string"` (default), `"number"`, or `"boolean"`.
 */
function useLiquidValue(expr: string): [string | undefined, Setter<string | undefined>];
function useLiquidValue(expr: string, type: "string"): [string | undefined, Setter<string | undefined>];
function useLiquidValue(expr: string, type: "number"): [number, Setter<number>];
function useLiquidValue(expr: string, type: "boolean"): [boolean, Setter<boolean>];
function useLiquidValue(
  expr: string,
  type: LiquidTypeMode = "string",
): [string | number | boolean | undefined, Setter<any>] {
  const raw = useLiquidRaw(expr);
  const isSSR = typeof (globalThis as any).document === "undefined";

  // Determine initial value: booleans always start false; numbers are parsed
  // on the client and deferred to `raw` placeholders on SSR; strings use raw as-is.
  let initialVal: any;
  if (type === "boolean") {
    initialVal = false;
  } else if (type === "number") {
    initialVal = isSSR ? raw : parseLiquidNumber(raw, 0);
  } else {
    initialVal = raw;
  }

  const [val, setVal] = useState(initialVal);

  useEffect(() => {
    if (type === "number") setVal(parseLiquidNumber(raw, 0));
    else if (type === "boolean") setVal(parseLiquidBoolean(raw));
    else setVal(raw);
  }, [raw]);

  return [val, setVal];
}

/** Maps individual keys in a Liquid expression map to a type mode (string/number/boolean). */
type TypeModes<T extends Record<string, string>> = Partial<{
  [K in keyof T & string]: LiquidTypeMode;
}>;

/** Infers the resolved value types for each key in a Liquid expression map. */
type InferValues<T extends Record<string, string>, Types extends TypeModes<T>> = {
  [K in keyof T & string]: ValueForMode<Types[K]>;
};

/**
 * Reads multiple Liquid settings simultaneously and returns a single state object.
 *
 * Like `useLiquidValue` but batched — takes a name-to-expression mapping and an
 * optional name-to-type-mode mapping. Returns a plain object with the resolved
 * (and type-coerced) values.
 *
 * @param map   - Object mapping keys to Liquid expression strings.
 * @param types - Optional per-key type mode overrides (default: `"string"`).
 */
function useLiquidValues<T extends Record<string, string>, const Types extends TypeModes<T> = {}>(
  map: T,
  types?: Types,
): InferValues<T, Types> {
  const raw = useLiquidRawValues(map);
  const keys = Object.keys(map) as (keyof T & string)[];
  const rawDep = keys.map((k) => raw[k]).join("\0");
  const isSSR = typeof (globalThis as any).document === "undefined";

  const [parsed, setParsed] = useState(() => {
    const vals = {} as Record<string, string | number | boolean | undefined>;
    for (const k of keys) {
      const mode: LiquidTypeMode = (types as Record<string, LiquidTypeMode>)?.[k] ?? "string";
      if (mode === "boolean") {
        vals[k] = false;
      } else if (mode === "number") {
        vals[k] = isSSR ? raw[k] : parseLiquidNumber(raw[k], 0);
      } else {
        vals[k] = raw[k];
      }
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

type SettingsHook = {
  (key: string): [string | undefined, Setter<string | undefined>];
  (key: string, type: "string"): [string | undefined, Setter<string | undefined>];
  (key: string, type: "number"): [number, Setter<number>];
  (key: string, type: "boolean"): [boolean, Setter<boolean>];
};

function createSettingsHook(prefix: string): SettingsHook {
  const hook = (
    key: string,
    type: LiquidTypeMode = "string",
  ): [any, Setter<any>] => {
    const expr = `${prefix}${key}`;
    return (useLiquidValue as (e: string, t?: LiquidTypeMode) => any)(expr, type);
  };
  return hook as SettingsHook;
}

/**
 * Reads a section-level setting value with React state.
 *
 * Equivalent to `useLiquidValue(\`section.settings.${key}\`[, type])`.
 */
const useSectionSettings = createSettingsHook("section.settings.");

/**
 * Reads a block-level setting value with React state.
 *
 * Equivalent to `useLiquidValue(\`block.settings.${key}\`[, type])`.
 */
const useBlockSettings = createSettingsHook("block.settings.");

/**
 * Reads a theme-level setting value with React state.
 *
 * Equivalent to `useLiquidValue(\`settings.${key}\`[, type])`.
 * Theme settings use the `settings.X` namespace (no `section.` prefix).
 */
const useThemeSettings = createSettingsHook("settings.");

/**
 * Reads a snippet parameter by name.
 */
function useSnippetParams(key: string): { value: string | undefined } {
  return { value: useLiquidRaw(key) };
}

/**
 * Reads a block parameter by name.
 */
function useBlockParams(key: string): { value: string | undefined } {
  return { value: useLiquidRaw(key) };
}

/** Regex to extract `{{ expr }}` tokens from Liquid code — used to track referenced expressions. */
const LIQUID_EXPR_RE = /\{\{([^{}]+)\}\}/g;

/**
 * Registers a block of raw Liquid code for injection into the generated
 * `.liquid` file. During SSR the code (and any `{{ expr }}` references it
 * contains) is accumulated in global registries; on the client it is a no-op.
 *
 * The registered Liquid code is injected **before** the JSON bridge in the
 * assembled output so that any variables it defines are available for the
 * bridge's `json` filter.
 *
 * @param code - Raw Liquid template code (may include `{{ }}` expressions).
 * @returns Always returns an empty string — the Liquid code is rendered
 *   server-side only.
 */
function useLiquidBlock(code: string): string {
  const isSSR = typeof (globalThis as any).document === "undefined";

  useMemo(() => {
    if (!isSSR) return;

    const blocks = (globalThis as any)[GW_BLOCKS] as string[] | undefined;
    if (blocks) blocks.push(code);

    // Also track any Liquid expressions referenced inside the block code so
    // they are included in the JSON bridge.
    const tracker = (globalThis as any)[GW_TRACK] as Set<string> | undefined;
    if (tracker) {
      let match: RegExpExecArray | null;
      while ((match = LIQUID_EXPR_RE.exec(code)) !== null) {
        const fullExpr = match[1].trim();
        const pipeIdx = fullExpr.indexOf("|");
        const exprName = pipeIdx >= 0 ? fullExpr.substring(0, pipeIdx).trim() : fullExpr;
        if (exprName) tracker.add(exprName);
      }
    }
  }, [code, isSSR]);

  return "";
}

const useRawLiquid = useLiquidBlock;

export {
  useLiquidValue,
  useLiquidValues,
  useLiquidBlock,
  useRawLiquid,
  useSectionSettings,
  useBlockSettings,
  useThemeSettings,
  useSnippetParams,
  useBlockParams,
};
