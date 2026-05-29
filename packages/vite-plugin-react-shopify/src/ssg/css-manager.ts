import fs from "node:fs";
import path from "node:path";
import { Manifest } from "vite";
import type { ResolvedOptions } from "../core/options";
import { logger } from "../core/logger";

const log = logger("ssg:css");

export function collectCssFiles(manifestKey: string, manifest: Manifest): string[] {
  const collected = new Set<string>();
  const visited = new Set<string>();
  collectCssFilesRecursive(manifestKey, manifest, collected, visited);
  return [...collected];
}

function collectCssFilesRecursive(
  chunkKey: string,
  manifest: Manifest,
  collected: Set<string>,
  visited: Set<string>,
): void {
  if (visited.has(chunkKey)) return;
  visited.add(chunkKey);

  const chunk = manifest[chunkKey];
  if (!chunk) return;

  if (chunk.css && Array.isArray(chunk.css)) {
    for (const cssFile of chunk.css) {
      collected.add(cssFile);
    }
  }

  if (chunk.imports && Array.isArray(chunk.imports)) {
    for (const imported of chunk.imports) {
      collectCssFilesRecursive(imported, manifest, collected, visited);
    }
  }
}

export function readCssFileContents(
  cssFiles: string[],
  buildDir: string,
  themeRoot: string,
): string[] {
  const assetsDir = path.resolve(themeRoot, buildDir);
  return cssFiles
    .map((file) => {
      try {
        return fs.readFileSync(path.join(assetsDir, file), "utf-8");
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function getCssBaseName(cssFile: string): string {
  const name = cssFile.replace(/\.css$/, "");
  const lastHyphen = name.lastIndexOf("-");
  if (lastHyphen > 0) {
    const possibleHash = name.slice(lastHyphen + 1);
    if (/^[A-Za-z0-9_-]{8,}$/.test(possibleHash)) {
      return name.slice(0, lastHyphen);
    }
  }
  return name;
}

export function analyzeCssDistribution(
  entries: { kebabName: string }[],
  manifest: Manifest,
): {
  entryCssFiles: Map<string, string[]>;
  cssRefCount: Map<string, number>;
} {
  const entryCssFiles = new Map<string, string[]>();
  const cssRefCount = new Map<string, number>();

  for (const entry of entries) {
    const manifestKey = `shopify:entry:${entry.kebabName}`;
    const files = collectCssFiles(manifestKey, manifest);
    entryCssFiles.set(entry.kebabName, files);
    for (const f of files) {
      cssRefCount.set(f, (cssRefCount.get(f) || 0) + 1);
    }
    log.debug("entry %s has %d CSS files", entry.kebabName, files.length);
  }

  return { entryCssFiles, cssRefCount };
}

export function generateSharedCssSnippets(
  cssRefCount: Map<string, number>,
  options: ResolvedOptions,
): Map<string, string> {
  const cssSnippetMap = new Map<string, string>();

  for (const [cssFile, count] of cssRefCount) {
    if (count > 1) {
      const snippetName = `${options.ssg.cssPrefix}-${getCssBaseName(cssFile)}`;
      cssSnippetMap.set(cssFile, snippetName);
      const snippetPath = path.join(
        path.resolve(options.themeRoot),
        "snippets",
        `${snippetName}.liquid`,
      );
      const cssPath = path.join(
        path.resolve(options.themeRoot, options.buildDir),
        cssFile,
      );
      try {
        const cssContent = fs.readFileSync(cssPath, "utf-8");
        fs.mkdirSync(path.dirname(snippetPath), { recursive: true });
        fs.writeFileSync(snippetPath, `{% stylesheet %}\n${cssContent.trim()}\n{% endstylesheet %}\n`);
        log.debug("generated shared CSS snippet %s (used by %d entries)", snippetName, count);
      } catch {
        log.warn("failed to write CSS snippet for %s", cssFile);
      }
    }
  }

  return cssSnippetMap;
}

export function categorizeCss(
  cssFiles: string[],
  cssSnippetMap: Map<string, string>,
): { inline: string[]; snippets: string[] } {
  const snippets = cssFiles
    .filter((f) => cssSnippetMap.has(f))
    .map((f) => cssSnippetMap.get(f)!);
  const inlineFiles = cssFiles.filter((f) => !cssSnippetMap.has(f));
  return { inline: inlineFiles, snippets };
}
