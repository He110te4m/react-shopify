import path from "node:path";
import { Plugin } from "vite";
import { normalizePath } from "vite";
import type { ResolvedOptions } from "./options";
import type { SSGEntry } from "../types";
import { logger } from "./logger";
import { scanEntries } from "./ssg/scanner";

const log = logger("entries");

export default function shopifyEntries(options: ResolvedOptions): Plugin {
  let entries: SSGEntry[] = [];

  return {
    name: "vite-plugin-shopify:entries",

    config(config) {
      entries = scanEntries(options);

      const byType: Record<string, number> = {};
      for (const e of entries) {
        byType[e.targetType] = (byType[e.targetType] || 0) + 1;
      }
      log.debug("scanned %d entries: %s", entries.length, JSON.stringify(byType));

      if (entries.length === 0) return {};

      const input: Record<string, string> = {};
      for (const entry of entries) {
        input[entry.kebabName] = `\0shopify:entry:${entry.kebabName}`;
      }

      const existingInput = config.build?.rollupOptions?.input;
      const merged = existingInput
        ? { ...(existingInput as Record<string, string>), ...input }
        : input;

      return {
        build: {
          rollupOptions: { input: merged },
        },
      };
    },

    resolveId(id) {
      if (id.startsWith("\0shopify:entry:")) return `\0${id}`;
    },

    load(id) {
      if (!id.startsWith("\0\0shopify:entry:")) return;
      const kebabName = id.replace("\0\0shopify:entry:", "");
      const entry = entries.find((e) => e.kebabName === kebabName);
      if (!entry) return;

      const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);
      const componentRel = normalizePath(path.relative(sourceDir, entry.filePath));

      return [
        `import { createElement } from 'react'`,
        `import Component from '~/${componentRel}'`,
        `import { hydrateRoot } from 'react-dom/client'`,
        `import { SettingsProvider } from 'vite-plugin-react-shopify/runtime/settings'`,
        `import { ParamsProvider } from 'vite-plugin-react-shopify/runtime/settings'`,
        ``,
        `const SELECTOR = '[data-ssg-component="${kebabName}"]'`,
        `const roots = new Map()`,
        ``,
        `function hydrate(el) {`,
        `  const h = el.querySelector(':scope > [data-ssg-hydrate]') || (el.matches('[data-ssg-hydrate]') ? el : null)`,
        `  if (!h || roots.has(h)) return`,
        `  const propsEl = el.querySelector(':scope > script[data-ssg-props]')`,
        `  const props = propsEl ? JSON.parse(propsEl.textContent || '{}') : {}`,
        `  const paramsEl = el.querySelector(':scope > script[data-ssg-params]')`,
        `  const params = paramsEl ? JSON.parse(paramsEl.textContent || '{}') : {}`,
        `  roots.set(h, hydrateRoot(h, createElement(SettingsProvider, { value: props }, createElement(ParamsProvider, { value: params }, createElement(Component)))))`,
        `}`,
        ``,
        `function unmount(el) {`,
        `  const h = el.querySelector(':scope > [data-ssg-hydrate]') || (el.matches('[data-ssg-hydrate]') ? el : null)`,
        `  if (h && roots.has(h)) { roots.get(h).unmount(); roots.delete(h) }`,
        `}`,
        ``,
        `function scan(target) {`,
        `  if (target.matches?.(SELECTOR)) hydrate(target)`,
        `  target.querySelectorAll(SELECTOR).forEach(hydrate)`,
        `}`,
        ``,
        `function sweep(target) {`,
        `  if (target.matches?.(SELECTOR)) unmount(target)`,
        `  target.querySelectorAll(SELECTOR).forEach(unmount)`,
        `}`,
        ``,
        `scan(document)`,
        ``,
        `document.addEventListener('shopify:section:load', (e) => {`,
        `  scan(e.target)`,
        `})`,
        ``,
        `document.addEventListener('shopify:section:unload', (e) => {`,
        `  sweep(e.target)`,
        `})`,
      ].join("\n");
    },
  };
}
