/**
 * @file `useLiquid` — read a Liquid value as React state.
 *
 * **SSG**: returns the Liquid placeholder `{{ path }}` and registers the
 * expression for inclusion in the JSON bridge. The placeholder is emitted
 * verbatim into the SSR HTML and resolved by Shopify at runtime.
 *
 * **Client** (both hydrating and mounted phases): reads the resolved value
 * from the bridge. Crucially the *initial* value seen by `useState` is the
 * bridge value — NOT a placeholder — so the first client render matches
 * what Liquid produced and hydration succeeds.
 *
 * The setter exists for parity with `useState` and lets components temp-
 * override the Liquid value locally. It does NOT sync back to Shopify.
 */
import { useState, useCallback, useMemo } from "react";
import { useShopifyContext } from "./ShopifyContext";
import type { TrackOptions } from "./bridge";

export interface UseLiquidOptions {
  type?: TrackOptions["type"];
  bridge?: TrackOptions["bridge"];
  defaultValue?: unknown;
}

type Setter<T> = (value: T) => void;

function coerce(raw: unknown, type: TrackOptions["type"], fallback: unknown): unknown {
  if (type === "number") {
    if (raw == null) return fallback ?? 0;
    if (typeof raw === "number") return raw;
    const n = Number(raw);
    return Number.isNaN(n) ? (fallback ?? 0) : n;
  }
  if (type === "boolean") {
    if (raw == null) return Boolean(fallback ?? false);
    if (typeof raw === "boolean") return raw;
    // Shopify Liquid truthiness: '', '0', 'false' all falsy.
    if (raw === "" || raw === "0" || raw === "false") return false;
    return Boolean(raw);
  }
  return raw ?? fallback;
}

/**
 * Read a Liquid value as React state.
 *
 * @example
 * const [title] = useLiquid<string>('section.settings.title')
 * const [count] = useLiquid<number>('block.settings.count', { type: 'number' })
 * const [image] = useLiquid<string>('section.settings.image', {
 *   type: 'string',
 *   bridge: "{{ section.settings.image | image_url: width: 800 | json }}",
 * })
 */
export function useLiquid<T = string>(
  path: string,
  opts?: UseLiquidOptions,
): [T, Setter<T>] {
  const ctx = useShopifyContext();
  const type = opts?.type ?? "string";

  const initial = useMemo(() => {
    if (ctx.phase === "ssg") {
      ctx.track(path, opts ? { bridge: opts.bridge, type: opts.type } : undefined);
      // Number/boolean placeholders need to be the *string form* because
      // they're embedded into HTML text. Liquid will replace them with
      // real numbers/booleans which the bridge then sends to the client.
      return `{{ ${path} }}` as unknown as T;
    }
    // Client (hydrating + mounted): read bridge value with type coercion.
    const raw = ctx.read(path);
    return coerce(raw, type, opts?.defaultValue) as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.phase, path, type, opts?.bridge, opts?.defaultValue]);

  const [value, setValue] = useState<T>(initial);

  const setter = useCallback((v: T) => setValue(v), []);

  return [value, setter];
}

/**
 * Inject raw Liquid code into the assembled `.liquid` file.
 *
 * SSG: pushes `code` into the globalThis blocks registry; auto-tracks any
 * supplied `trackedExprs` for inclusion in the JSON bridge.
 *
 * Client: no-op.
 */
export function useLiquidCode(code: string, trackedExprs?: string[]): void {
  const ctx = useShopifyContext();

  useMemo(() => {
    if (ctx.phase !== "ssg") return;
    ctx.inject(code);
    if (trackedExprs) {
      for (const expr of trackedExprs) ctx.track(expr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.phase, code, trackedExprs]);
}