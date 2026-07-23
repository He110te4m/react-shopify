import type { SettingSchema, SettingValueForType, ShopifySettingObject } from "../types/settings";
import { compileShopifyReference, type ShopifyReference } from "../contract/expression";
import { bridgeId, type TrackOptions } from "./bridge";
import { useShopifyContext } from "./ShopifyContext";

type InputSetting<Setting> = Extract<Setting, { id: string; type: string }>;

export type SettingPropValue<Setting extends { type: string }> = SettingValueForType<
  Setting["type"]
>;

export type SettingsProps<Schema extends readonly SettingSchema[]> = {
  [Setting in InputSetting<Schema[number]> as Setting["id"]]: SettingPropValue<Setting>;
};

export type SettingsRefs<Schema extends readonly SettingSchema[]> = {
  [Setting in InputSetting<Schema[number]> as Setting["id"]]: ShopifyReference<
    SettingPropValue<Setting>,
    Setting["type"] extends "html" | "liquid" | "richtext" | "inline_richtext"
      ? "html"
      : SettingPropValue<Setting> extends ShopifySettingObject | ShopifySettingObject[] | null
        ? "object"
        : "text"
  >;
};

const JSON_SETTING_TYPES = new Set([
  "article",
  "article_list",
  "blog",
  "collection",
  "collection_list",
  "color_scheme_group",
  "font_picker",
  "image_picker",
  "link_list",
  "metaobject",
  "metaobject_list",
  "page",
  "product",
  "product_list",
  "video",
  "video_url",
]);

function bridgeType(type: string): TrackOptions["type"] | undefined {
  if (type === "checkbox") return "boolean";
  if (type === "number" || type === "range") return "number";
  if (JSON_SETTING_TYPES.has(type)) return "json";
  return undefined;
}

function coerce(
  raw: unknown,
  type: TrackOptions["type"],
  fallback: unknown,
  settingType: string,
): unknown {
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

  if (type === "json") {
    if (raw == null) return settingType.endsWith("_list") ? [] : (fallback ?? null);
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return settingType.endsWith("_list") ? [] : (fallback ?? null);
    }
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
    props[setting.id] = coerce(context.read(id), type, fallback, setting.type);
  }

  return props as SettingsProps<Schema>;
}
