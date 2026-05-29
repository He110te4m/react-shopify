import path from "node:path";
import type { SSGEntry } from "../types/ssg";

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

function typeToDir(type: string): string {
  if (type === "snippet") return "snippets";
  if (type === "block") return "blocks";
  return `${type}s`;
}

export function getAssetRelativePath(buildDir: string, filename: string): string {
  if (!buildDir.startsWith("assets/")) return filename;
  const prefix = buildDir.slice("assets/".length);
  return prefix ? `${prefix}/${filename}` : filename;
}

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
