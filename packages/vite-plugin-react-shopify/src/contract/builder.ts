import type {
  ArticleListSetting,
  ArticleSetting,
  BlogSetting,
  CheckboxSetting,
  CollectionListSetting,
  CollectionSetting,
  ColorBackgroundSetting,
  ColorSchemeGroupSetting,
  ColorSchemeSetting,
  ColorSetting,
  FontPickerSetting,
  HeaderSetting,
  HtmlSetting,
  ImagePickerSetting,
  InlineRichtextSetting,
  LineBreakSetting,
  LinkListSetting,
  LiquidSetting,
  MetaobjectListSetting,
  MetaobjectSetting,
  NumberSetting,
  PageSetting,
  ParagraphSetting,
  ProductListSetting,
  ProductSetting,
  RangeSetting,
  RadioSetting,
  RichtextSetting,
  SelectSetting,
  SettingSchema,
  TextAlignmentSetting,
  TextSetting,
  TextareaSetting,
  UrlSetting,
  VideoSetting,
  VideoUrlSetting,
} from "../types/settings";
import { assertValidSettingSchemas } from "./validator";

type BuildableSettingSchema = {
  type: SettingSchema["type"];
  id?: string;
};

type PropertyValue<Schema, Key extends PropertyKey> = Schema extends unknown
  ? Key extends keyof Schema
    ? Schema[Key]
    : never
  : never;

export type SettingDescriptor<Schema extends BuildableSettingSchema = BuildableSettingSchema> = {
  readonly kind: Schema["type"];
  readonly id?: PropertyValue<Schema, "id">;
  readonly schema: Schema;
  readonly defaultValue?: PropertyValue<Schema, "default">;
};

type InputSettingOptions<Schema extends { id: string; type: string }> = Omit<
  Schema,
  "id" | "type"
> & { id?: string };

export type ArticleSettingOptions = InputSettingOptions<ArticleSetting>;
export type ArticleListSettingOptions = InputSettingOptions<ArticleListSetting>;
export type BlogSettingOptions = InputSettingOptions<BlogSetting>;
export type CheckboxSettingOptions = InputSettingOptions<CheckboxSetting>;
export type CollectionSettingOptions = InputSettingOptions<CollectionSetting>;
export type CollectionListSettingOptions = InputSettingOptions<CollectionListSetting>;
export type ColorSettingOptions = InputSettingOptions<ColorSetting>;
export type ColorBackgroundSettingOptions = InputSettingOptions<ColorBackgroundSetting>;
export type ColorSchemeSettingOptions = InputSettingOptions<ColorSchemeSetting>;
export type ColorSchemeGroupSettingOptions = InputSettingOptions<ColorSchemeGroupSetting>;
export type FontPickerSettingOptions = InputSettingOptions<FontPickerSetting>;
export type HtmlSettingOptions = InputSettingOptions<HtmlSetting>;
export type ImageSettingOptions = InputSettingOptions<ImagePickerSetting>;
export type ImagePickerSettingOptions = ImageSettingOptions;
export type InlineRichTextSettingOptions = InputSettingOptions<InlineRichtextSetting>;
export type LinkListSettingOptions = InputSettingOptions<LinkListSetting>;
export type LiquidSettingOptions = InputSettingOptions<LiquidSetting>;
export type MetaobjectSettingOptions = InputSettingOptions<MetaobjectSetting>;
export type MetaobjectListSettingOptions = InputSettingOptions<MetaobjectListSetting>;
export type NumberSettingOptions = InputSettingOptions<NumberSetting>;
export type PageSettingOptions = InputSettingOptions<PageSetting>;
export type ProductSettingOptions = InputSettingOptions<ProductSetting>;
export type ProductListSettingOptions = InputSettingOptions<ProductListSetting>;
export type RadioSettingOptions = InputSettingOptions<RadioSetting>;
export type RangeSettingOptions = InputSettingOptions<RangeSetting>;
export type RichtextSettingOptions = InputSettingOptions<RichtextSetting>;
export type SelectSettingOptions = InputSettingOptions<SelectSetting>;
export type TextAlignmentSettingOptions = InputSettingOptions<TextAlignmentSetting>;
export type TextSettingOptions = InputSettingOptions<TextSetting>;
export type TextareaSettingOptions = InputSettingOptions<TextareaSetting>;
export type UrlSettingOptions = InputSettingOptions<UrlSetting>;
export type VideoSettingOptions = InputSettingOptions<VideoSetting>;
export type VideoUrlSettingOptions = InputSettingOptions<VideoUrlSetting>;
export type HeaderSettingOptions = Omit<HeaderSetting, "type">;
export type ParagraphSettingOptions = Omit<ParagraphSetting, "type">;
export type LineBreakSettingOptions = Omit<LineBreakSetting, "type">;

function createDescriptor<const Schema extends BuildableSettingSchema>(
  schema: Schema,
): SettingDescriptor<Schema> {
  const descriptor: SettingDescriptor<Schema> = {
    kind: schema.type,
    schema,
  };

  if (Object.prototype.hasOwnProperty.call(schema, "default")) {
    (descriptor as { defaultValue?: unknown }).defaultValue = (
      schema as { default?: unknown }
    ).default;
  }

  if (Object.prototype.hasOwnProperty.call(schema, "id") && schema.id !== undefined) {
    (descriptor as { id?: unknown }).id = schema.id;
  }

  return descriptor;
}

function createInputSetting<
  const Type extends SettingSchema["type"],
  const Options extends { id?: string },
>(type: Type, options: Options): SettingDescriptor<Options & { type: Type }> {
  return createDescriptor({ ...options, type });
}

export const createArticleSetting = <const Options extends ArticleSettingOptions>(
  options: Options,
) => createInputSetting("article", options);
export const createArticleListSetting = <const Options extends ArticleListSettingOptions>(
  options: Options,
) => createInputSetting("article_list", options);
export const createBlogSetting = <const Options extends BlogSettingOptions>(options: Options) =>
  createInputSetting("blog", options);
export const createCheckboxSetting = <const Options extends CheckboxSettingOptions>(
  options: Options,
) => createInputSetting("checkbox", options);
export const createCollectionSetting = <const Options extends CollectionSettingOptions>(
  options: Options,
) => createInputSetting("collection", options);
export const createCollectionListSetting = <const Options extends CollectionListSettingOptions>(
  options: Options,
) => createInputSetting("collection_list", options);
export const createColorSetting = <const Options extends ColorSettingOptions>(options: Options) =>
  createInputSetting("color", options);
export const createColorBackgroundSetting = <const Options extends ColorBackgroundSettingOptions>(
  options: Options,
) => createInputSetting("color_background", options);
export const createColorSchemeSetting = <const Options extends ColorSchemeSettingOptions>(
  options: Options,
) => createInputSetting("color_scheme", options);
export const createColorSchemeGroupSetting = <const Options extends ColorSchemeGroupSettingOptions>(
  options: Options,
) => createInputSetting("color_scheme_group", options);
export const createFontPickerSetting = <const Options extends FontPickerSettingOptions>(
  options: Options,
) => createInputSetting("font_picker", options);
export const createHtmlSetting = <const Options extends HtmlSettingOptions>(options: Options) =>
  createInputSetting("html", options);
export const createImagePickerSetting = <const Options extends ImagePickerSettingOptions>(
  options: Options,
) => createInputSetting("image_picker", options);
/** @deprecated Use createImagePickerSetting for the Shopify schema type name. */
export const createImageSetting = createImagePickerSetting;
export const createInlineRichTextSetting = <const Options extends InlineRichTextSettingOptions>(
  options: Options,
) => createInputSetting("inline_richtext", options);
export const createLinkListSetting = <const Options extends LinkListSettingOptions>(
  options: Options,
) => createInputSetting("link_list", options);
export const createLiquidSetting = <const Options extends LiquidSettingOptions>(options: Options) =>
  createInputSetting("liquid", options);
export const createMetaobjectSetting = <const Options extends MetaobjectSettingOptions>(
  options: Options,
) => createInputSetting("metaobject", options);
export const createMetaobjectListSetting = <const Options extends MetaobjectListSettingOptions>(
  options: Options,
) => createInputSetting("metaobject_list", options);
export const createNumberSetting = <const Options extends NumberSettingOptions>(options: Options) =>
  createInputSetting("number", options);
export const createPageSetting = <const Options extends PageSettingOptions>(options: Options) =>
  createInputSetting("page", options);
export const createProductSetting = <const Options extends ProductSettingOptions>(
  options: Options,
) => createInputSetting("product", options);
export const createProductListSetting = <const Options extends ProductListSettingOptions>(
  options: Options,
) => createInputSetting("product_list", options);
export const createRadioSetting = <const Options extends RadioSettingOptions>(options: Options) =>
  createInputSetting("radio", options);
export const createRangeSetting = <const Options extends RangeSettingOptions>(options: Options) =>
  createInputSetting("range", options);
export const createRichtextSetting = <const Options extends RichtextSettingOptions>(
  options: Options,
) => createInputSetting("richtext", options);
export const createRichTextSetting = createRichtextSetting;
export const createSelectSetting = <const Options extends SelectSettingOptions>(options: Options) =>
  createInputSetting("select", options);
export const createTextAlignmentSetting = <const Options extends TextAlignmentSettingOptions>(
  options: Options,
) => createInputSetting("text_alignment", options);
export const createTextSetting = <const Options extends TextSettingOptions>(options: Options) =>
  createInputSetting("text", options);
export const createTextareaSetting = <const Options extends TextareaSettingOptions>(
  options: Options,
) => createInputSetting("textarea", options);
export const createUrlSetting = <const Options extends UrlSettingOptions>(options: Options) =>
  createInputSetting("url", options);
export const createVideoSetting = <const Options extends VideoSettingOptions>(options: Options) =>
  createInputSetting("video", options);
export const createVideoUrlSetting = <const Options extends VideoUrlSettingOptions>(
  options: Options,
) => createInputSetting("video_url", options);
export const createHeaderSetting = <const Options extends HeaderSettingOptions>(options: Options) =>
  createDescriptor({ ...options, type: "header" });
export const createParagraphSetting = <const Options extends ParagraphSettingOptions>(
  options: Options,
) => createDescriptor({ ...options, type: "paragraph" });
export const createLineBreakSetting = <const Options extends LineBreakSettingOptions>(
  options: Options = {} as Options,
) => createDescriptor({ ...options, type: "line_break" });

export type SettingDescriptorMap = Record<string, SettingDescriptor<any>>;

type SchemaOf<Descriptor> = Descriptor extends SettingDescriptor<infer Schema> ? Schema : never;
type DefinedId<Schema> = Exclude<PropertyValue<Schema, "id">, undefined>;
type ResolvedId<Key extends string, Schema> = [DefinedId<Schema>] extends [never]
  ? Key
  : undefined extends PropertyValue<Schema, "id">
    ? Key | DefinedId<Schema>
    : DefinedId<Schema>;

type SidebarSettingType = "header" | "paragraph" | "line_break";

type SettingSchemaEntryFromMap<Map extends SettingDescriptorMap> = {
  [Key in keyof Map & string]: SchemaOf<Map[Key]> extends infer Schema extends
    BuildableSettingSchema
    ? Schema["type"] extends SidebarSettingType
      ? Omit<Schema, "id">
      : Omit<Schema, "id"> & { id: ResolvedId<Key, Schema> }
    : never;
}[keyof Map & string];

export type SettingSchemaFromMap<Map extends SettingDescriptorMap> =
  (SettingSchemaEntryFromMap<Map> & SettingSchema)[];

function isDescriptor(value: unknown): value is SettingDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const descriptor = value as Record<string, unknown>;
  const schema = descriptor.schema;
  return (
    typeof descriptor.kind === "string" &&
    typeof schema === "object" &&
    schema !== null &&
    (schema as Record<string, unknown>).type === descriptor.kind
  );
}

/**
 * Convert a keyed descriptor map into Shopify's array schema. Explicit ids win;
 * omitted ids are inferred from the object key and validated before returning.
 */
export function createSettingsSchema<const Map extends SettingDescriptorMap>(
  settings: Map,
): SettingSchemaFromMap<Map> {
  const schema = Object.entries(settings).map(([key, descriptor]) => {
    if (!isDescriptor(descriptor)) {
      throw new TypeError(`Invalid setting descriptor for key "${key}"`);
    }

    const setting = descriptor.schema as Record<string, unknown>;
    if (
      setting.type === "header" ||
      setting.type === "paragraph" ||
      setting.type === "line_break"
    ) {
      return { ...setting };
    }
    return {
      ...setting,
      id: setting.id === undefined ? key : setting.id,
    };
  });

  assertValidSettingSchemas(schema);
  return schema as SettingSchemaFromMap<Map>;
}
