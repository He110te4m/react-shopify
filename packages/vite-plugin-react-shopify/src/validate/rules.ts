/**
 * @file Validation rules for Shopify component metadata.
 */

import type { BlockDefinition } from "../types/shopify";
import type { ShopifyEntryType } from "../types/shopify";

/** Maximum allowed length for `shopifyMeta.name` (Shopify limit). */
export const MAX_NAME_LENGTH = 25;

/**
 * Check that the component name does not exceed Shopify's 25-character limit.
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

/** Check deprecated `shopifyMeta.type`; entry kind is directory-inferred. */
export function checkEntryTypeOverride(
  metaType: unknown,
  targetType: ShopifyEntryType | undefined,
  kebabName: string,
): string | null {
  if (metaType === undefined || targetType === undefined) return null;

  const inferred = `entry kind is inferred from the source directory as "${targetType}"`;
  const mismatch = metaType !== targetType ? ` "${String(metaType)}"` : "";

  return (
    `[${kebabName}] shopifyMeta.type${mismatch} is deprecated and ignored; ` +
    `${inferred}. Do not use shopifyMeta.type to define Shopify Theme Block ` +
    `references; use parent blocks[].type for @theme/@app/generated block filenames.`
  );
}

/** A block kind discriminator used by {@link checkBlocksCoexistence}. */
type BlockKind = "section" | "theme-or-app";

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

/**
 * Check that a block definition includes a name field for meaningful display.
 */
export function checkBlockName(block: BlockDefinition, kebabName: string): string | null {
  if (!block.name) {
    return `[${kebabName}] block type "${block.type}" has no 'name' — add one for the theme editor display`;
  }
  return null;
}

/**
 * Scans SSR HTML for `<shopify-block-slot>` elements and validates against
 * the declared `blocks` config.
 *
 * - If `blocks` is declared but no BlockSlot is found → warning.
 * - If multiple BlockSlots are found → warning (Shopify only supports one
 *   `{% content_for 'blocks' %}` per section/block).
 */
export function checkBlockSlot(
  html: string,
  blocks: BlockDefinition[] | undefined,
  kebabName: string,
): string[] {
  const warnings: string[] = [];
  const hasDeclaredBlocks = blocks && blocks.length > 0;
  const blockSlotCount = (html.match(/<shopify-block-slot/g) || []).length;

  if (hasDeclaredBlocks && blockSlotCount === 0) {
    warnings.push(
      `[${kebabName}] shopifyMeta.blocks is declared but no <BlockSlot /> found ` +
      `in the React tree — child blocks will not render. Add <BlockSlot /> ` +
      `where you want child blocks to appear.`,
    );
  }

  if (blockSlotCount > 1) {
    warnings.push(
      `[${kebabName}] Multiple <BlockSlot /> found (${blockSlotCount}). ` +
      `Shopify supports at most one '{% content_for 'blocks' %}' per section/block. ` +
      `Remove duplicate BlockSlot components.`,
    );
  }

  return warnings;
}
