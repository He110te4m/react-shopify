import path from "node:path";
import type { Options, SSGOptions, ImportMapOptions } from "../types/options";

export interface ResolvedOptions {
  themeRoot: string;
  sourceCodeDir: string;
  snippetFile: string;
  buildDir: string;
  debug: boolean;
  ssg: ResolvedSSGOptions;
  importMap: Required<ImportMapOptions>;
}

export interface ResolvedSSGOptions {
  directories: string[];
  prefix: Required<NonNullable<SSGOptions["prefix"]>>;
  outputName: string;
  cssPrefix: string;
}

const defaultPrefix: Required<NonNullable<SSGOptions["prefix"]>> = {
  template: "page.react-",
  section: "react-",
  block: "react-",
  snippet: "react-",
};

function assetRef(buildDir: string, filename: string): string {
  if (buildDir === "assets") return filename;
  const sub = buildDir.startsWith("assets/") ? buildDir.slice(7) : buildDir;
  return `${sub}/${filename}`;
}

function liquidAssetUrl(ref: string): string {
  return `{{ '${ref}' | asset_url }}`;
}

export const resolveOptions = (options: Options = {}): ResolvedOptions => {
  const themeRoot = options.themeRoot ?? "./";
  const sourceCodeDir = options.sourceCodeDir ?? "frontend";
  const snippetFile = options.snippetFile ?? "shopify-importmap.liquid";
  const buildDir = options.buildDir ?? "assets";

  const ssg: ResolvedSSGOptions = {
    directories: options.ssg?.directories ?? ["sections", "blocks", "templates", "snippets"],
    prefix: {
      template: options.ssg?.prefix?.template ?? defaultPrefix.template,
      section: options.ssg?.prefix?.section ?? defaultPrefix.section,
      block: options.ssg?.prefix?.block ?? defaultPrefix.block,
      snippet: options.ssg?.prefix?.snippet ?? defaultPrefix.snippet,
    },
    outputName: options.ssg?.outputName ?? "",
    cssPrefix: options.ssg?.cssPrefix ?? "css",
  };

  const importMap: Required<ImportMapOptions> = {
    react: options.importMap?.react ?? liquidAssetUrl(assetRef(buildDir, "react.js")),
    reactDomClient: options.importMap?.reactDomClient ?? liquidAssetUrl(assetRef(buildDir, "react-dom.js")),
  };

  return {
    themeRoot: path.resolve(themeRoot),
    sourceCodeDir,
    snippetFile,
    buildDir,
    debug: options.debug ?? false,
    ssg,
    importMap,
  };
};
