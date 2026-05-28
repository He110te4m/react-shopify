import path from "node:path";
import glob from "fast-glob";
import { normalizePath } from "vite";
import type { ResolvedOptions } from "../options";
import type { SSGEntry, ShopifyBlockType } from "../../types";

const TYPE_BY_DIR: Record<string, ShopifyBlockType> = {
  templates: "template",
  sections: "section",
  blocks: "block",
  snippets: "snippet",
};

export function scanEntries(options: ResolvedOptions): SSGEntry[] {
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);
  const entries: SSGEntry[] = [];

  for (const dir of options.ssg.directories) {
    const scanPath = normalizePath(path.join(sourceDir, dir, "**/*.{tsx,jsx}"));
    const files = glob.sync(scanPath, { onlyFiles: true });

    for (const filePath of files) {
      const absPath = path.resolve(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      const componentName = fileName;
      const kebabName = toKebabCase(fileName);
      const targetType: ShopifyBlockType = TYPE_BY_DIR[dir] ?? "section";

      entries.push({
        filePath: absPath,
        componentName,
        kebabName,
        targetType,
        meta: { name: componentName },
      });
    }
  }

  return entries;
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
