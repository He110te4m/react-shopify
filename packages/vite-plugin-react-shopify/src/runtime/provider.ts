/**
 * @file React context providing Liquid bridge data during hydration.
 *
 * The provider is wrapped around each hydrated React tree by the
 * entry-template's `hydrate()` function. It carries resolved Liquid
 * expression values (read from the inline `<script data-ssg-liquid>` JSON
 * bridge) so hooks like {@link useLiquid} can return the correct value on
 * the first client render — keeping React vdom consistent with the DOM
 * that Liquid produced server-side.
 */
import { createContext } from "react";

export const LiquidDataContext = createContext<Record<string, any>>({});

/**
 * Provider component. Used internally by the generated entry-module to wrap
 * the user's component during `hydrateRoot`. Exposed primarily for tests
 * and advanced manual mounting.
 */
export const LiquidDataProvider = LiquidDataContext.Provider;