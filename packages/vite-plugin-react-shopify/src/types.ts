export interface Options {
  themeRoot?: string;
  sourceCodeDir?: string;
  snippetFile?: string;
  buildDir?: string;
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

// ── Base ────────────────────────────────────────────────────────────────

interface BaseSettingSchema {
  id: string;
  label: string;
  info?: string;
}

// ── Basic input settings ────────────────────────────────────────────────

export interface CheckboxSetting extends BaseSettingSchema {
  type: "checkbox";
  default?: boolean;
}

export interface NumberSetting extends BaseSettingSchema {
  type: "number";
  default?: number;
  placeholder?: string;
}

export interface RadioSetting extends BaseSettingSchema {
  type: "radio";
  options: { value: string; label: string }[];
  default?: string;
}

export interface RangeSetting extends BaseSettingSchema {
  type: "range";
  min: number;
  max: number;
  step?: number;
  unit?: string;
  default: number;
}

export interface SelectSetting extends BaseSettingSchema {
  type: "select";
  options: { value: string; label: string; group?: string }[];
  default?: string;
}

export interface TextSetting extends BaseSettingSchema {
  type: "text";
  default?: string;
  placeholder?: string;
}

export interface TextareaSetting extends BaseSettingSchema {
  type: "textarea";
  default?: string;
  placeholder?: string;
}

// ── Specialized input settings ──────────────────────────────────────────

export interface ArticleSetting extends BaseSettingSchema {
  type: "article";
}

export interface ArticleListSetting extends BaseSettingSchema {
  type: "article_list";
  limit?: number;
}

export interface BlogSetting extends BaseSettingSchema {
  type: "blog";
}

export interface CollectionSetting extends BaseSettingSchema {
  type: "collection";
}

export interface CollectionListSetting extends BaseSettingSchema {
  type: "collection_list";
  limit?: number;
}

export interface ColorSetting extends BaseSettingSchema {
  type: "color";
  default?: string;
}

export interface ColorBackgroundSetting extends BaseSettingSchema {
  type: "color_background";
  default?: string;
}

export interface ColorSchemeSetting extends BaseSettingSchema {
  type: "color_scheme";
  default?: string;
}

export interface ColorSchemeRole {
  text: string;
  background:
    | string
    | { solid: string; gradient?: string };
  links?: string;
  icons?: string;
  primary_button?:
    | string
    | { solid: string; gradient?: string };
  on_primary_button?: string;
  primary_button_border?: string;
  secondary_button?:
    | string
    | { solid: string; gradient?: string };
  on_secondary_button?: string;
  secondary_button_border?: string;
}

export interface ColorSchemeGroupSetting extends BaseSettingSchema {
  type: "color_scheme_group";
  definition: InputSettingSchema[];
  role: ColorSchemeRole;
}

export interface FontPickerSetting extends BaseSettingSchema {
  type: "font_picker";
  default: string;
}

export interface HtmlSetting extends BaseSettingSchema {
  type: "html";
  default?: string;
  placeholder?: string;
}

export interface ImagePickerSetting extends BaseSettingSchema {
  type: "image_picker";
}

export interface InlineRichtextSetting extends BaseSettingSchema {
  type: "inline_richtext";
  default?: string;
}

export interface LinkListSetting extends BaseSettingSchema {
  type: "link_list";
  default?: "main-menu" | "footer" | string;
}

export interface LiquidSetting extends BaseSettingSchema {
  type: "liquid";
  default?: string;
}

export interface MetaobjectSetting extends BaseSettingSchema {
  type: "metaobject";
  metaobject_type: string;
}

export interface MetaobjectListSetting extends BaseSettingSchema {
  type: "metaobject_list";
  metaobject_type: string;
  limit?: number;
}

export interface PageSetting extends BaseSettingSchema {
  type: "page";
}

export interface ProductSetting extends BaseSettingSchema {
  type: "product";
}

export interface ProductListSetting extends BaseSettingSchema {
  type: "product_list";
  limit?: number;
}

export interface RichtextSetting extends BaseSettingSchema {
  type: "richtext";
  default?: string;
}

export interface TextAlignmentSetting extends BaseSettingSchema {
  type: "text_alignment";
  default?: "left" | "center" | "right";
}

export interface UrlSetting extends BaseSettingSchema {
  type: "url";
  default?: string;
}

export interface VideoSetting extends BaseSettingSchema {
  type: "video";
}

export interface VideoUrlSetting extends BaseSettingSchema {
  type: "video_url";
  accept: ("youtube" | "vimeo")[];
  placeholder?: string;
}

// ── Sidebar settings (non-input, informational) ─────────────────────────

export interface HeaderSetting {
  type: "header";
  content: string;
  info?: string;
}

export interface ParagraphSetting {
  type: "paragraph";
  content: string;
}

export interface LineBreakSetting {
  type: "line_break";
}

// ── Setting type string union ───────────────────────────────────────────

export type SettingType = InputSettingSchema["type"];

// ── Union types ─────────────────────────────────────────────────────────

export type InputSettingSchema =
  | CheckboxSetting
  | NumberSetting
  | RadioSetting
  | RangeSetting
  | SelectSetting
  | TextSetting
  | TextareaSetting
  | ArticleSetting
  | ArticleListSetting
  | BlogSetting
  | CollectionSetting
  | CollectionListSetting
  | ColorSetting
  | ColorBackgroundSetting
  | ColorSchemeSetting
  | ColorSchemeGroupSetting
  | FontPickerSetting
  | HtmlSetting
  | ImagePickerSetting
  | InlineRichtextSetting
  | LinkListSetting
  | LiquidSetting
  | MetaobjectSetting
  | MetaobjectListSetting
  | PageSetting
  | ProductSetting
  | ProductListSetting
  | RichtextSetting
  | TextAlignmentSetting
  | UrlSetting
  | VideoSetting
  | VideoUrlSetting;

export type SidebarSetting =
  | HeaderSetting
  | ParagraphSetting
  | LineBreakSetting;

export type SettingSchema = InputSettingSchema | SidebarSetting;

/** @deprecated Use {@link SettingSchema} instead */
export type SchemaSetting = SettingSchema;

// ── Shopify meta ────────────────────────────────────────────────────────

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

// ── SSG ──────────────────────────────────────────────────────────────────

export interface SSGEntry {
  filePath: string;
  componentName: string;
  kebabName: string;
  targetType: ShopifyBlockType;
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta;
}
