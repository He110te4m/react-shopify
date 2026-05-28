import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Manifest } from "vite";
import type { ResolvedOptions } from "../options";
import type { SSGEntry } from "../types";
import { scanEntries } from "./scanner";
import { stripReactLiquidTags, unwrapHtmlEntities } from "./post-process";
import { assembleLiquidFile, getOutputPath } from "./liquid";

const SNIPPET_PREFIX = "react-css";

export async function compileAllEntries(
  options: ResolvedOptions,
  manifest: Manifest,
): Promise<void> {
  const entries = scanEntries(options);
  if (entries.length === 0) return;

  const projectRoot = path.resolve(options.themeRoot);
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);

  // Phase 1: Collect all CSS files per entry & count references
  const entryCssFiles = new Map<string, string[]>();
  const cssRefCount = new Map<string, number>();

  for (const entry of entries) {
    const manifestKey = `shopify:entry:${entry.kebabName}`;
    const files = collectCssFiles(manifestKey, manifest);
    entryCssFiles.set(entry.kebabName, files);
    for (const f of files) {
      cssRefCount.set(f, (cssRefCount.get(f) || 0) + 1);
    }
  }

  // Phase 2: Generate snippet files for shared CSS
  const cssSnippetMap = new Map<string, string>(); // cssFile → snippetName
  for (const [cssFile, count] of cssRefCount) {
    if (count > 1) {
      const snippetName = `${SNIPPET_PREFIX}-${getCssBaseName(cssFile)}`;
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
      } catch {
        /* ignore missing CSS file */
      }
    }
  }

  // Phase 3: Compile each entry with categorized CSS
  for (const entry of entries) {
    try {
      const cssFiles = entryCssFiles.get(entry.kebabName) || [];
      const cssSnippets = cssFiles
        .filter((f) => cssSnippetMap.has(f))
        .map((f) => cssSnippetMap.get(f)!);
      const cssInlineFiles = cssFiles.filter((f) => !cssSnippetMap.has(f));

      const cssInline = readCssFileContents(cssInlineFiles, options.buildDir, options.themeRoot);

      await compileEntry(entry, options, manifest, projectRoot, sourceDir, cssInline, cssSnippets);
    } catch (err) {
      console.error(`[vite-plugin-shopify] Failed to compile ${entry.filePath}:`, err);
    }
  }

  console.log(`[vite-plugin-shopify] Compiled ${entries.length} entries`);

  const tmpDir = path.join(sourceDir, ".ssg-tmp");
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

async function compileEntry(
  entry: SSGEntry,
  options: ResolvedOptions,
  manifest: Manifest,
  projectRoot: string,
  sourceDir: string,
  cssInline: string[],
  cssSnippets: string[],
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

  let esbuild: any;
  try {
    esbuild = projectRequire("esbuild");
  } catch {
    console.warn(`[vite-plugin-shopify] esbuild not found, skipping SSR`);
    return;
  }

  const ts = Date.now();
  const tmpDir = path.join(sourceDir, ".ssg-tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `.ssg-entry-${ts}.mjs`);

  await esbuild.build({
    stdin: {
      contents: sourceCode,
      resolveDir: path.dirname(entry.filePath),
      loader: path.extname(entry.filePath).slice(1) as "tsx" | "jsx",
    },
    outfile: tmpFile,
    bundle: true,
    format: "esm",
    jsx: "automatic",
    platform: "node",
    external: [
      "react",
      "react-dom",
      "react-dom/*",
      "vite-plugin-react-shopify",
      "vite-plugin-react-shopify/*",
    ],
    write: true,
    allowOverwrite: true,
    plugins: [
      {
        name: "ssg-strip-css",
        setup(build: any) {
          build.onResolve({ filter: /\.module\.css$/ }, (args: any) => ({
            namespace: "ssg-css-module",
            path: args.path,
          }));
          build.onResolve({ filter: /\.css$/ }, (args: any) => ({
            namespace: "ssg-css-plain",
            path: args.path,
          }));
          build.onLoad({ filter: /.*/, namespace: "ssg-css-module" }, () => ({
            contents: "export default new Proxy({},{get:(_,k)=>k});",
            loader: "js",
          }));
          build.onLoad({ filter: /.*/, namespace: "ssg-css-plain" }, () => ({
            contents: "",
            loader: "js",
          }));
        },
      },
    ],
  });

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

    const liquidContent = assembleLiquidFile(html, entry, scriptAsset, { inline: cssInline, snippets: cssSnippets }, {
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

function collectCssFiles(manifestKey: string, manifest: Manifest): string[] {
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

function readCssFileContents(cssFiles: string[], buildDir: string, themeRoot: string): string[] {
  const assetsDir = path.resolve(themeRoot, buildDir);
  return cssFiles.map((file) => {
    try {
      return fs.readFileSync(path.join(assetsDir, file), "utf-8");
    } catch {
      return "";
    }
  }).filter(Boolean);
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

function pathToFileURL(filePath: string): string {
  const absPath = path.resolve(filePath);
  if (process.platform === "win32") {
    return "file:///" + absPath.replace(/\\/g, "/");
  }
  return "file://" + absPath;
}
