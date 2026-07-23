/** Setting ids are used as Liquid property names, so keep them identifier-safe. */
export const SETTING_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SIDEBAR_SETTING_TYPES = new Set(["header", "paragraph", "line_break"]);
const INPUT_SETTING_TYPES = new Set([
  "article",
  "article_list",
  "blog",
  "checkbox",
  "collection",
  "collection_list",
  "color",
  "color_background",
  "color_scheme",
  "color_scheme_group",
  "font_picker",
  "html",
  "image_picker",
  "inline_richtext",
  "link_list",
  "liquid",
  "metaobject",
  "metaobject_list",
  "number",
  "page",
  "product",
  "product_list",
  "radio",
  "range",
  "richtext",
  "select",
  "text",
  "text_alignment",
  "textarea",
  "url",
  "video",
  "video_url",
]);

type DefaultKind = "boolean" | "number" | "string" | undefined;

function defaultKind(type: string): DefaultKind {
  if (type === "checkbox") return "boolean";
  if (type === "number" || type === "range") return "number";

  switch (type) {
    case "color":
    case "color_background":
    case "color_scheme":
    case "font_picker":
    case "html":
    case "inline_richtext":
    case "link_list":
    case "liquid":
    case "radio":
    case "richtext":
    case "select":
    case "text":
    case "textarea":
    case "text_alignment":
    case "url":
      return "string";
    default:
      return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export type SettingValidationCode =
  | "invalid_setting"
  | "unsupported_type"
  | "empty_id"
  | "invalid_id"
  | "duplicate_id"
  | "missing_field"
  | "invalid_field"
  | "empty_string_default"
  | "invalid_default_type"
  | "unsupported_default"
  | "invalid_default";

export interface SettingValidationError {
  code: SettingValidationCode;
  index: number;
  id?: string;
  message: string;
}

function settingLabel(setting: Record<string, unknown>): string {
  return typeof setting.id === "string" && setting.id ? setting.id : "(no id)";
}

function validateNonEmptyStringField(
  setting: Record<string, unknown>,
  field: string,
  index: number,
  errors: SettingValidationError[],
): void {
  if (typeof setting[field] !== "string" || setting[field].trim() === "") {
    errors.push({
      code: "missing_field",
      index,
      id: typeof setting.id === "string" ? setting.id : undefined,
      message: `Setting "${settingLabel(setting)}" (type: ${String(setting.type)}) requires a non-empty ${field}`,
    });
  }
}

function validateOptions(
  setting: Record<string, unknown>,
  index: number,
  errors: SettingValidationError[],
): void {
  if (!Array.isArray(setting.options) || setting.options.length === 0) {
    errors.push({
      code: "missing_field",
      index,
      id: typeof setting.id === "string" ? setting.id : undefined,
      message: `Setting "${settingLabel(setting)}" (type: ${String(setting.type)}) requires a non-empty options array`,
    });
    return;
  }

  const values = new Set<string>();
  for (const option of setting.options) {
    if (
      !isRecord(option) ||
      typeof option.value !== "string" ||
      option.value === "" ||
      typeof option.label !== "string" ||
      option.label === ""
    ) {
      errors.push({
        code: "invalid_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: ${String(setting.type)}) options must contain non-empty string value and label fields`,
      });
      continue;
    }
    if (values.has(option.value)) {
      errors.push({
        code: "invalid_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: ${String(setting.type)}) has duplicate option value "${option.value}"`,
      });
    }
    values.add(option.value);
  }

  if (typeof setting.default === "string" && !values.has(setting.default)) {
    errors.push({
      code: "invalid_default",
      index,
      id: typeof setting.id === "string" ? setting.id : undefined,
      message: `Setting "${settingLabel(setting)}" (type: ${String(setting.type)}) default must match an option value`,
    });
  }
}

function validateTypeSpecificFields(
  setting: Record<string, unknown>,
  index: number,
  errors: SettingValidationError[],
): void {
  const type = setting.type as string;

  if (type === "radio" || type === "select") validateOptions(setting, index, errors);

  if (type === "range") {
    const { min, max, step, default: defaultValue } = setting;
    if (defaultValue === undefined) {
      errors.push({
        code: "missing_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: range) requires a default`,
      });
    }
    if (
      typeof min !== "number" ||
      !Number.isFinite(min) ||
      typeof max !== "number" ||
      !Number.isFinite(max) ||
      min >= max
    ) {
      errors.push({
        code: "invalid_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: range) requires finite min and max values with min < max`,
      });
    }
    if (step !== undefined && (typeof step !== "number" || !Number.isFinite(step) || step <= 0)) {
      errors.push({
        code: "invalid_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: range) step must be a positive finite number`,
      });
    }
    if (
      typeof defaultValue === "number" &&
      typeof min === "number" &&
      typeof max === "number" &&
      (defaultValue < min || defaultValue > max)
    ) {
      errors.push({
        code: "invalid_default",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: range) default must be between min and max`,
      });
    }
  }

  if (
    type === "number" &&
    typeof setting.default === "number" &&
    !Number.isFinite(setting.default)
  ) {
    errors.push({
      code: "invalid_default",
      index,
      id: typeof setting.id === "string" ? setting.id : undefined,
      message: `Setting "${settingLabel(setting)}" (type: number) default must be finite`,
    });
  }

  if (type.endsWith("_list") && setting.limit !== undefined) {
    if (!Number.isInteger(setting.limit) || (setting.limit as number) <= 0) {
      errors.push({
        code: "invalid_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: ${type}) limit must be a positive integer`,
      });
    }
  }

  if (type === "metaobject" || type === "metaobject_list") {
    validateNonEmptyStringField(setting, "metaobject_type", index, errors);
  }

  if (type === "font_picker" && setting.default === undefined) {
    errors.push({
      code: "missing_field",
      index,
      id: typeof setting.id === "string" ? setting.id : undefined,
      message: `Setting "${settingLabel(setting)}" (type: font_picker) requires a default`,
    });
  }

  if (type === "video_url") {
    if (
      !Array.isArray(setting.accept) ||
      setting.accept.length === 0 ||
      setting.accept.some((provider) => provider !== "youtube" && provider !== "vimeo")
    ) {
      errors.push({
        code: "invalid_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: video_url) accept must contain youtube and/or vimeo`,
      });
    }
  }

  if (type === "color_scheme_group") {
    if (!Array.isArray(setting.definition) || setting.definition.length === 0) {
      errors.push({
        code: "missing_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: color_scheme_group) requires a non-empty definition`,
      });
    } else {
      const allowed = new Set(["header", "color", "color_background"]);
      if (
        setting.definition.some((entry) => !isRecord(entry) || !allowed.has(String(entry.type)))
      ) {
        errors.push({
          code: "invalid_field",
          index,
          id: typeof setting.id === "string" ? setting.id : undefined,
          message: `Setting "${settingLabel(setting)}" (type: color_scheme_group) definition only supports header, color, and color_background settings`,
        });
      } else {
        const nestedErrors = validateSettingSchemas(setting.definition);
        for (const nestedError of nestedErrors) {
          errors.push({
            ...nestedError,
            index,
            message: `Setting "${settingLabel(setting)}" color scheme definition: ${nestedError.message}`,
          });
        }
      }
    }
    if (!isRecord(setting.role)) {
      errors.push({
        code: "missing_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: color_scheme_group) requires a role object`,
      });
    } else if (
      typeof setting.role.text !== "string" ||
      setting.role.text.trim() === "" ||
      !(
        typeof setting.role.background === "string" ||
        (isRecord(setting.role.background) &&
          typeof setting.role.background.solid === "string" &&
          setting.role.background.solid !== "")
      )
    ) {
      errors.push({
        code: "invalid_field",
        index,
        id: typeof setting.id === "string" ? setting.id : undefined,
        message: `Setting "${settingLabel(setting)}" (type: color_scheme_group) role requires text and background mappings`,
      });
    }
  }
}

/**
 * Validate a settings array without requiring a builder or a compiler runtime.
 * The input is intentionally unknown so this function remains useful at JS
 * boundaries and in tests that exercise malformed values.
 */
export function validateSettingSchemas(settings: readonly unknown[]): SettingValidationError[] {
  const errors: SettingValidationError[] = [];
  const seen = new Map<string, number>();

  settings.forEach((setting, index) => {
    if (!isRecord(setting) || typeof setting.type !== "string") {
      errors.push({
        code: "invalid_setting",
        index,
        message: `Setting at index ${index} must be an object with a string type`,
      });
      return;
    }

    const { type } = setting;
    if (!SIDEBAR_SETTING_TYPES.has(type) && !INPUT_SETTING_TYPES.has(type)) {
      errors.push({
        code: "unsupported_type",
        index,
        message: `Setting at index ${index} has unsupported type "${type}"`,
      });
      return;
    }

    if (SIDEBAR_SETTING_TYPES.has(type)) {
      if (type === "header" || type === "paragraph") {
        validateNonEmptyStringField(setting, "content", index, errors);
      }
      return;
    }

    const rawId = setting.id;
    if (typeof rawId !== "string") {
      errors.push({
        code: "empty_id",
        index,
        message: `Setting at index ${index} (type: ${type}) must have a non-empty id`,
      });
    } else if (rawId.trim() === "") {
      errors.push({
        code: "empty_id",
        index,
        id: rawId,
        message: `Setting at index ${index} (type: ${type}) must have a non-empty id`,
      });
    } else {
      if (!SETTING_ID_PATTERN.test(rawId)) {
        errors.push({
          code: "invalid_id",
          index,
          id: rawId,
          message:
            `Setting id "${rawId}" at index ${index} is invalid; ` +
            "use letters, numbers, and underscores, starting with a letter or underscore",
        });
      }

      const previousIndex = seen.get(rawId);
      if (previousIndex !== undefined) {
        errors.push({
          code: "duplicate_id",
          index,
          id: rawId,
          message: `Duplicate setting id "${rawId}" at indexes ${previousIndex} and ${index}`,
        });
      } else {
        seen.set(rawId, index);
      }
    }

    validateNonEmptyStringField(setting, "label", index, errors);
    validateTypeSpecificFields(setting, index, errors);

    if (!("default" in setting) || setting.default === undefined) return;

    if (setting.default === "") {
      errors.push({
        code: "empty_string_default",
        index,
        id: typeof rawId === "string" ? rawId : undefined,
        message:
          `Setting "${typeof rawId === "string" && rawId ? rawId : "(no id)"}" ` +
          `(type: ${type}) has empty string default`,
      });
      return;
    }

    const expected = defaultKind(type);
    if (expected === undefined) {
      errors.push({
        code: "unsupported_default",
        index,
        id: typeof rawId === "string" ? rawId : undefined,
        message: `Setting "${typeof rawId === "string" && rawId ? rawId : "(no id)"}" (type: ${type}) does not support a default value`,
      });
      return;
    }

    const actual = typeof setting.default;
    if (actual !== expected) {
      errors.push({
        code: "invalid_default_type",
        index,
        id: typeof rawId === "string" ? rawId : undefined,
        message:
          `Setting "${typeof rawId === "string" && rawId ? rawId : "(no id)"}" ` +
          `(type: ${type}) default must be a ${expected}, received ${actual}`,
      });
    }
  });

  return errors;
}

export class SettingSchemaValidationError extends Error {
  readonly errors: readonly SettingValidationError[];

  constructor(errors: readonly SettingValidationError[]) {
    super(
      `Setting schema validation failed:\n${errors.map((error) => `- ${error.message}`).join("\n")}`,
    );
    this.name = "SettingSchemaValidationError";
    this.errors = errors;
  }
}

/** Throw a stable, readable error when the schema contains invalid settings. */
export function assertValidSettingSchemas(settings: readonly unknown[]): void {
  const errors = validateSettingSchemas(settings);
  if (errors.length > 0) throw new SettingSchemaValidationError(errors);
}
