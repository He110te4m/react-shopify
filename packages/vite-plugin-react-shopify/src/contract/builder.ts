import type {
  CheckboxSetting,
  ColorSchemeSetting,
  HeaderSetting,
  ImagePickerSetting,
  InlineRichtextSetting,
  NumberSetting,
  ParagraphSetting,
  RangeSetting,
  SelectSetting,
  SettingSchema,
  TextSetting,
  UrlSetting,
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

export type TextSettingOptions = Omit<TextSetting, "id" | "type"> & { id?: string };
export type ImageSettingOptions = Omit<ImagePickerSetting, "id" | "type"> & { id?: string };
export type CheckboxSettingOptions = Omit<CheckboxSetting, "id" | "type"> & { id?: string };
export type ColorSchemeSettingOptions = Omit<ColorSchemeSetting, "id" | "type"> & { id?: string };
export type NumberSettingOptions = Omit<NumberSetting, "id" | "type"> & { id?: string };
export type RangeSettingOptions = Omit<RangeSetting, "id" | "type"> & { id?: string };
export type SelectSettingOptions = Omit<SelectSetting, "id" | "type"> & { id?: string };
export type InlineRichTextSettingOptions = Omit<InlineRichtextSetting, "id" | "type"> & {
  id?: string;
};
export type UrlSettingOptions = Omit<UrlSetting, "id" | "type"> & { id?: string };
export type HeaderSettingOptions = Omit<HeaderSetting, "type">;
export type ParagraphSettingOptions = Omit<ParagraphSetting, "type">;

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

/** Create a text setting descriptor. `id` may be supplied or inferred from a map key. */
export function createTextSetting<const Options extends TextSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "text" }> {
  return createDescriptor({ ...options, type: "text" });
}

/** Create an image picker setting descriptor. `id` may be supplied or inferred from a map key. */
export function createImageSetting<const Options extends ImageSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "image_picker" }> {
  return createDescriptor({ ...options, type: "image_picker" });
}

/** Create a checkbox setting descriptor. `id` may be supplied or inferred from a map key. */
export function createCheckboxSetting<const Options extends CheckboxSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "checkbox" }> {
  return createDescriptor({ ...options, type: "checkbox" });
}

export function createColorSchemeSetting<const Options extends ColorSchemeSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "color_scheme" }> {
  return createDescriptor({ ...options, type: "color_scheme" });
}

export function createNumberSetting<const Options extends NumberSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "number" }> {
  return createDescriptor({ ...options, type: "number" });
}

export function createRangeSetting<const Options extends RangeSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "range" }> {
  return createDescriptor({ ...options, type: "range" });
}

export function createSelectSetting<const Options extends SelectSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "select" }> {
  return createDescriptor({ ...options, type: "select" });
}

export function createInlineRichTextSetting<const Options extends InlineRichTextSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "inline_richtext" }> {
  return createDescriptor({ ...options, type: "inline_richtext" });
}

export function createUrlSetting<const Options extends UrlSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "url" }> {
  return createDescriptor({ ...options, type: "url" });
}

export function createHeaderSetting<const Options extends HeaderSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "header" }> {
  return createDescriptor({ ...options, type: "header" });
}

export function createParagraphSetting<const Options extends ParagraphSettingOptions>(
  options: Options,
): SettingDescriptor<Options & { type: "paragraph" }> {
  return createDescriptor({ ...options, type: "paragraph" });
}

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
