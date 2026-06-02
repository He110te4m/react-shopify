/**
 * @file Validation rules for Shopify component metadata.
 */

/** Maximum allowed length for `shopifyMeta.name` (Shopify limit). */
export const MAX_NAME_LENGTH = 25;

/**
 * Check that the component name does not exceed Shopify's 25-character limit.
 *
 * @returns A warning message if the name is too long, or `null` if valid.
 */
export function checkNameLength(meta: { name: string }, kebabName: string): string | null {
  if (meta.name.length > MAX_NAME_LENGTH) {
    return (
      `[${kebabName}] shopifyMeta.name "${meta.name}" ` +
      `is ${meta.name.length} chars (Shopify limit: ${MAX_NAME_LENGTH})`
    );
  }
  return null;
}

/**
 * Check that a setting does not have an empty string as its default value.
 *
 * Empty-string defaults can cause Liquid rendering issues because they are
 * truthy in Liquid but falsy for HTML attributes like `hidden`.
 *
 * @returns A warning message if the default is `""`, or `null` otherwise.
 */
export function checkEmptyStringDefault(
  setting: { id?: string; type: string; default?: unknown },
): string | null {
  if (setting.default === "") {
    const label = "id" in setting && setting.id ? setting.id : "(no id)";
    return `Setting "${label}" (type: ${setting.type}) has empty string default`;
  }
  return null;
}
