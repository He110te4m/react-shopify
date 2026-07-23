/** Setting ids are used as Liquid property names, so keep them identifier-safe. */
export const SETTING_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SIDEBAR_SETTING_TYPES = new Set(["header", "paragraph", "line_break"]);

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
  | "empty_id"
  | "invalid_id"
  | "duplicate_id"
  | "empty_string_default"
  | "invalid_default_type"
  | "unsupported_default";

export interface SettingValidationError {
  code: SettingValidationCode;
  index: number;
  id?: string;
  message: string;
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
    if (SIDEBAR_SETTING_TYPES.has(type)) return;

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
