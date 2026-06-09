/**
 * @file User-facing configuration options for the Vite plugin.
 *
 * All fields are optional with sensible defaults applied at resolution time
 * by {@link resolveOptions} (core/options.ts).
 */

/** Top-level plugin options passed to `vitePluginShopify()`. */
export interface Options {
  themeRoot?: string;
  sourceCodeDir?: string;
  snippetFile?: string;
  buildDir?: string;
  chunkPrefix?: string;
  debug?: boolean;
  ssg?: SSGOptions;
  importMap?: ImportMapOptions;
}

/** Static Site Generation configuration. */
export interface SSGOptions {
  directories?: string[];
  prefix?: {
    template?: string;
    section?: string;
    block?: string;
    snippet?: string;
  };
  outputName?: string;
  cssPrefix?: string;
}

/** CDN URLs for the import map snippet injected into the theme. */
export interface ImportMapOptions {
  react?: string;
  reactDomClient?: string;
}
