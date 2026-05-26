import path from "node:path";
import { Plugin } from "vite";
import { normalizePath } from "vite";
import type { ResolvedOptions } from "./options";
import type { SSGEntry } from "./types";
import { scanEntries } from "./ssg/scanner";

export default function shopifyEntries(options: ResolvedOptions): Plugin {
  let entries: SSGEntry[] = [];

  return {
    name: "vite-plugin-shopify:entries",

    config(config) {
      entries = scanEntries(options);

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
        ``,
        `document.querySelectorAll('[data-ssg-component="${kebabName}"] [data-ssg-hydrate]').forEach(el => {`,
        `  hydrateRoot(el, createElement(Component))`,
        `})`,
      ].join("\n");
    },
  };
}
