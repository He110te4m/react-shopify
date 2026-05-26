import type { ShopifyMeta } from "../types";

export function generateSchema(meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta): string {
  const schema: Record<string, unknown> = {
    name: meta.name,
  };

  if (meta.tag) {
    schema.tag = meta.tag;
  }

  if (meta.class) {
    schema.class = meta.class;
  }

  if (meta.limit !== undefined) {
    schema.limit = meta.limit;
  }

  if (meta.max_blocks !== undefined) {
    schema.max_blocks = meta.max_blocks;
  }

  if (meta.settings && meta.settings.length > 0) {
    schema.settings = meta.settings.map((setting) => {
      const s: Record<string, unknown> = {
        type: setting.type,
        id: setting.id,
        label: setting.label,
      };

      if (setting.default !== undefined) s.default = setting.default;
      if (setting.info) s.info = setting.info;
      if (setting.placeholder) s.placeholder = setting.placeholder;
      if (setting.options) s.options = setting.options;
      if (setting.min !== undefined) s.min = setting.min;
      if (setting.max !== undefined) s.max = setting.max;
      if (setting.step !== undefined) s.step = setting.step;
      if (setting.unit) s.unit = setting.unit;

      return s;
    });
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

  if (meta.enabled_on) {
    schema.enabled_on = meta.enabled_on;
  }

  if (meta.disabled_on) {
    schema.disabled_on = meta.disabled_on;
  }

  if (meta.templates) {
    schema.templates = meta.templates;
  }

  const json = JSON.stringify(schema, null, 2);

  return `\n{% schema %}\n${json}\n{% endschema %}\n`;
}
