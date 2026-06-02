/**
 * @file Output path and asset URL resolver for generated Liquid files.
 *
 * Determines where each compiled `.liquid` file is written within the theme
 * directory and how script asset URLs are constructed for Shopify's `asset_url`
 * filter.
 */

import path from "node:path";
import type { SSGEntry } from "../types/ssg";

/**
 * Resolve the absolute output path for a compiled Liquid file.
 *
 * @param options.outputName Optional template string with `{type}`, `{kebab}`,
 *   `{pascal}`, and `{target}` placeholders.
 */
export function getOutputPath(
  entry: SSGEntry,
  options: {
    prefix: { template: string; section: string; block: string; snippet: string };
    outputName?: string;
    themeRoot: string;
  },
): string {
  const type = entry.meta.type ?? entry.targetType;
  const dirName = typeToDir(type);
  const fileName = resolveFileName(entry, type, options);
  return path.join(options.themeRoot, dirName, fileName);
}

/** Map block type to Shopify theme directory name. */
function typeToDir(type: string): string {
  if (type === "snippet") return "snippets";
  if (type === "block") return "blocks";
  return `${type}s`;
}

/**
 * Strip the leading `assets/` prefix from the build directory path so that
 * `{% 'path' | asset_url %}` resolves correctly.
 */
export function getAssetRelativePath(buildDir: string, filename: string): string {
  if (!buildDir.startsWith("assets/")) return filename;
  const prefix = buildDir.slice("assets/".length);
  return prefix ? `${prefix}/${filename}` : filename;
}

/** Compose the output filename using prefix rules or custom template. */
function resolveFileName(
  entry: SSGEntry,
  type: string,
  options: {
    prefix: { template: string; section: string; block: string; snippet: string };
    outputName?: string;
  },
): string {
  if (options.outputName) {
    return (
      options.outputName
        .replace(/\{type\}/g, type)
        .replace(/\{kebab\}/g, entry.kebabName)
        .replace(/\{pascal\}/g, entry.componentName)
        .replace(/\{target\}/g, entry.targetType) + ".liquid"
    );
  }

  const prefix = options.prefix[type as keyof typeof options.prefix] ?? "react-";
  return `${prefix}${entry.kebabName}.liquid`;
}
