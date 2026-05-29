import type { SettingSchema, InputSettings } from "./settings";

export type ShopifyBlockType = "template" | "section" | "block" | "snippet";

export interface ShopifyMeta {
  type?: ShopifyBlockType;
  name?: string;
  tag?: string;
  class?: string;
  limit?: number;
  params?: string[];
  settings?: SettingSchema[];
  blocks?: { type: string; name?: string; settings?: SettingSchema[] }[];
  max_blocks?: number;
  presets?: PresetDefinition[];
  enabled_on?: Record<string, string>[];
  disabled_on?: Record<string, string>[];
  templates?: string[];
}

export interface PresetDefinition {
  name: string;
  category?: string;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}

export interface PresetBlock {
  type: string;
  id?: string;
  static?: boolean;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}
