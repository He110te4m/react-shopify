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
  let sectionManagedBlocks: Set<string> = new Set();

  function buildSectionManagedBlocks(): Set<string> {
    const blockPrefix = options.ssg.prefix.block;
    const result = new Set<string>();
    for (const entry of entries) {
      if (entry.targetType !== "section") continue;
      const blockTypes: string[] = (entry.meta as any)._blockTypes;
      if (!blockTypes || blockTypes.length === 0) continue;
      for (const blockType of blockTypes) {
        const kebab = blockType.startsWith(blockPrefix)
          ? blockType.slice(blockPrefix.length)
          : blockType;
        const be = entries.find((e) => e.targetType === "block" && e.kebabName === kebab);
        if (be) result.add(be.kebabName);
      }
    }
    return result;
  }

  return {
    name: "vite-plugin-shopify:entries",

    config(config) {
      entries = scanEntries(options);
      sectionManagedBlocks = buildSectionManagedBlocks();

      const byType: Record<string, number> = {};
      for (const e of entries) {
        byType[e.targetType] = (byType[e.targetType] || 0) + 1;
      }
      log.debug("scanned %d entries: %s", entries.length, JSON.stringify(byType));
      if (sectionManagedBlocks.size > 0) {
        log.debug("section-managed blocks: %s", [...sectionManagedBlocks].join(", "));
      }

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

      // Section-managed blocks: listen for ssg:blocks:ready event
      // instead of auto-scanning at module load.
      const isListen =
        entry.targetType === "block" && sectionManagedBlocks.has(kebabName);

      return generateEntryModule(entry, componentRel, {
        mode: isListen ? "listen" : "scan",
        debug: options.debug,
      });
    },
  };
}
