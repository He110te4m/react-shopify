import type { SettingSchema } from "../types/settings";
import {
  createSettingsSchema,
  type SettingDescriptorMap,
  type SettingSchemaFromMap,
} from "../contract";
import {
  createSettingExpression,
  unsafeShopifyReference,
  type SettingsScope,
  type ShopifyContentKind,
  type ShopifyReference,
} from "../contract/expression";
import { useSettingsProps, type SettingsProps, type SettingsRefs } from "./useProps";

export type LiquidExpression<
  T = string,
  Content extends ShopifyContentKind = "text",
> = ShopifyReference<T, Content>;

export type { SettingsProps, SettingsRefs } from "./useProps";

export interface SettingsContract<Map extends SettingDescriptorMap> {
  schema: SettingSchemaFromMap<Map>;
  refs: SettingsRefs<SettingSchemaFromMap<Map>>;
  useProps: () => SettingsProps<SettingSchemaFromMap<Map>>;
}

function createRefs<const Schema extends readonly SettingSchema[]>(
  scope: SettingsScope,
  schema: Schema,
): SettingsRefs<Schema> {
  const refs: Record<string, ShopifyReference<unknown, any>> = {};
  for (const setting of schema) {
    if ("id" in setting) refs[setting.id] = createSettingExpression(scope, setting.id);
  }
  return refs as unknown as SettingsRefs<Schema>;
}

export function defineSettings<const T extends readonly SettingSchema[]>(
  scope: SettingsScope,
  schema: T,
): { schema: T; refs: SettingsRefs<T> };
export function defineSettings<const Map extends SettingDescriptorMap>(
  scope: SettingsScope,
  settings: Map,
): SettingsContract<Map>;
export function defineSettings(
  scope: SettingsScope,
  settings: readonly SettingSchema[] | SettingDescriptorMap,
): any {
  if (Array.isArray(settings)) {
    return { schema: settings, refs: createRefs(scope, settings) };
  }

  const schema = createSettingsSchema(settings as SettingDescriptorMap);
  const refs = createRefs(scope, schema);
  return {
    schema,
    refs,
    useProps: () => useSettingsProps(schema, refs),
  };
}

export function liquidExpression<T = string, Content extends "text" | "html" | "object" = "text">(
  expression: string,
): LiquidExpression<T, Content> {
  return unsafeShopifyReference<T, Content>(expression);
}
