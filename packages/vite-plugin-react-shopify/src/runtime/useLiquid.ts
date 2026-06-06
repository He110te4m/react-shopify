import { useState, useCallback, useMemo } from "react";
import { useShopifyContext } from "./ShopifyContext";
import type { TrackOptions } from "./bridge";

export interface UseLiquidOptions {
  type?: TrackOptions["type"];
  bridge?: TrackOptions["bridge"];
  defaultValue?: unknown;
}

type Setter<T> = (value: T) => void;

/**
 * Unified hook for reading a Liquid value.
 *
 * Replaces: useLiquidValue, useSectionSettings, useBlockSettings,
 * useThemeSettings, useLiquid (v2.5).
 *
 * SSR: returns Liquid placeholder (`{{ expr }}`) and tracks the expression.
 * CSR: reads the resolved value from the JSON bridge.
 *
 * @example
 * const [title] = useLiquid('section.settings.title')
 * const [count] = useLiquid('block.settings.count', { type: 'number' })
 * const [image] = useLiquid('section.settings.image', {
 *   type: 'string',
 *   bridge: '{{ expr | image_url: width: 800 | json }}',
 * })
 */
export function useLiquid<T = string>(
  path: string,
  opts?: UseLiquidOptions,
): [T, Setter<T>] {
  const { isSSR, read, track } = useShopifyContext();
  const type = opts?.type ?? "string";

  const initial = useMemo(() => {
    if (isSSR) {
      track(path, opts ? { bridge: opts.bridge, type: opts.type } : undefined);

      if (type === "boolean") return false;
      if (type === "number") {
        return `{{ ${path} }}`; // number SSR: placeholder, not 0
      }
      return `{{ ${path} }}`;
    }

    // CSR: read from bridge
    const raw = read(path);
    if (type === "number") {
      if (raw == null) return (opts?.defaultValue ?? 0) as T;
      if (typeof raw === "number") return raw as T;
      const n = Number(raw);
      return (Number.isNaN(n) ? (opts?.defaultValue ?? 0) : n) as T;
    }
    if (type === "boolean") {
      // First render false for hydration safety
      return false as T;
    }
    return (raw ?? opts?.defaultValue) as T;
  }, [isSSR, path, type, opts?.bridge, opts?.defaultValue]);

  const [value, setValue] = useState<T>(initial as T);

  const setter = useCallback(
    (v: T) => {
      setValue(v);
    },
    [],
  );

  return [value, setter];
}

/**
 * Hook for injecting raw Liquid code blocks.
 *
 * Replaces: useLiquidBlock, useRawLiquid.
 *
 * SSR: pushes code to globalThis blocks registry + auto-tracks
 *   any `{{ expr }}` patterns found in the code.
 * CSR: no-op.
 */
export function useLiquidCode(code: string, trackedExprs?: string[]): void {
  const { isSSR, inject, track } = useShopifyContext();

  useMemo(() => {
    if (!isSSR) return;
    inject(code);
    if (trackedExprs) {
      for (const expr of trackedExprs) {
        track(expr);
      }
    }
  }, [isSSR, code, trackedExprs]);
}
