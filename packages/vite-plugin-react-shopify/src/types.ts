export interface Options {
  /**
   * Root path to your Shopify theme directory.
   *
   * @default './'
   */
  themeRoot?: string;

  /**
   * Front-end entry points directory.
   *
   * @default 'frontend/entrypoints'
   */
  entrypointsDir?: string;

  /**
   * Additional files to use as entry points (accepts an array of file paths or glob patterns).
   *
   * @default []
   */
  additionalEntrypoints?: string[];

  /**
   * Front-end source code directory.
   *
   * @default 'frontend'
   */
  sourceCodeDir?: string;

  /**
   * Specifies the file name of the snippet that loads your assets.
   *
   * @default 'vite-tag.liquid'
   */
  snippetFile?: string;

  /**
   * Specifies whether to append version numbers to your production-ready asset URLs in {@link snippetFile}.
   *
   * @default false
   */
  versionNumbers?: boolean;

  /**
   * Enables the creation of Cloudflare tunnels during dev, allowing previews from any device.
   *
   * @default false
   */
  tunnel?: boolean | string;

  /**
   * Specifies whether to use the {@link https://www.npmjs.com/package/@shopify/theme-hot-reload @shopify/theme-hot-reload} script to enable hot reloading for the theme.
   */
  themeHotReload?: boolean;

  /**
   * Configuration for React-to-Liquid SSG compilation.
   */
  ssg?: SSGOptions;
}

export type DevServerUrl = `${"http" | "https"}://${string}:${number}`;

export interface FrontendURLResult {
  frontendUrl: string;
  frontendPort: number;
  usingLocalhost: boolean;
}

export type ShopifyBlockType = "template" | "section" | "block";

export interface SSGOptions {
  enabled?: boolean;
  directories?: string[];
  prefix?: {
    template?: string;
    section?: string;
    block?: string;
  };
  outputName?: string;
}

export interface ShopifyMeta {
  type?: ShopifyBlockType;
  name: string;
  tag?: string;
  class?: string;
  limit?: number;
  settings?: SchemaSetting[];
  blocks?: { type: string; name?: string; settings?: SchemaSetting[] }[];
  max_blocks?: number;
  presets?: PresetDefinition[];
  enabled_on?: Record<string, string>[];
  disabled_on?: Record<string, string>[];
  templates?: string[];
}

export interface SchemaSetting {
  type: string;
  id: string;
  label: string;
  default?: string | number | boolean;
  info?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface PresetDefinition {
  name: string;
  category?: string;
  settings?: Record<string, string | number | boolean>;
  blocks?: PresetBlock[];
}

export interface PresetBlock {
  type: string;
  id?: string;
  static?: boolean;
  settings?: Record<string, string | number | boolean>;
  blocks?: PresetBlock[];
}

export interface SSGEntry {
  filePath: string;
  componentName: string;
  kebabName: string;
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta;
  targetType: ShopifyBlockType;
}
