/**
 * @file Shared utilities for runtime components (ShopifyImage, ShopifyVideo, etc.).
 */

import { useContext } from "react";
import { LiquidDataContext } from "./provider";
import { GW_TRACK, GW_BLOCKS } from "../constants/attributes";

/** HTML-escape a string for safe innerHTML usage. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Whether we are in the SSG server-side rendering phase. */
export function isSSR(): boolean {
  return typeof (globalThis as any).document === "undefined";
}

/**
 * Track a Liquid expression so it appears in the JSON bridge.
 * Must be called **only during SSR**.
 */
export function trackExpr(expr: string): void {
  const tracker = (globalThis as any)[GW_TRACK] as
    | Set<string>
    | undefined;
  if (tracker) tracker.add(expr);
}

/**
 * Resolves an expression value from the client-side JSON bridge.
 * Returns {@code undefined} when called during SSR or when the key
 * is missing from the bridge data.
 */
export function useLiquidContext(): {
  data: Record<string, any>;
  isSsr: boolean;
  /** Read a tracked expression's resolved value (client only). */
  get: (expr: string) => string | undefined;
} {
  const data = useContext(LiquidDataContext) as Record<string, any>;
  const ssr = typeof (globalThis as any).document === "undefined";

  function get(expr: string): string | undefined {
    if (ssr) return undefined;
    if (Object.prototype.hasOwnProperty.call(data, expr)) return data[expr];
    return undefined;
  }

  return { data, isSsr: ssr, get };
}

/**
 * Push a raw Liquid block into the global registry so the assembler
 * injects it before the JSON bridge.
 */
export function pushLiquidBlock(code: string): void {
  const blocks = (globalThis as any)[GW_BLOCKS] as
    | string[]
    | undefined;
  if (blocks) blocks.push(code);
}
