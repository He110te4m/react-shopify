import fs from "node:fs";
import path from "node:path";
import { Manifest } from "vite";
import type { ResolvedOptions } from "../core/options";
import { logger } from "../core/logger";
import { scanEntries } from "./scanner";
import { analyzeCssDistribution, generateSharedCssSnippets, categorizeCss, readCssFileContents } from "./css-manager";
import { bundleEntry } from "./bundler";
import { renderEntry, resolveScriptAsset } from "./renderer";
import { assembleLiquidFile } from "./liquid-assembler";
import { getOutputPath } from "./liquid-paths";
import { validateShopifyMeta } from "../validate";

const log = logger("ssg:compiler");

export async function compileAllEntries(
  options: ResolvedOptions,
  manifest: Manifest,
): Promise<void> {
  const entries = scanEntries(options);
  if (entries.length === 0) return;

  log.debug("found %d entries to compile", entries.length);

  const projectRoot = path.resolve(options.themeRoot);
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);

  // Analyze CSS distribution and generate shared snippets
  const { entryCssFiles, cssRefCount } = analyzeCssDistribution(entries, manifest);
  const cssSnippetMap = generateSharedCssSnippets(cssRefCount, options);

  // Compile each entry
  for (const entry of entries) {
    try {
      await compileEntry(entry, options, manifest, projectRoot, sourceDir, entryCssFiles, cssSnippetMap);
    } catch (err) {
      log.error("Failed to compile %s:", entry.filePath, err);
    }
  }

  log.info("Compiled %d entries", entries.length);

  // Cleanup
  const tmpDir = path.join(sourceDir, ".ssg-tmp");
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

async function compileEntry(
  entry: ReturnType<typeof scanEntries>[number],
  options: ResolvedOptions,
  manifest: Manifest,
  projectRoot: string,
  sourceDir: string,
  entryCssFiles: Map<string, string[]>,
  cssSnippetMap: Map<string, string>,
): Promise<void> {
  // Bundle via esbuild
  const bundleResult = await bundleEntry(entry, projectRoot, sourceDir);
  if (!bundleResult) return;

  try {
    // SSR render
    const renderResult = await renderEntry(bundleResult.tmpFile, entry, projectRoot);
    if (!renderResult) return;

    const { html, trackedExpressions, liquidBlocks } = renderResult;

    validateShopifyMeta(entry.meta, { kebabName: entry.kebabName, filePath: entry.filePath });

    // Categorize CSS
    const cssFiles = entryCssFiles.get(entry.kebabName) || [];
    const { inline: cssInlineFiles, snippets: cssSnippets } = categorizeCss(cssFiles, cssSnippetMap);
    const cssInline = readCssFileContents(cssInlineFiles, options.buildDir, options.themeRoot);

    log.debug("compiling %s (type=%s, css inline=%d, css snippets=%d)",
      entry.kebabName, entry.targetType, cssInline.length, cssSnippets.length);

    // Resolve script asset
    const scriptAsset = resolveScriptAsset(entry.kebabName, manifest);

    // Assemble Liquid
    const liquidContent = assembleLiquidFile(html, entry, scriptAsset, {
      inline: cssInline,
      snippets: cssSnippets,
    }, {
      prefix: options.ssg.prefix,
      outputName: options.ssg.outputName || undefined,
      buildDir: options.buildDir,
    }, [...trackedExpressions], liquidBlocks);

    // Write output
    const outputPath = getOutputPath(entry, {
      prefix: options.ssg.prefix,
      outputName: options.ssg.outputName || undefined,
      themeRoot: options.themeRoot,
    });

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, liquidContent);
  } finally {
    try {
      fs.unlinkSync(bundleResult.tmpFile);
    } catch {
      /* ignore */
    }
  }
}
