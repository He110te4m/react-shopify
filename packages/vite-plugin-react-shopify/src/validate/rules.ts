/**
 * @file Validation rules for Shopify component metadata.
 */

import type { BlockDefinition } from "../types/shopify";

/** Maximum allowed length for `shopifyMeta.name` (Shopify limit). */
export const MAX_NAME_LENGTH = 25;

/**
 * Check that the component name does not exceed Shopify's 25-character limit.
 *
 * @returns A warning message if the name is too long, or `null` if valid.
 */
export function checkNameLength(meta: { name: string }, kebabName: string): string | null {
  if (meta.name.length > MAX_NAME_LENGTH) {
    return (
      `[${kebabName}] shopifyMeta.name "${meta.name}" ` +
      `is ${meta.name.length} chars (Shopify limit: ${MAX_NAME_LENGTH})`
    );
  }
  return null;
}

/**
 * Check that a setting does not have an empty string as its default value.
 *
 * Empty-string defaults can cause Liquid rendering issues because they are
 * truthy in Liquid but falsy for HTML attributes like `hidden`.
 *
 * @returns A warning message if the default is `""`, or `null` otherwise.
 */
export function checkEmptyStringDefault(
  setting: { id?: string; type: string; default?: unknown },
): string | null {
  if (setting.default === "") {
    const label = "id" in setting && setting.id ? setting.id : "(no id)";
    return `Setting "${label}" (type: ${setting.type}) has empty string default`;
  }
  return null;
}

/** A block kind discriminator used by {@link checkBlocksCoexistence}. */
type BlockKind = "section" | "theme-or-app";

/**
 * Classify a block entry as a section block (inline schema definition with
 * `name` / `limit` / `settings`) or a theme/app block reference (bare `type`
 * only, e.g. `"@theme"`, `"@app"`, or a theme block filename).
 */
function classifyBlock(block: BlockDefinition): BlockKind {
  if (
    block.name !== undefined ||
    block.limit !== undefined ||
    block.settings !== undefined
  ) {
    return "section";
  }
  return "theme-or-app";
}

/**
 * Check that a section's `blocks` array does not mix incompatible block kinds.
 *
 * Per Shopify, a section's `blocks` attribute must contain EITHER:
 *
 * - only **section blocks** (inline definitions with `name` / `limit` /
 *   `settings`), OR
 * - only **theme/app block references** (`{ type: "@theme" | "@app" |
 *   <filename> }`).
 *
 * Mixing the two is rejected by the theme editor. The `kebabName` is the
 * kebab-cased component name used for log context.
 *
 * @returns A warning message when kinds are mixed, or `null` if compatible.
 */
export function checkBlocksCoexistence(
  blocks: BlockDefinition[] | undefined,
  kebabName: string,
): string | null {
  if (!blocks || blocks.length < 2) return null;

  const firstKind = classifyBlock(blocks[0]);
  const conflict = blocks.find((b) => classifyBlock(b) !== firstKind);
  if (!conflict) return null;

  const [sectionExample, themeAppExample] =
    firstKind === "section"
      ? [blocks[0], conflict]
      : [conflict, blocks[0]];

  return (
    `[${kebabName}] shopifyMeta.blocks mixes section blocks and theme/app block ` +
    `references — these are mutually exclusive. ` +
    `Section-block example: ${JSON.stringify(sectionExample)}. ` +
    `Theme/app-block example: ${JSON.stringify(themeAppExample)}. ` +
    `Either remove inline section blocks, or remove the @theme/@app/filename references.`
  );
}
