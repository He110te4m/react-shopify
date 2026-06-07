/**
 * @file Shop setup Meta validation entry point.
 *
 * Runs {@link checkNameLength}, {@link checkEmptyStringDefault}, and
 * {@link checkBlocksCoexistence} against a component's `shopifyMeta` during
 * SSG compilation. Logs warnings and auto-truncates names that exceed
 * Shopify's limit.
 */

import { logger } from "../core/logger";
import {
  checkNameLength,
  checkEmptyStringDefault,
  checkBlocksCoexistence,
  checkBlockSlot,
  MAX_NAME_LENGTH,
} from "./rules";
import type { BlockDefinition } from "../types/shopify";

const log = logger("validate");

/** Context passed to validation for log formatting. */
export interface ValidateContext {
  kebabName: string;
  filePath: string;
}

/** Minimum shape of metadata required for validation. */
export interface ValidatableMeta {
  name: string;
  settings?: { id?: string; type: string; default?: unknown }[];
  blocks?: BlockDefinition[];
}

/**
 * Run all validation rules against a component's metadata.
 *
 * @returns Array of warning message strings.
 */
export function validateShopifyMeta(meta: ValidatableMeta, context: ValidateContext): string[] {
  const warnings: string[] = [];

  const nameWarning = checkNameLength(meta, context.kebabName);
  if (nameWarning) {
    warnings.push(nameWarning);
    meta.name = meta.name.slice(0, MAX_NAME_LENGTH);
  }

  if (meta.settings) {
    for (const s of meta.settings) {
      const w = checkEmptyStringDefault(s);
      if (w) warnings.push(w);
    }
  }

  const blocksWarning = checkBlocksCoexistence(meta.blocks, context.kebabName);
  if (blocksWarning) warnings.push(blocksWarning);

  for (const w of warnings) {
    log.warn(w);
  }

  return warnings;
}

/**
 * Post-render validation: check that `<BlockSlot />` usage matches
 * the declared `blocks` configuration.
 *
 * Called from {@link compileEntry} after SSR rendering.
 */
export function validateBlockSlot(
  html: string,
  context: ValidateContext,
  blocks?: BlockDefinition[],
): string[] {
  const warnings = checkBlockSlot(html, blocks, context.kebabName);

  for (const w of warnings) {
    log.warn(w);
  }

  return warnings;
}
