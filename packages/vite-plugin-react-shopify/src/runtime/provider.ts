/**
 * @file React context provider for Liquid data consumed by runtime hooks.
 *
 * The `LiquidDataContext` carries server-rendered Liquid values (from the JSON
 * bridge) down to {@link useLiquidValue} and related hooks during client-side
 * hydration. Without this provider, hooks return `undefined` on the client.
 */

import { createContext } from "react";

export const LiquidDataContext = createContext<Record<string, any>>({});
export const LiquidDataProvider = LiquidDataContext.Provider;
