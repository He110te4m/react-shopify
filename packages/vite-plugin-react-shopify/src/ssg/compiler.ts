import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Manifest } from "vite";
import type { ResolvedOptions } from "../options";
import type { SSGEntry } from "../types";
import { scanEntries } from "./scanner";
import { stripReactLiquidTags, unwrapHtmlEntities } from "./post-process";
import { assembleLiquidFile, getOutputPath } from "./liquid";

export async function compileAllEntries(
  options: ResolvedOptions,
  manifest: Manifest,
): Promise<void> {
  const entries = scanEntries(options);
  if (entries.length === 0) return;

  const projectRoot = path.resolve(options.themeRoot);
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);

  for (const entry of entries) {
    try {
      await compileEntry(entry, options, manifest, projectRoot, sourceDir);
    } catch (err) {
      console.error(`[vite-plugin-shopify] Failed to compile ${entry.filePath}:`, err);
    }
  }

  console.log(`[vite-plugin-shopify] Compiled ${entries.length} entries`);
}

async function compileEntry(
  entry: SSGEntry,
  options: ResolvedOptions,
  manifest: Manifest,
  projectRoot: string,
  sourceDir: string,
): Promise<void> {
  const projectRequire = createRequire(path.join(projectRoot, "package.json"));

  let createElement: any;
  let renderToStaticMarkup: any;
  try {
    createElement = projectRequire("react").createElement;
    renderToStaticMarkup = projectRequire("react-dom/server").renderToStaticMarkup;
  } catch {
    console.warn(`[vite-plugin-shopify] react/react-dom not found, skipping SSR`);
    return;
  }

  const sourceCode = fs.readFileSync(entry.filePath, "utf-8");

  const ssgSource = sourceCode
    .replace(
      /import\s+(\w+)\s+from\s+["'][^"']*\.module\.css["'];?\s*/g,
      (_, name) => `const ${name} = new Proxy({},{get:(_,k)=>k});`,
    )
    .replace(
      /import\s+["'][^"']*\.css["'];?\s*/g,
      "",
    );

  let esbuild: any;
  try {
    esbuild = projectRequire("esbuild");
  } catch {
    console.warn(`[vite-plugin-shopify] esbuild not found, skipping SSR`);
    return;
  }

  const result = await esbuild.transform(ssgSource, {
    loader: path.extname(entry.filePath).slice(1) as "tsx" | "jsx",
    format: "esm",
    jsx: "automatic",
    sourcefile: entry.filePath,
  });

  const ts = Date.now();
  const tmpFile = path.join(sourceDir, ".ssg-tmp-" + ts + ".mjs");
  fs.writeFileSync(tmpFile, result.code);

  try {
    const mod = await import(pathToFileURL(tmpFile));

    const Component = mod.default;
    const shopifyMeta = mod.shopifyMeta;

    if (!Component) {
      console.warn(
        `[vite-plugin-shopify] No default export found in ${entry.filePath}, skipping`,
      );
      return;
    }

    if (shopifyMeta) {
      entry.meta = { ...entry.meta, ...shopifyMeta };
    }

    (globalThis as any).__shopify_ssg_target = entry.targetType;

    const element = createElement(Component);
    let html = renderToStaticMarkup(element);

    html = stripReactLiquidTags(html);
    html = unwrapHtmlEntities(html);

    const scriptAsset = resolveScriptAsset(entry.kebabName, manifest);
    const cssContents = readCssAssets(entry.kebabName, manifest, options.buildDir, options.themeRoot);

    const liquidContent = assembleLiquidFile(html, entry, scriptAsset, cssContents, {
      prefix: options.ssg.prefix,
      outputName: options.ssg.outputName || undefined,
      buildDir: options.buildDir,
    });

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
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function resolveScriptAsset(kebabName: string, manifest: Manifest): string | null {
  const manifestKey = `shopify:entry:${kebabName}`;
  const entryChunk = manifest[manifestKey];
  if (!entryChunk) return null;

  const file = entryChunk.file;
  if (!file) return null;

  return path.basename(file);
}

function readCssAssets(kebabName: string, manifest: Manifest, buildDir: string, themeRoot: string): string[] {
  const manifestKey = `shopify:entry:${kebabName}`;
  const entryChunk = manifest[manifestKey];
  if (!entryChunk) return [];

  const css = entryChunk.css;
  if (!css || !Array.isArray(css)) return [];

  const assetsDir = path.resolve(themeRoot, buildDir);
  return css.map((file) => {
    const cssPath = path.join(assetsDir, file);
    try {
      return fs.readFileSync(cssPath, "utf-8");
    } catch {
      return "";
    }
  }).filter(Boolean);
}

function pathToFileURL(filePath: string): string {
  const absPath = path.resolve(filePath);
  if (process.platform === "win32") {
    return "file:///" + absPath.replace(/\\/g, "/");
  }
  return "file://" + absPath;
}
