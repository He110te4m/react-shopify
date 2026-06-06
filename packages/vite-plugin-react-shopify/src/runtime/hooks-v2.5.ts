/**
 * V2.5 hooks — coexisting read-only `useLiquid` alternative.
 *
 * Does NOT replace useLiquidValue.  Both can be used in the same project.
 */
import { useContext, useEffect, useState } from "react";
import { LiquidDataContext } from "./provider";
import { GW_TRACK, GW_FILTERS } from "../constants/attributes";

function useLiquidRaw(expr: string): string | undefined {
  const data = useContext(LiquidDataContext) as Record<string, any>;
  if (typeof (globalThis as any).document === "undefined") {
    const tracker = (globalThis as any)[GW_TRACK] as Set<string> | undefined;
    if (tracker) tracker.add(expr);
    const filterMap = (globalThis as any)[GW_FILTERS] as Record<string, string> | undefined;
    const filter = filterMap?.[expr] ?? "";
    return `{{ ${expr}${filter} }}`;
  }
  if (Object.prototype.hasOwnProperty.call(data, expr)) return data[expr];
  return undefined;
}

export function useLiquid(expr: string): string | undefined;
export function useLiquid(expr: string, type: "string"): string | undefined;
export function useLiquid(expr: string, type: "number"): number;
export function useLiquid(expr: string, type: "boolean"): boolean;
export function useLiquid(expr: string, type: "string" | "number" | "boolean" = "string"): string | number | boolean | undefined {
  const raw = useLiquidRaw(expr);
  const isSSR = typeof (globalThis as any).document === "undefined";
  let init: any;
  if (type === "boolean") init = false;
  else if (type === "number") init = isSSR ? raw : (Number(raw) || 0);
  else init = raw;
  const [val, setVal] = useState(init);
  useEffect(() => {
    if (type === "number") setVal(Number(raw) || 0);
    else if (type === "boolean") setVal(raw !== "" && raw !== "0" && raw !== "false");
    else setVal(raw);
  }, [raw]);
  return val;
}
