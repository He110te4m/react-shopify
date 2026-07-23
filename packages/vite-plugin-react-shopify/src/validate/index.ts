/**
 * @file Shop setup Meta validation entry point.
 *
 * Rejects invalid setting schemas and availability scopes, then runs the
 * non-fatal metadata warning rules during SSG compilation.
 */

import { assertValidSettingSchemas } from "../contract/validator";
import { logger } from "../core/logger";
import {
  checkNameLength,
  checkEntryTypeOverride,
  checkBlocksCoexistence,
  checkBlockSlot,
  checkAvailabilityScopes,
  MAX_NAME_LENGTH,
} from "./rules";
import type { BlockDefinition, ShopifyEntryType, TemplateScope } from "../types/shopify";

const log = logger("validate");

/** Context passed to validation for log formatting. */
export interface ValidateContext {
  kebabName: string;
  filePath: string;
  targetType?: ShopifyEntryType;
}

/** Minimum shape of metadata required for validation. */
export interface ValidatableMeta {
  name: string;
  type?: unknown;
  settings?: readonly unknown[];
  blocks?: BlockDefinition[];
  enabled_on?: TemplateScope;
  disabled_on?: TemplateScope;
}

export class ShopifyMetaValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: readonly string[]) {
    super(`Shopify metadata validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    this.name = "ShopifyMetaValidationError";
    this.errors = errors;
  }
}

/**
 * Run all validation rules against a component's metadata.
 *
 * @returns Array of warning message strings.
 */
export function validateShopifyMeta(meta: ValidatableMeta, context: ValidateContext): string[] {
  if (meta.settings) assertValidSettingSchemas(meta.settings);
  for (const block of meta.blocks ?? []) {
    if (block.settings) assertValidSettingSchemas(block.settings);
  }

  const metadataErrors = checkAvailabilityScopes(
    meta.enabled_on,
    meta.disabled_on,
    context.kebabName,
  );
  if (metadataErrors.length > 0) throw new ShopifyMetaValidationError(metadataErrors);

  const warnings: string[] = [];

  const nameWarning = checkNameLength(meta, context.kebabName);
  if (nameWarning) {
    warnings.push(nameWarning);
    meta.name = meta.name.slice(0, MAX_NAME_LENGTH);
  }

  const typeWarning = checkEntryTypeOverride(meta.type, context.targetType, context.kebabName);
  if (typeWarning) warnings.push(typeWarning);

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
