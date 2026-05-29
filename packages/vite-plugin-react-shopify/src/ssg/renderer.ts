import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Manifest } from "vite";
import { logger } from "../core/logger";
import { normalizeVoidElements, normalizeStyleAttributes, unwrapHtmlEntities } from "./post-process";
function pathToFileURL(filePath: string): string {
  const absPath = path.resolve(filePath);
  if (process.platform === "win32") {
    return "file:///" + absPath.replace(/\\/g, "/");
  }
  return "file://" + absPath;
}

const log = logger("ssg:renderer");

export interface RenderResult {
  html: string;
  trackedExpressions: Set<string>;
  entryMeta: any;
}

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

    (globalThis as any).__shopify_ssg_target = entry.targetType;

    const trackedExpressions = new Set<string>();
    (globalThis as any).__shopify_ssg_liquid_track = trackedExpressions;

    const element = createElement(Component);
    let html = renderToStaticMarkup(element);

    delete (globalThis as any).__shopify_ssg_liquid_track;

    html = normalizeVoidElements(html);
    html = normalizeStyleAttributes(html);
    html = unwrapHtmlEntities(html);

    return { html, trackedExpressions, entryMeta: entry.meta };
  });
}

export function resolveScriptAsset(kebabName: string, manifest: Manifest): string | null {
  const manifestKey = `shopify:entry:${kebabName}`;
  const entryChunk = manifest[manifestKey];
  if (!entryChunk) return null;

  const file = entryChunk.file;
  if (!file) return null;

  return path.basename(file);
}
