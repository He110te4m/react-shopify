/**
 * @file Compilation orchestrator for SSG (static site generation).
 *
 * Coordinates the full per-entry build pipeline:
 *   1. `scanEntries` — discover all entry-point source files
 *   2. `compileEntry` (parallel-safe loop):
 *      a. `bundleEntry` — esbuild bundle to a temporary file
 *      b. `renderEntry` — SSR render the React component
 *      c. CSS analysis & categorization (inline vs. shared snippets)
 *      d. `assembleLiquidFile` — build the final `.liquid` output
 *      e. Write to disk
 *      f. Clean up temporary bundle file
 *   3. Remove the `.ssg-tmp/` directory after all entries are compiled.
 */
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
import { validateShopifyMeta, validateBlockSlot } from "../validate";
import { isStaticComponent } from "./static-analyzer";
import { findBlockEntry, getDeclaredBlockTypes, getSectionManagedBlocks } from "../core/block-graph";

const log = logger("ssg:compiler");

/**
 * Entry point for SSG compilation. Scans the source directory for entries,
 * analyzes CSS sharing across entries, then compiles each entry sequentially
 * (writing one `.liquid` file per entry).
 *
 * After all entries are processed, the `.ssg-tmp/` temporary bundle directory
 * is removed.
 */
export async function compileAllEntries(
  options: ResolvedOptions,
  manifest: Manifest,
): Promise<void> {
  const entries = scanEntries(options);
  if (entries.length === 0) return;

  log.debug("found %d entries to compile", entries.length);

  const projectRoot = path.resolve(options.themeRoot);
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);

  // Build section → block script mapping.
  // Blocks referenced by sections skip their own <script> tags;
  // instead the section liquid emits those scripts BEFORE its own
  // script so block entry modules register event listeners first.
  const sectionBlockScripts = new Map<string, string[]>();
  const sectionManagedKebabNames = getSectionManagedBlocks(entries, options);

  for (const entry of entries) {
    if (entry.targetType !== "section") continue;
    const blockTypes = getDeclaredBlockTypes(entry);
    if (!blockTypes || blockTypes.length === 0) continue;

    const scripts: string[] = [];
    for (const blockType of blockTypes) {
      const be = findBlockEntry(entries, blockType, options);
      if (be) {
        // Only add non-static block scripts
        const source = fs.readFileSync(be.filePath, "utf-8");
        if (!isStaticComponent(source, be.filePath)) {
          const script = resolveScriptAsset(be.kebabName, manifest);
          if (script) scripts.push(script);
        }
      }
    }
    if (scripts.length > 0) sectionBlockScripts.set(entry.kebabName, scripts);
  }

  // Analyze CSS distribution and generate shared snippets
  const { entryCssFiles, cssRefCount } = analyzeCssDistribution(entries, manifest);
  const cssSnippetMap = generateSharedCssSnippets(cssRefCount, options);

  // Compile each entry
  for (const entry of entries) {
    try {
      await compileEntry(entry, options, manifest, projectRoot, sourceDir,
        entryCssFiles, cssSnippetMap, sectionBlockScripts, sectionManagedKebabNames);
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

/**
 * Compiles a single entry through the full pipeline:
 * esbuild bundle → SSR render → CSS categorize → Liquid assemble → write file.
 *
 * The temporary bundle file is cleaned up in a `finally` block regardless of
 * whether the compilation succeeded or failed.
 */
async function compileEntry(
  entry: ReturnType<typeof scanEntries>[number],
  options: ResolvedOptions,
  manifest: Manifest,
  projectRoot: string,
  sourceDir: string,
  entryCssFiles: Map<string, string[]>,
  cssSnippetMap: Map<string, string>,
  sectionBlockScripts: Map<string, string[]>,
  sectionManagedKebabNames: Set<string>,
): Promise<void> {
  // Bundle via esbuild
  const bundleResult = await bundleEntry(entry, projectRoot, sourceDir);
  if (!bundleResult) return;

  try {
    // SSR render
    const renderResult = await renderEntry(bundleResult.tmpFile, entry, projectRoot);
    if (!renderResult) return;

    const { html, trackedExpressions, liquidBlocks, trackMap } = renderResult;

    validateShopifyMeta(entry.meta, { kebabName: entry.kebabName, filePath: entry.filePath });

    // Post-render: check BlockSlot usage matches declared blocks config
    validateBlockSlot(html, { kebabName: entry.kebabName, filePath: entry.filePath }, entry.meta.blocks);

    // Categorize CSS
    const cssFiles = entryCssFiles.get(entry.kebabName) || [];
    const { inline: cssInlineFiles, snippets: cssSnippets } = categorizeCss(cssFiles, cssSnippetMap);
    const cssInline = readCssFileContents(cssInlineFiles, options.buildDir, options.themeRoot);

    log.debug("compiling %s (type=%s, css inline=%d, css snippets=%d)",
      entry.kebabName, entry.targetType, cssInline.length, cssSnippets.length);

    // Script asset: blocks managed by sections skip their own <script>
    // tags — the parent section liquid emits them at the correct position.
    const isManagedBlock = entry.targetType === "block" && sectionManagedKebabNames.has(entry.kebabName);
    let scriptAsset: string | null = null;
    if (!isManagedBlock) {
      const source = fs.readFileSync(entry.filePath, "utf-8");
      scriptAsset = isStaticComponent(source, entry.filePath) ? null : resolveScriptAsset(entry.kebabName, manifest);
    }

    // Sections: pass block script assets so they are emitted BEFORE the
    // section's own <script> tag (block entry modules register event
    // listeners before the section script runs).
    const blockScripts = entry.targetType === "section"
      ? sectionBlockScripts.get(entry.kebabName)
      : undefined;

    // Assemble Liquid
    const liquidContent = assembleLiquidFile(html, entry, scriptAsset, {
      inline: cssInline,
      snippets: cssSnippets,
    }, {
      prefix: options.ssg.prefix,
      outputName: options.ssg.outputName || undefined,
      buildDir: options.buildDir,
      blockScripts,
    }, [...trackedExpressions], liquidBlocks, trackMap);

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
