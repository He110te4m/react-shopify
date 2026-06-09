import en from "./locales/en.json";

const dictionaries: Record<string, Record<string, string>> = { en };

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? `{{${key}}}`));
}

export function t(locale: string, key: string, vars?: Record<string, string | number>): string {
  const template = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
  return interpolate(template, vars);
}
