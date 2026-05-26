import path from "node:path";
import { normalizePath } from "vite";
import type { Options, SSGOptions } from "./types";

export interface ResolvedOptions extends Required<Omit<Options, "ssg">> {
  ssg: Required<SSGOptions>;
}

export const resolveOptions = (options: Options): ResolvedOptions => {
  const themeRoot = options.themeRoot ?? "./";
  const sourceCodeDir = options.sourceCodeDir ?? "frontend";
  const entrypointsDir =
    options.entrypointsDir ?? normalizePath(path.join(sourceCodeDir, "entrypoints"));
  const additionalEntrypoints = options.additionalEntrypoints ?? [];
  const snippetFile = options.snippetFile ?? "vite-tag.liquid";
  const versionNumbers = options.versionNumbers ?? false;
  const tunnel = options.tunnel ?? false;
  const themeHotReload = options.themeHotReload ?? true;

  const ssg: Required<SSGOptions> = {
    enabled: options.ssg?.enabled ?? false,
    directories: options.ssg?.directories ?? ["sections", "blocks", "templates"],
    prefix: {
      template: options.ssg?.prefix?.template ?? "page.react-",
      section: options.ssg?.prefix?.section ?? "section.react-",
      block: options.ssg?.prefix?.block ?? "block.react-",
    },
    outputName: options.ssg?.outputName ?? "",
  };

  return {
    themeRoot,
    sourceCodeDir,
    entrypointsDir,
    additionalEntrypoints,
    snippetFile,
    versionNumbers,
    tunnel,
    themeHotReload,
    ssg,
  };
};
