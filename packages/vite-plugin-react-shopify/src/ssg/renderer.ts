/**
 * @file Server-side renderer for SSG compilation.
 *
 * Dynamically imports a bundled entry module, sets up global Liquid-expression
 * and Liquid-block registries, then calls React's `renderToStaticMarkup` to
 * produce the static HTML. Post-processes the output (void elements, entities,
 * style attributes) before returning a `RenderResult` containing the HTML, all
 * tracked Liquid expressions, registered liquid blocks, and entry metadata.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Manifest } from "vite";
import { logger } from "../core/logger";
import { GW_TARGET, GW_TRACK, GW_BLOCKS, GW_FILTERS, GW_TRACK_MAP, GW_ISLAND_COUNTER } from "../constants/attributes";
import { normalizeVoidElements, normalizeStyleAttributes, unwrapHtmlEntities } from "./post-process";

/**
 * Converts a local filesystem path to a `file://` URL suitable for dynamic
 * ESM `import()`. On Windows the backslashes are normalised to forward slashes
 * and an extra `/` is prepended for UNC compatibility.
 */
function pathToFileURL(filePath: string): string {
  const absPath = path.resolve(filePath);
  if (process.platform === "win32") {
    return "file:///" + absPath.replace(/\\/g, "/");
  }
  return "file://" + absPath;
}

const log = logger("ssg:renderer");

/**
 * Default mapping from Shopify setting type to the Liquid filter suffix that
 * should be appended when the setting is output. For example, `image_picker`
 * settings automatically get `| img_url: 'master'`.
 */
const DEFAULT_LIQUID_FILTERS: Record<string, string> = {
  textarea: " | newline_to_br",
  image_picker: " | img_url: 'master'",
};

/**
 * Builds a flat { expression → filter } map from a settings schema.
 *
 * For each setting whose type has a default Liquid filter defined in
 * `DEFAULT_LIQUID_FILTERS`, an entry `{ "section.settings.${id}": " | filter" }`
 * (or `block.settings.${id}`) is created. This map is set on `globalThis` before
 * SSR so that hooks can automatically append the correct filter when outputting
 * `{{ expr }}` placeholders.
 *
 * @param settings - Array of setting definitions from `shopifyMeta.settings`.
 * @param prefix   - Setting path prefix (`"section.settings."` or `"block.settings."`).
 */
function buildLiquidFilterMap(
  settings: { type: string; id: string }[] | undefined,
  prefix: string,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!settings) return map;
  for (const s of settings) {
    const filter = DEFAULT_LIQUID_FILTERS[s.type];
    if (filter) {
      map[`${prefix}${s.id}`] = filter;
    }
  }
  return map;
}

/** The result of an SSR render pass for a single entry. */
export interface RenderResult {
  html: string;
  trackedExpressions: Set<string>;
  liquidBlocks: string[];
  trackMap: Map<string, any>;
  entryMeta: any;
}

/**
 * Dynamically imports a bundled entry module (as ESM via `file://` URL),
 * renders the default React component to static HTML, and collects all
 * Liquid expressions and Liquid block code that were registered during the
 * render pass.
 *
 * Global state lifecycle:
 * 1. Set `__shopify_ssg_target` (section/block/snippet/template).
 * 2. Build Liquid filter map from the entry's `shopifyMeta.settings`.
 * 3. Create fresh `Set` / `Array` registries for tracked expressions and blocks.
 * 4. Render with `renderToStaticMarkup`.
 * 5. Delete all global registries to avoid cross-entry contamination.
 * 6. Post-process HTML: void elements, entities, style attributes.
 *
 * @param tmpFile     - Path to the esbuild-bundled temporary JS file.
 * @param entry       - Entry descriptor (source path, kebab name, target type).
 * @param projectRoot - Root of the Shopify theme project (for `createRequire`).
 * @returns `RenderResult` on success, or `null` if the component could not be rendered.
 */
export function renderEntry(
  tmpFile: string,
  entry: { filePath: string; kebabName: string; targetType: string; meta: any },
  projectRoot: string,
): Promise<RenderResult | null> {
  return import(pathToFileURL(tmpFile)).then((mod) => {
    const Component = mod.default;
    const shopifyMeta = mod.shopifyMeta;

    if (!Component) {
      log.warn("No default export found in %s, skipping", entry.filePath);
      return null;
    }

    if (shopifyMeta) {
      entry.meta = { ...entry.meta, ...shopifyMeta, name: shopifyMeta.name ?? entry.meta.name };
    }

    const projectRequire = createRequire(path.join(projectRoot, "package.json"));

    let createElement: any;
    let renderToStaticMarkup: any;
    try {
      createElement = projectRequire("react").createElement;
      renderToStaticMarkup = projectRequire("react-dom/server").renderToStaticMarkup;
    } catch {
      log.warn("react/react-dom not found, skipping SSR for %s", entry.kebabName);
      return null;
    }

    const trackMap = new Map<string, any>();
    const trackedExpressions = new Set<string>();
    const liquidBlocks: string[] = [];

    try {
      // Global state: tells hooks what type of Liquid entity we're rendering.
      (globalThis as any)[GW_TARGET] = entry.targetType;

      // Build and register the Liquid filter map so hooks output correct filters.
      const prefix = entry.targetType === "block" ? "block.settings." : "section.settings.";
      const filterMap = buildLiquidFilterMap(shopifyMeta?.settings, prefix);
      (globalThis as any)[GW_FILTERS] = filterMap;

      (globalThis as any)[GW_TRACK_MAP] = trackMap;
      (globalThis as any)[GW_TRACK] = trackedExpressions;
      (globalThis as any)[GW_BLOCKS] = liquidBlocks;

      // Island key counter — auto-incremented by <Island> during SSR so each
      // island gets a unique `data-ssg-i` attribute for client pre-capture.
      (globalThis as any)[GW_ISLAND_COUNTER] = { count: 0 };

      const element = createElement(Component);
      let html = renderToStaticMarkup(element);

      html = normalizeVoidElements(html);
      html = normalizeStyleAttributes(html);
      html = unwrapHtmlEntities(html);

      return { html, trackedExpressions, liquidBlocks, trackMap, entryMeta: entry.meta };
    } finally {
      // Prevent failed renders from leaking registry state into the next entry.
      delete (globalThis as any)[GW_TARGET];
      delete (globalThis as any)[GW_TRACK_MAP];
      delete (globalThis as any)[GW_TRACK];
      delete (globalThis as any)[GW_BLOCKS];
      delete (globalThis as any)[GW_FILTERS];
      delete (globalThis as any)[GW_ISLAND_COUNTER];
    }
  });
}

/**
 * Resolves the basename of the script chunk for a given entry from the Vite
 * manifest. Looks up the key `shopify:entry:${kebabName}` and returns the
 * filename (without path) of the entry's output JS file.
 *
 * @returns The script asset basename (e.g. `"entry-abc123.js"`), or `null`
 *   if no chunk was found in the manifest.
 */
export function resolveScriptAsset(kebabName: string, manifest: Manifest): string | null {
  const manifestKey = `shopify:entry:${kebabName}`;
  const entryChunk = manifest[manifestKey];
  if (!entryChunk) return null;

  const file = entryChunk.file;
  if (!file) return null;

  return path.basename(file);
}
