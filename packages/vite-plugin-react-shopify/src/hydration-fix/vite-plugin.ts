import path from "node:path";
import type { Plugin } from "vite";
import type { ResolvedOptions } from "../core/options";
import { autoFixAdjacentText } from "./index";

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
