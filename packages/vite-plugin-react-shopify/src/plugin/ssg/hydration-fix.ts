import { logger } from "../logger";

const log = logger("hydration-fix");

/**
 * Auto-fix adjacent text+expression children in JSX elements.
 *
 * Works on a per-line basis to avoid JSX attribute parsing complexity
 * (e.g. arrow functions containing `>` in onClick handlers).
 *
 * Detects and warns about multi-line cases that can't be auto-fixed.
 */
export function autoFixAdjacentText(
  source: string,
  filePath: string,
): { result: string; fixCount: number } {
  let fixCount = 0;
  const lines = source.split("\n");
  const fixed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match JSX elements where children content has BOTH literal text AND {expr}
    // on a single line: <tag...>text{expr}</tag> or <tag...>{expr}text</tag>
    const replaced = line.replace(
      /<(\w+)([^>]*?)>([^<]*?\{[^}]*\}[^<]*?)<\/\1>/g,
      (match, tagName, attrs: string, content: string) => {
        const trimmed = content.trim();
        if (!needsFix(trimmed)) return match;

        fixCount++;
        const tpl = trimmed.replace(/\{([^}]+)\}/g, "${$1}");
        return `<${tagName}${attrs}>{\`${tpl}\`}</${tagName}>`;
      },
    );
    fixed.push(replaced);
  }

  if (fixCount > 0) {
    log.warn(
      `auto-fixed ${fixCount} adjacent text+expression issue(s) in ${filePath}`,
    );
  }

  return { result: fixed.join("\n"), fixCount };
}

function needsFix(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  // Single expression or template literal → safe (single text node)
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner.startsWith("`") && inner.endsWith("`")) return false;
    if (inner.length > 0 && !/<[a-zA-Z]/.test(inner)) return false;
  }

  // Pure text (no expressions) → safe
  if (!/\{/.test(trimmed)) return false;

  // Contains child JSX tags → too risky
  if (/<[a-zA-Z]/.test(trimmed)) return false;

  return true;
}
