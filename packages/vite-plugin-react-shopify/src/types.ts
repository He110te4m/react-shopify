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

export type SettingValue = string | number | boolean;

export type InputSettings = Record<string, SettingValue>;

export type SettingType =
  | "text"
  | "textarea"
  | "richtext"
  | "inline_richtext"
  | "number"
  | "range"
  | "checkbox"
  | "select"
  | "radio"
  | "text_alignment"
  | "image_picker"
  | "video_url"
  | "product"
  | "collection"
  | "page"
  | "link_list"
  | "blog"
  | "article"
  | "color"
  | "color_background"
  | "font_picker"
  | "url"
  | "html"
  | "liquid"
  | "header"
  | "paragraph"
  | "line_break";

export interface SettingSchema {
  type: SettingType;
  id: string;
  label: string;
  default?: SettingValue;
  info?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

/** @deprecated Use {@link SettingSchema} instead */
export type SchemaSetting = SettingSchema;

export interface ShopifyMeta {
  type?: ShopifyBlockType;
  name: string;
  tag?: string;
  class?: string;
  limit?: number;
  settings?: SettingSchema[];
  blocks?: { type: string; name?: string; settings?: SettingSchema[] }[];
  max_blocks?: number;
  presets?: PresetDefinition[];
  enabled_on?: Record<string, string>[];
  disabled_on?: Record<string, string>[];
  templates?: string[];
}

export interface PresetDefinition {
  name: string;
  category?: string;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}

export interface PresetBlock {
  type: string;
  id?: string;
  static?: boolean;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}

export interface SSGEntry {
  filePath: string;
  componentName: string;
  kebabName: string;
  targetType: ShopifyBlockType;
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta;
}
