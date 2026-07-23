import type { SettingSchema } from "../types/settings";
import { compileShopifyReference, type ShopifyReference } from "../contract/expression";
import { bridgeId, type TrackOptions } from "./bridge";
import { useShopifyContext } from "./ShopifyContext";

type InputSetting<Setting> = Extract<Setting, { id: string; type: string }>;

export type SettingPropValue<Setting extends { type: string }> = Setting["type"] extends "checkbox"
  ? boolean
  : Setting["type"] extends "number" | "range"
    ? number
    : string;

export type SettingsProps<Schema extends readonly SettingSchema[]> = {
  [Setting in InputSetting<Schema[number]> as Setting["id"]]: SettingPropValue<Setting>;
};

export type SettingsRefs<Schema extends readonly SettingSchema[]> = {
  [Setting in InputSetting<Schema[number]> as Setting["id"]]: ShopifyReference<
    SettingPropValue<Setting>,
    Setting["type"] extends "html" | "richtext" | "inline_richtext"
      ? "html"
      : Setting["type"] extends "image_picker" | "video" | "product" | "collection" | "page"
        ? "object"
        : "text"
  >;
};

function bridgeType(type: string): TrackOptions["type"] | undefined {
  if (type === "checkbox") return "boolean";
  if (type === "number" || type === "range") return "number";
  return undefined;
}

function coerce(raw: unknown, type: TrackOptions["type"], fallback: unknown): unknown {
  if (type === "number") {
    if (raw == null) return fallback ?? 0;
    if (typeof raw === "number") return raw;
    const value = Number(raw);
    return Number.isNaN(value) ? (fallback ?? 0) : value;
  }

  if (type === "boolean") {
    if (raw == null) return Boolean(fallback ?? false);
    if (typeof raw === "boolean") return raw;
    if (raw === "" || raw === "0" || raw === "false") return false;
    return Boolean(raw);
  }

  return raw ?? fallback;
}

/** Read all input settings through one stable React hook call. */
export function useSettingsProps<const Schema extends readonly SettingSchema[]>(
  schema: Schema,
  refs: SettingsRefs<Schema>,
): SettingsProps<Schema> {
  const context = useShopifyContext();
  const props: Record<string, unknown> = {};

  for (const setting of schema) {
    if (!("id" in setting)) continue;

    const reference = refs[setting.id as keyof SettingsRefs<Schema>] as ShopifyReference<unknown>;
    const expression = compileShopifyReference(reference);
    const type = bridgeType(setting.type);
    const trackOptions: TrackOptions = {
      expression,
      ...(type === undefined ? {} : { type }),
    };
    const id = bridgeId(expression, trackOptions);

    if (context.phase === "ssg") {
      context.track(id, trackOptions);
      props[setting.id] = context.read(expression, reference);
      continue;
    }

    const fallback = "default" in setting ? setting.default : undefined;
    props[setting.id] = coerce(context.read(id), type, fallback);
  }

  return props as SettingsProps<Schema>;
}
