import type { SettingSchema, ShopifyMeta } from "../../types";
import { logger } from "../logger";

const log = logger("schema-gen");

function serializeSetting(setting: SettingSchema): Record<string, unknown> {
  const s: Record<string, unknown> = { type: setting.type };

  if ("id" in setting) s.id = setting.id;
  if ("label" in setting) s.label = setting.label;

  if ("default" in setting && setting.default !== undefined) {
    if (setting.default === "") {
      log.warn(
        `Setting "${'id' in setting ? setting.id : '(no id)'}" has empty string default. ` +
        `Use a non-empty string or remove the default.`,
      );
    }
    s.default = setting.default;
  }
  if ("info" in setting && setting.info) s.info = setting.info;
  if ("placeholder" in setting && setting.placeholder) {
    s.placeholder = setting.placeholder;
  }
  if ("options" in setting && setting.options) s.options = setting.options;
  if ("min" in setting && setting.min !== undefined) s.min = setting.min;
  if ("max" in setting && setting.max !== undefined) s.max = setting.max;
  if ("step" in setting && setting.step !== undefined) s.step = setting.step;
  if ("unit" in setting && setting.unit) s.unit = setting.unit;
  if ("accept" in setting && setting.accept) s.accept = setting.accept;
  if ("metaobject_type" in setting && setting.metaobject_type) {
    s.metaobject_type = setting.metaobject_type;
  }
  if ("limit" in setting && setting.limit !== undefined) s.limit = setting.limit;
  if ("content" in setting && setting.content) s.content = setting.content;
  if ("definition" in setting && setting.definition) {
    s.definition = setting.definition.map(serializeSetting);
  }
  if ("role" in setting && setting.role) s.role = setting.role;

  return s;
}

export function generateSchema(
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta,
): string {
  const schema: Record<string, unknown> = {
    name: meta.name,
  };

  if (meta.tag) schema.tag = meta.tag;
  if (meta.class) schema.class = meta.class;
  if (meta.limit !== undefined) schema.limit = meta.limit;
  if (meta.max_blocks !== undefined) schema.max_blocks = meta.max_blocks;

  if (meta.settings && meta.settings.length > 0) {
    schema.settings = meta.settings.map(serializeSetting);
  }

  if (meta.blocks && meta.blocks.length > 0) {
    schema.blocks = meta.blocks.map((block) => {
      const b: Record<string, unknown> = { type: block.type };
      if (block.name) b.name = block.name;
      if (block.settings) b.settings = block.settings;
      return b;
    });
  }

  if (meta.presets && meta.presets.length > 0) {
    schema.presets = meta.presets.map((preset) => {
      const p: Record<string, unknown> = { name: preset.name };
      if (preset.category) p.category = preset.category;
      if (preset.settings) p.settings = preset.settings;
      if (preset.blocks) p.blocks = preset.blocks;
      return p;
    });
  }

  if (meta.enabled_on) schema.enabled_on = meta.enabled_on;
  if (meta.disabled_on) schema.disabled_on = meta.disabled_on;
  if (meta.templates) schema.templates = meta.templates;

  const json = JSON.stringify(schema, null, 2);
  return `\n{% schema %}\n${json}\n{% endschema %}\n`;
}
