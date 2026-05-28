import path from "node:path";
import type { Options, SSGOptions, ImportMapOptions } from "./types";

export interface ResolvedOptions {
  themeRoot: string;
  sourceCodeDir: string;
  snippetFile: string;
  buildDir: string;
  debug: boolean;
  hash: boolean;
  ssg: ResolvedSSGOptions;
  importMap: Required<ImportMapOptions>;
}

export interface ResolvedSSGOptions {
  directories: string[];
  prefix: Required<NonNullable<SSGOptions["prefix"]>>;
  outputName: string;
}

const defaultImportMap: Required<ImportMapOptions> = {
  react: "https://esm.sh/react@19",
  reactDomClient: "https://esm.sh/react-dom@19/client",
};

const defaultPrefix: Required<NonNullable<SSGOptions["prefix"]>> = {
  template: "page.react-",
  section: "react-",
  block: "react-",
};

export const resolveOptions = (options: Options = {}): ResolvedOptions => {
  const themeRoot = options.themeRoot ?? "./";
  const sourceCodeDir = options.sourceCodeDir ?? "frontend";
  const snippetFile = options.snippetFile ?? "shopify-importmap.liquid";
  const buildDir = options.buildDir ?? "assets";

  const ssg: ResolvedSSGOptions = {
    directories: options.ssg?.directories ?? ["sections", "blocks", "templates"],
    prefix: {
      template: options.ssg?.prefix?.template ?? defaultPrefix.template,
      section: options.ssg?.prefix?.section ?? defaultPrefix.section,
      block: options.ssg?.prefix?.block ?? defaultPrefix.block,
    },
    outputName: options.ssg?.outputName ?? "",
  };

  const importMap: Required<ImportMapOptions> = {
    react: options.importMap?.react ?? defaultImportMap.react,
    reactDomClient: options.importMap?.reactDomClient ?? defaultImportMap.reactDomClient,
  };

  return {
    themeRoot: path.resolve(themeRoot),
    sourceCodeDir,
    snippetFile,
    buildDir,
    debug: options.debug ?? false,
    hash: options.hash ?? false,
    ssg,
    importMap,
  };
};
