/**
 * @file CSS distribution manager for SSG compilation.
 *
 * After Vite bundles the React components, the CSS is split into chunks.
 * This module:
 *  - Maps each entry to its CSS file dependencies via the Vite manifest.
 *  - Identifies CSS files shared by multiple entries ("shared CSS").
 *  - Generates shared CSS Liquid `<snippet>` files and categorizes remaining
 *    CSS as inline.
 *  - Reads actual CSS file contents from the build output for embedding.
 */

import fs from "node:fs";
import path from "node:path";
import { Manifest } from "vite";
import type { ResolvedOptions } from "../core/options";
import type { SSGEntry } from "../types/ssg";

/**
 * For each SSG entry, collect the set of CSS chunk file paths from the
 * manifest (following import chains recursively). Also counts how many
 * entries reference each CSS file.
 */
export function analyzeCssDistribution(
  entries: SSGEntry[],
  manifest: Manifest,
): { entryCssFiles: Map<string, string[]>; cssRefCount: Map<string, number> } {
  const entryCssFiles = new Map<string, string[]>();
  const cssRefCount = new Map<string, number>();

  for (const entry of entries) {
    const manifestKey = `shopify:entry:${entry.kebabName}`;
    const chunk = manifest[manifestKey];
    if (!chunk) continue;

    const cssFiles = collectCssFiles(chunk, manifest, new Set());
    entryCssFiles.set(entry.kebabName, cssFiles);

    for (const f of cssFiles) {
      cssRefCount.set(f, (cssRefCount.get(f) || 0) + 1);
    }
  }

  return { entryCssFiles, cssRefCount };
}

/**
 * Generate shared CSS snippet `.liquid` files for any CSS file referenced
 * by 2 or more entries.
 *
 * @returns A map of CSS filename → snippet name (without `.liquid` extension).
 */
export function generateSharedCssSnippets(
  cssRefCount: Map<string, number>,
  options: ResolvedOptions,
): Map<string, string> {
  const cssSnippetMap = new Map<string, string>();
  const snippetsDir = path.resolve(options.themeRoot, "snippets");
  fs.mkdirSync(snippetsDir, { recursive: true });

  for (const [cssFile, count] of cssRefCount) {
    if (count < 2) continue;

    const cssName = path.basename(cssFile, path.extname(cssFile));
    const snippetName = `${options.ssg.cssPrefix || "css-"}${cssName}`;
    const cssContent = readCssFile(cssFile, options.buildDir, options.themeRoot);

    fs.writeFileSync(
      path.join(snippetsDir, `${snippetName}.liquid`),
      `{% stylesheet %}\n${cssContent}\n{% endstylesheet %}\n`,
    );

    cssSnippetMap.set(cssFile, snippetName);
  }

  return cssSnippetMap;
}

/**
 * Split an entry's CSS files into shared (already written as snippets) and
 * inline (to be embedded directly in the Liquid output).
 */
export function categorizeCss(
  cssFiles: string[],
  cssSnippetMap: Map<string, string>,
): { inline: string[]; snippets: string[] } {
  const inline: string[] = [];
  const snippets: string[] = [];

  for (const f of cssFiles) {
    const snippetName = cssSnippetMap.get(f);
    if (snippetName) {
      snippets.push(snippetName);
    } else {
      inline.push(f);
    }
  }

  return { inline, snippets };
}

/** Read the contents of a set of CSS files from the build output. */
export function readCssFileContents(
  cssFiles: string[],
  buildDir: string,
  themeRoot: string,
): string[] {
  return cssFiles.map((f) => readCssFile(f, buildDir, themeRoot));
}

// ── Internal helpers ────────────────────────────────────────────────────

/** Read a single CSS file from disk. */
function readCssFile(cssFile: string, buildDir: string, themeRoot: string): string {
  return fs.readFileSync(path.resolve(themeRoot, buildDir, cssFile), "utf-8");
}

/**
 * Recursively collect all CSS file paths for a chunk by following its
 * `imports` chain in the manifest.
 */
function collectCssFiles(
  chunk: any,
  manifest: Manifest,
  visited: Set<string>,
): string[] {
  if (visited.has(chunk.file)) return [];
  visited.add(chunk.file);

  const css: string[] = [...(chunk.css || [])];

  if (chunk.imports) {
    for (const imp of chunk.imports) {
      const child = manifest[imp];
      if (child) {
        css.push(...collectCssFiles(child, manifest, visited));
      }
    }
  }

  return css;
}
