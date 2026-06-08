import type { ResolvedOptions } from "./options";
import type { SSGEntry } from "../types/ssg";

export function normalizeBlockType(blockType: string, options: ResolvedOptions): string {
  const blockPrefix = options.ssg.prefix.block;
  return blockType.startsWith(blockPrefix)
    ? blockType.slice(blockPrefix.length)
    : blockType;
}

export function getDeclaredBlockTypes(entry: SSGEntry): string[] {
  return (entry.meta as { _blockTypes?: string[] })._blockTypes ?? [];
}

export function findBlockEntry(
  entries: SSGEntry[],
  blockType: string,
  options: ResolvedOptions,
): SSGEntry | undefined {
  const kebab = normalizeBlockType(blockType, options);
  return entries.find((entry) => entry.targetType === "block" && entry.kebabName === kebab);
}

export function getSectionManagedBlocks(
  entries: SSGEntry[],
  options: ResolvedOptions,
): Set<string> {
  const result = new Set<string>();

  for (const entry of entries) {
    if (entry.targetType !== "section") continue;

    for (const blockType of getDeclaredBlockTypes(entry)) {
      const blockEntry = findBlockEntry(entries, blockType, options);
      if (blockEntry) result.add(blockEntry.kebabName);
    }
  }

  return result;
}
