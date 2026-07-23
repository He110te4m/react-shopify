/**
 * @file Vite plugin wrapper for hydration mismatch diagnostics.
 *
 * Runs in `enforce: "pre"` so diagnostics see the original JSX source.
 * Only processes `.tsx`/`.jsx` files within the project's source directory.
 */

import path from "node:path";
import type { Plugin } from "vite";
import type { ResolvedOptions } from "../core/options";
import { autoFixAdjacentText } from "./index";

/**
 * Vite plugin that diagnoses adjacent text/expression hydration risks without
 * transforming React component source.
 */
export default function hydrationFix(options: ResolvedOptions): Plugin {
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);

  return {
    name: "vite-plugin-shopify:hydration-fix",
    enforce: "pre",

    transform(code, id) {
      if (!/\.(tsx|jsx)$/.test(id)) return;
      if (!id.startsWith(sourceDir)) return;

      autoFixAdjacentText(code, id);
      return;
    },
  };
}
