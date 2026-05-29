import path from "node:path";
import { Plugin } from "vite";
import { normalizePath } from "vite";
import type { ResolvedOptions } from "./options";
import type { SSGEntry } from "../types/ssg";
import { logger } from "./logger";
import { scanEntries } from "../ssg/scanner";
import { generateEntryModule } from "./entry-template";

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

      return generateEntryModule(entry, componentRel);
    },
  };
}
