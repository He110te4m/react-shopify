const MAX_NAME_LENGTH = 25;

export function checkNameLength(meta: { name: string }, kebabName: string): string | null {
  if (meta.name.length > MAX_NAME_LENGTH) {
    return (
      `[${kebabName}] shopifyMeta.name "${meta.name}" ` +
      `is ${meta.name.length} chars (Shopify limit: ${MAX_NAME_LENGTH})`
    );
  }
  return null;
}

export function checkEmptyStringDefault(
  setting: { id?: string; type: string; default?: unknown },
): string | null {
  if (setting.default === "") {
    const label = "id" in setting && setting.id ? setting.id : "(no id)";
    return `Setting "${label}" (type: ${setting.type}) has empty string default`;
  }
  return null;
}
