import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { ResolvedOptions } from "../options";
import type { SSGEntry } from "../types";
import { scanEntries } from "./scanner";
import { stripReactLiquidTags, unwrapHtmlEntities } from "./post-process";
import { assembleLiquidFile, getOutputPath } from "./liquid-structure";
import { generateHydrateEntry } from "./hydrate-entry";

export async function compileAllEntries(options: ResolvedOptions): Promise<void> {
  const entries = scanEntries(options);

  if (entries.length === 0) return;

  const projectRoot = path.resolve(options.themeRoot);

  for (const entry of entries) {
    try {
      await compileEntry(entry, options, projectRoot);
    } catch (err) {
      console.error(`[vite-plugin-shopify-ssg] Failed to compile ${entry.filePath}:`, err);
    }
  }

  console.log(`[vite-plugin-shopify-ssg] Compiled ${entries.length} entries`);
}

async function compileEntry(
  entry: SSGEntry,
  options: ResolvedOptions,
  projectRoot: string,
): Promise<void> {
  const projectRequire = createRequire(path.join(projectRoot, "package.json"));

  let createElement: any;
  let renderToStaticMarkup: any;
  try {
    createElement = projectRequire("react").createElement;
    renderToStaticMarkup = projectRequire("react-dom/server").renderToStaticMarkup;
  } catch {
    console.warn(
      `[vite-plugin-shopify-ssg] react not found in project. Make sure react and react-dom are installed.`,
    );
    return;
  }

  const sourceCode = fs.readFileSync(entry.filePath, "utf-8");
  const esbuild = projectRequire("esbuild");

  const result = await esbuild.transform(sourceCode, {
    loader: path.extname(entry.filePath).slice(1) as "tsx" | "jsx",
    format: "esm",
    jsx: "automatic",
    sourcefile: entry.filePath,
  });

  const ts = Date.now();
  const tmpFile = entry.filePath + "." + ts + ".ssg-tmp.mjs";
  fs.writeFileSync(tmpFile, result.code);

  try {
    const mod = await import(pathToFileURL(tmpFile));

    const Component = mod.default;
    const shopifyMeta = mod.shopifyMeta;

    if (!Component) {
      console.warn(
        `[vite-plugin-shopify-ssg] No default export found in ${entry.filePath}, skipping`,
      );
      return;
    }

    if (shopifyMeta) {
      entry.meta = { ...entry.meta, ...shopifyMeta };
    }

    const element = createElement(Component);
    let html = renderToStaticMarkup(element);

    html = stripReactLiquidTags(html);
    html = unwrapHtmlEntities(html);

    const liquidContent = assembleLiquidFile(html, entry, {
      prefix: options.ssg.prefix,
      outputName: options.ssg.outputName || undefined,
      sourceCodeDir: options.sourceCodeDir,
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

    generateHydrateEntry(entry, options);
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function pathToFileURL(filePath: string): string {
  const absPath = path.resolve(filePath);
  if (process.platform === "win32") {
    return "file:///" + absPath.replace(/\\/g, "/");
  }
  return "file://" + absPath;
}
