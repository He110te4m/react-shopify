import { logger } from "../core/logger";
import { checkNameLength, checkEmptyStringDefault } from "./rules";

const log = logger("validate");

export interface ValidateContext {
  kebabName: string;
  filePath: string;
}

export interface ValidatableMeta {
  name: string;
  settings?: { id?: string; type: string; default?: unknown }[];
}

export function validateShopifyMeta(meta: ValidatableMeta, context: ValidateContext): string[] {
  const warnings: string[] = [];

  const nameWarning = checkNameLength(meta, context.kebabName);
  if (nameWarning) warnings.push(nameWarning);

  if (meta.settings) {
    for (const s of meta.settings) {
      const w = checkEmptyStringDefault(s);
      if (w) warnings.push(w);
    }
  }

  for (const w of warnings) {
    log.warn(w);
  }

  return warnings;
}
