/**
 * @file Serializes {@link ShopifyMeta} into the JSON `{% schema %}` block
 * required by Shopify theme sections and blocks.
 *
 * Translates settings array, presets, blocks configuration, and other metadata
 * fields into the exact JSON structure the Shopify theme editor expects.
 */

import type { ShopifyMeta, PresetDefinition } from "../types/shopify";

/**
 * Convert a flat `ShopifyMeta` object into the `{% schema %}...{% endschema %}`
 * Liquid block string.
 */
export function generateSchema(meta: ShopifyMeta): string {
  const schema = buildSchema(meta);
  const json = JSON.stringify(schema, null, 2);
  return `\n{% schema %}\n${json}\n{% endschema %}`;
}

/** Build the plain JSON object from metadata. */
function buildSchema(meta: ShopifyMeta): Record<string, unknown> {
  return {
    name: meta.name ?? "",
    tag: meta.tag ?? "div",
    class: meta.class ?? "",
    limit: meta.limit,
    ...(meta.max_blocks != null ? { max_blocks: meta.max_blocks } : {}),
    settings: meta.settings || [],
    blocks: meta.blocks
      ? meta.blocks.map((b) => serializeBlockDefinition(b))
      : undefined,
    presets: meta.presets
      ? meta.presets.map((p) => serializePreset(p))
      : undefined,
    ...(meta.enabled_on ? { enabled_on: meta.enabled_on } : {}),
    ...(meta.disabled_on ? { disabled_on: meta.disabled_on } : {}),
    ...(meta.templates ? { templates: meta.templates } : {}),
  };
}

/** Strip the `name` field from a block definition for JSON output. */
function serializeBlockDefinition(
  block: { type: string; name?: string; settings?: any[] },
): Record<string, unknown> {
  const { name: _name, ...rest } = block;
  return rest;
}

/** Recursively serialize preset blocks, stripping `name` and `id` if static. */
function serializePreset(preset: PresetDefinition): Record<string, unknown> {
  const obj: Record<string, unknown> = { name: preset.name };

  if (preset.category) obj.category = preset.category;

  if (preset.settings) {
    for (const [key, value] of Object.entries(preset.settings)) {
      if (obj.settings == null) obj.settings = {};
      (obj.settings as Record<string, any>)[key] =
        value === "" ? undefined : value;
    }
  }

  if (preset.blocks) {
    obj.blocks = preset.blocks.map((block) => {
      const { type, id, static: isStatic } = block;
      const p: Record<string, any> = { type };

      if (isStatic) {
        p.static = true;
        return p;
      }

      if (id && block.settings) {
        p.id = id;
        p.settings = {};
        for (const [key, value] of Object.entries(block.settings)) {
          (p.settings as Record<string, any>)[key] =
            value === "" ? undefined : value;
        }
      }

      return p;
    });
  }

  return obj;
}
