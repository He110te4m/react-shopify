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
import crypto from "node:crypto";
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
import { getPluginVersion } from "../core/package-info";

const log = logger("ssg:compiler");

interface GeneratedOutput {
  path: string;
  content: string;
}

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

  // Prepare every output in memory. Nothing in the theme is replaced until
  // all entries have compiled successfully.
  const { entryCssFiles, cssRefCount } = analyzeCssDistribution(entries, manifest);
  const sharedCss = generateSharedCssSnippets(cssRefCount, options);
  const outputs: GeneratedOutput[] = [...sharedCss.outputs];
  const errors: Error[] = [];
  const runtimes = new Map<string, "static" | "hydrate">();

  for (const entry of entries) {
    try {
      const result = await compileEntry(
        entry,
        options,
        manifest,
        projectRoot,
        sourceDir,
        entryCssFiles,
        sharedCss.map,
      );
      outputs.push(result.output);
      runtimes.set(entry.kebabName, result.runtime);
    } catch (err) {
      log.error("Failed to compile %s:", entry.filePath, err);
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }

  if (errors.length > 0) {
    fs.rmSync(path.join(sourceDir, ".ssg-tmp"), { recursive: true, force: true });
    throw new AggregateError(errors, `Failed to compile ${errors.length} of ${entries.length} Shopify entries`);
  }

  const clientAssets = planClientAssetPrune(entries, runtimes, manifest, options);
  outputs.push(clientAssets.manifestOutput);
  commitOutputs(outputs, sourceDir, options.themeRoot);
  cleanupOrphanLiquid(outputs, options);
  removeRedundantClientAssets(clientAssets.files);
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
): Promise<{ output: GeneratedOutput; runtime: "static" | "hydrate" }> {
  // Bundle via esbuild
  const bundleResult = await bundleEntry(entry, projectRoot, sourceDir);
  if (!bundleResult) throw new Error(`Unable to bundle ${entry.filePath}`);

  try {
    // SSR render
    const source = fs.readFileSync(entry.filePath, "utf-8");
    const inferredRuntime = isStaticComponent(source, entry.filePath) ? "static" : "hydrate";
    const renderResult = await renderEntry(bundleResult.tmpFile, entry, projectRoot, inferredRuntime);
    if (!renderResult) throw new Error(`Unable to render ${entry.filePath}`);

    const { html, trackedExpressions, liquidBlocks, trackMap, runtime } = renderResult;

    validateShopifyMeta(entry.meta, {
      kebabName: entry.kebabName,
      filePath: entry.filePath,
      targetType: entry.targetType,
    });

    // Post-render: check BlockSlot usage matches declared blocks config
    validateBlockSlot(html, { kebabName: entry.kebabName, filePath: entry.filePath }, entry.meta.blocks);

    // Categorize CSS
    const cssFiles = entryCssFiles.get(entry.kebabName) || [];
    const { inline: cssInlineFiles, snippets: cssSnippets } = categorizeCss(cssFiles, cssSnippetMap);
    const cssInline = readCssFileContents(cssInlineFiles, options.buildDir, options.themeRoot);

    log.debug("compiling %s (type=%s, css inline=%d, css snippets=%d)",
      entry.kebabName, entry.targetType, cssInline.length, cssSnippets.length);

    const scriptAsset = runtime === "hydrate" ? resolveScriptAsset(entry.kebabName, manifest) : null;
    if (runtime === "hydrate" && !scriptAsset) {
      throw new Error(`Missing client manifest entry for hydrated component ${entry.kebabName}`);
    }

    // Assemble Liquid
    const liquidContent = assembleLiquidFile(html, entry, scriptAsset, {
      inline: cssInline,
      snippets: cssSnippets,
    }, {
      prefix: options.ssg.prefix,
      outputName: options.ssg.outputName || undefined,
      buildDir: options.buildDir,
      runtime,
      source: {
        path: path.relative(options.themeRoot, entry.filePath),
        hash: crypto.createHash("sha256").update(source).digest("hex").slice(0, 12),
        pluginVersion: getPluginVersion(),
      },
    }, [...trackedExpressions], liquidBlocks, trackMap);

    // Write output
    const outputPath = getOutputPath(entry, {
      prefix: options.ssg.prefix,
      outputName: options.ssg.outputName || undefined,
      themeRoot: options.themeRoot,
    });

    return { output: { path: outputPath, content: liquidContent }, runtime };
  } finally {
    try {
      fs.unlinkSync(bundleResult.tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function commitOutputs(outputs: GeneratedOutput[], sourceDir: string, themeRoot: string): void {
  const stageRoot = path.join(sourceDir, ".ssg-tmp", "output");
  const backupRoot = path.join(sourceDir, ".ssg-tmp", "backup");
  fs.rmSync(stageRoot, { recursive: true, force: true });
  fs.rmSync(backupRoot, { recursive: true, force: true });

  const seen = new Set<string>();
  for (const output of outputs) {
    const absoluteOutput = path.resolve(output.path);
    if (seen.has(absoluteOutput)) throw new Error(`Duplicate generated output path: ${output.path}`);
    seen.add(absoluteOutput);
    const relative = path.relative(themeRoot, output.path);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Refusing to write generated output outside theme root: ${output.path}`);
    }
    const staged = path.join(stageRoot, relative);
    fs.mkdirSync(path.dirname(staged), { recursive: true });
    fs.writeFileSync(staged, output.content);
  }

  const committed: Array<{ target: string; backup: string | null }> = [];
  try {
    for (const output of outputs) {
      const relative = path.relative(themeRoot, output.path);
      const staged = path.join(stageRoot, relative);
      const backup = path.join(backupRoot, relative);
      fs.mkdirSync(path.dirname(output.path), { recursive: true });
      let backupPath: string | null = null;
      if (fs.existsSync(output.path)) {
        fs.mkdirSync(path.dirname(backup), { recursive: true });
        fs.copyFileSync(output.path, backup);
        backupPath = backup;
      }
      fs.renameSync(staged, output.path);
      committed.push({ target: output.path, backup: backupPath });
    }
  } catch (error) {
    for (const item of committed.reverse()) {
      if (item.backup) fs.copyFileSync(item.backup, item.target);
      else fs.rmSync(item.target, { force: true });
    }
    throw error;
  }
}

function cleanupOrphanLiquid(outputs: GeneratedOutput[], options: ResolvedOptions): void {
  const expected = new Set(outputs.map((output) => path.resolve(output.path)));
  for (const directory of ["sections", "blocks", "snippets", "templates"]) {
    const dir = path.join(options.themeRoot, directory);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".liquid")) continue;
      const file = path.resolve(dir, name);
      if (expected.has(file)) continue;
      let content: string;
      try {
        content = fs.readFileSync(file, "utf-8");
      } catch (error) {
        log.warn("Unable to inspect orphan candidate %s: %s", file, error);
        continue;
      }
      const generatedEntry = content.includes("automatically generated by vite-plugin");
      const generatedCss = directory === "snippets"
        && name.startsWith(options.ssg.cssPrefix)
        && content.startsWith("{% stylesheet %}");
      if (generatedEntry || generatedCss) {
        try {
          fs.rmSync(file, { force: true });
        } catch (error) {
          log.warn("Unable to remove orphan generated Liquid %s: %s", file, error);
        }
      }
    }
  }
}

function planClientAssetPrune(
  entries: ReturnType<typeof scanEntries>,
  runtimes: Map<string, "static" | "hydrate">,
  manifest: Manifest,
  options: ResolvedOptions,
): { manifestOutput: GeneratedOutput; files: Set<string> } {
  const reachable = new Set<string>();
  const files = new Set<string>();
  const visit = (key: string) => {
    const chunk = manifest[key];
    if (!chunk || reachable.has(chunk.file)) return;
    reachable.add(chunk.file);
    for (const imported of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) visit(imported);
  };

  for (const entry of entries) {
    if (runtimes.get(entry.kebabName) === "hydrate") visit(`shopify:entry:${entry.kebabName}`);
  }

  const buildRoot = path.resolve(options.themeRoot, options.buildDir);
  if (fs.existsSync(buildRoot)) {
    for (const item of fs.readdirSync(buildRoot, { withFileTypes: true })) {
      if (!item.isFile() || !item.name.startsWith(options.chunkPrefix)) continue;
      if (!/\.(js|css)(\.map)?$/.test(item.name)) continue;
      const relative = item.name;
      const sourceFile = relative.endsWith(".map") ? relative.slice(0, -4) : relative;
      if (sourceFile.endsWith(".js") && reachable.has(sourceFile)) continue;
      files.add(path.join(buildRoot, item.name));
    }
  }

  const prunedManifest: Manifest = {};
  for (const [key, chunk] of Object.entries(manifest)) {
    if (chunk.file.endsWith(".css") && path.basename(chunk.file).startsWith(options.chunkPrefix)) continue;
    if (chunk.file.endsWith(".js") && !reachable.has(chunk.file)) continue;
    prunedManifest[key] = { ...chunk, css: undefined };
  }
  const manifestPath = path.resolve(options.themeRoot, options.buildDir, ".vite", "manifest.json");
  return {
    manifestOutput: { path: manifestPath, content: `${JSON.stringify(prunedManifest, null, 2)}\n` },
    files,
  };
}

function removeRedundantClientAssets(files: Set<string>): void {
  for (const file of files) {
    try {
      fs.rmSync(file, { force: true });
    } catch (error) {
      log.warn("Unable to remove unreferenced client asset %s: %s", file, error);
    }
  }
}
