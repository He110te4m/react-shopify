/**
 * @file Vite plugin wrapper for the hydration fix transform.
 *
 * Runs in `enforce: "pre"` so the fix is applied before any other transforms.
 * Only processes `.tsx`/`.jsx` files within the project's source directory.
 */

import path from "node:path";
import type { Plugin } from "vite";
import type { ResolvedOptions } from "../core/options";
import { autoFixAdjacentText } from "./index";

/**
 * Vite plugin that applies {@link autoFixAdjacentText} to all React component
 * files before they reach the main build pipeline.
 */
export default function hydrationFix(options: ResolvedOptions): Plugin {
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);

  return {
    name: "vite-plugin-shopify:hydration-fix",
    enforce: "pre",

    transform(code, id) {
      if (!/\.(tsx|jsx)$/.test(id)) return;
      if (!id.startsWith(sourceDir)) return;

      const { result, fixCount } = autoFixAdjacentText(code, id);
      if (fixCount > 0) {
        return result;
      }
      return;
    },
  };
}
