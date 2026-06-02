/**
 * @file Main entry point for the `vite-plugin-react-shopify` package.
 *
 * Composes four Vite plugins (hydration-fix, config, entries, SSG) into
 * a single array returned to the user's `vite.config.ts`. Also re-exports
 * all public types for consumers.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import vitePluginShopify from 'vite-plugin-react-shopify'
 * export default {
 *   plugins: [vitePluginShopify({ themeRoot: '.', sourceCodeDir: 'frontend' })],
 * }
 * ```
 */

import { Plugin } from "vite";
import { resolveOptions } from "./core/options";
import type { Options } from "./types";
import { enableDebug } from "./core/logger";
import shopifyConfig from "./core/config";
import shopifyEntries from "./core/entries";
import shopifySSG from "./ssg";
import hydrationFix from "./hydration-fix/vite-plugin";

/**
 * Create the complete set of Vite plugins for React Shopify theme development.
 *
 * @param options User configuration (all fields optional).
 * @returns An array of Vite plugin instances.
 */
const vitePluginShopify = (options: Options = {}): Plugin[] => {
  const resolvedOptions = resolveOptions(options);

  if (resolvedOptions.debug || process.env.DEBUG?.includes("vite-plugin-shopify")) {
    enableDebug();
  }

  return [
    hydrationFix(resolvedOptions),
    shopifyConfig(resolvedOptions),
    shopifyEntries(resolvedOptions),
    shopifySSG(resolvedOptions),
  ];
};

export default vitePluginShopify;

export type * from "./types";
