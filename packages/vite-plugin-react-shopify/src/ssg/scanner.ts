/**
 * @file File-system scanner for discovering React component entries.
 *
 * Walks `frontend/{sections,blocks,templates,snippets}` directories with
 * fast-glob, building {@link SSGEntry} records that drive the SSG compilation
 * pipeline.
 */

import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";
import { normalizePath } from "vite";
import type { ResolvedOptions } from "../core/options";
import type { SSGEntry } from "../types/ssg";
import type { ShopifyBlockType } from "../types/shopify";
import { MAX_NAME_LENGTH } from "../validate/rules";
import { logger } from "../core/logger";

const log = logger("ssg:scanner");

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
      const meta: SSGEntry["meta"] = { name: deriveName(fileName) };

      if (targetType === "section") {
        const blockTypes = extractBlockTypes(absPath);
        if (blockTypes.length > 0) {
          (meta as any)._blockTypes = blockTypes;
          log.debug("%s declares blocks: %s", kebabName, blockTypes.join(", "));
        }
      }

      entries.push({ filePath: absPath, componentName, kebabName, targetType, meta });
    }
  }

  return entries;
}

function extractBlockTypes(filePath: string): string[] {
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const m = source.match(/blocks\s*:\s*\[([\s\S]*?)\]/);
    if (!m) return [];
    const types: string[] = [];
    const re = /type\s*:\s*['"]([^'"]+)['"]/g;
    let item: RegExpExecArray | null;
    while ((item = re.exec(m[1])) !== null) {
      if (!item[1].startsWith("@")) types.push(item[1]);
    }
    return types;
  } catch {
    return [];
  }
}

/** Convert PascalCase / camelCase to kebab-case. */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Derive a human-readable display name from a filename.
 *
 * Converts `ProductPrice` → `Product Price`, `my-section` → `my section`.
 * Truncated to 25 characters (Shopify's limit).
 */
export function deriveName(fileName: string): string {
  const readable = fileName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return readable.length > MAX_NAME_LENGTH ? readable.slice(0, MAX_NAME_LENGTH) : readable;
}
