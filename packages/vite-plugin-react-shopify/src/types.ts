export interface Options {
  themeRoot?: string;
  sourceCodeDir?: string;
  snippetFile?: string;
  ssg?: SSGOptions;
  importMap?: ImportMapOptions;
}

export interface SSGOptions {
  directories?: string[];
  prefix?: {
    template?: string;
    section?: string;
    block?: string;
  };
  outputName?: string;
}

export interface ImportMapOptions {
  react?: string;
  reactDomClient?: string;
}

export type ShopifyBlockType = "template" | "section" | "block";

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
  targetType: ShopifyBlockType;
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta;
}
