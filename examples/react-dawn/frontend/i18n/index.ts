import en from "./locales/en.json";

type Dict<T = unknown> = Record<string, T>;
const dictionaries: Record<string, Dict> = { en };

function getValue(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Dict)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

export function t(locale: string, key: string, vars?: Record<string, string | number>): string {
  const template = getValue(dictionaries[locale], key) ?? getValue(dictionaries.en, key) ?? key;
  return interpolate(template, vars);
}
