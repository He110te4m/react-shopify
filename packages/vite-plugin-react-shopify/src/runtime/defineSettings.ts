import type { SettingSchema } from "../types/settings";

declare const liquidExpressionBrand: unique symbol;

export type LiquidExpression<T = string, Content extends "text" | "html" | "object" = "text"> = string & {
  readonly [liquidExpressionBrand]?: { value: T; content: Content };
};

type InputSetting<T> = Extract<T, { id: string; type: string }>;
type SettingValue<T extends { type: string }> = T["type"] extends "checkbox"
  ? boolean
  : T["type"] extends "number" | "range"
    ? number
    : string;
type SettingContent<T extends { type: string }> = T["type"] extends "html" | "richtext" | "inline_richtext"
  ? "html"
  : T["type"] extends "image_picker" | "video" | "product" | "collection" | "page"
    ? "object"
    : "text";
type SettingRefs<T extends readonly SettingSchema[]> = {
  [S in InputSetting<T[number]> as S["id"]]: LiquidExpression<SettingValue<S>, SettingContent<S>>;
};

export function defineSettings<const T extends readonly SettingSchema[]>(
  scope: "section" | "block",
  schema: T,
): { schema: T; refs: SettingRefs<T> } {
  const refs: Record<string, string> = {};
  for (const setting of schema) {
    if ("id" in setting) refs[setting.id] = `${scope}.settings.${setting.id}`;
  }
  return { schema, refs: refs as SettingRefs<T> };
}

export function liquidExpression<T = string, Content extends "text" | "html" | "object" = "text">(
  expression: string,
): LiquidExpression<T, Content> {
  return expression as LiquidExpression<T, Content>;
}
