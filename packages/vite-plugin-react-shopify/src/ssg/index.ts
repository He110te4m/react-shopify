import path from "node:path";
import fs from "node:fs";
import { Plugin } from "vite";
import glob from "fast-glob";
import type { ResolvedOptions } from "../options";
import type { SSGEntry } from "../types";
import { scanEntries } from "./scanner";
import { compileAllEntries } from "./compiler";
import { generateHydrateEntry } from "./hydrate-entry";

export default function shopifySSG(options: ResolvedOptions): Plugin {
  return {
    name: "vite-plugin-shopify:ssg",
    enforce: "post",

    config(userConfig) {
      if (!options.ssg.enabled) return;

      const hydrateInputs = prepareHydrateEntries(options);
      const existingInput = userConfig.build?.rollupOptions?.input;

      if (existingInput && Array.isArray(existingInput)) {
        return {
          build: {
            rollupOptions: {
              input: [...(existingInput as string[]), ...hydrateInputs] as string[],
            },
          },
        };
      }

      return {};
    },

    async closeBundle() {
      if (!options.ssg.enabled) return;

      console.log("[vite-plugin-shopify-ssg] Starting SSG compilation...");
      await compileAllEntries(options);
      console.log("[vite-plugin-shopify-ssg] SSG compilation complete");
    },

    resolveId(id) {
      if (id === "vite-plugin-shopify/runtime") {
        return "\0vite-plugin-shopify:runtime";
      }
    },

    load(id) {
      if (id === "\0vite-plugin-shopify:runtime") {
        return `export { Liquid } from 'vite-plugin-shopify/runtime/Liquid'`;
      }
    },
  };
}

function prepareHydrateEntries(options: ResolvedOptions): string[] {
  const entries = scanEntries(options);
  const inputs: string[] = [];

  for (const entry of entries) {
    generateHydrateEntry(entry, options);
    const hydratePath = path.resolve(
      options.themeRoot,
      options.sourceCodeDir,
      "entrypoints",
      "_ssg-hydrate",
      `${entry.kebabName}.tsx`,
    );
    inputs.push(hydratePath);
  }

  return inputs;
}

export { compileAllEntries } from "./compiler";
