/**
 * @file AST-based hydration mismatch fixer for JSX/TSX source.
 *
 * React SSR renders adjacent text and expression children without separators,
 * but browser hydration treats them as separate DOM nodes, causing mismatches.
 * This module parses the source with OXC, walks the AST, detects runs of
 * adjacent `JSXText` + `JSXExpressionContainer` children, and wraps them in a
 * template literal `{\`...\`}` so React produces a single text node.
 */

import type { JSXChild, JSXElement, JSXFragment } from "@oxc-project/types";
import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";
import { logger } from "../core/logger";

const log = logger("hydration-fix");

interface Replacement {
  start: number;
  end: number;
  replacement: string;
}

/**
 * Analyze and fix a JSX/TSX source file for adjacent-text hydration issues.
 *
 * @param source The raw source code string.
 * @param filePath The file path (used for error reporting and parser config).
 * @returns The fixed source with zero or more replacements applied, and a
 *   count of how many fixes were made.
 */
export function autoFixAdjacentText(
  source: string,
  filePath: string,
): { result: string; fixCount: number } {
  const parseResult = parseSync(filePath, source);

  if (parseResult.errors.length > 0) {
    log.debug("OXC parse errors for %s, skipping hydration fix", filePath);
    return { result: source, fixCount: 0 };
  }

  const replacements: Replacement[] = [];
  walk(parseResult.program, {
    enter(node) {
      if (node.type === "JSXElement" || node.type === "JSXFragment") {
        const children = (node as JSXElement | JSXFragment).children;
        if (children.length > 0) {
          processChildren(children, source, replacements);
        }
      }
    },
  });

  if (replacements.length === 0) {
    return { result: source, fixCount: 0 };
  }

  // Apply replacements in reverse order so offsets stay valid
  replacements.sort((a, b) => b.start - a.start);

  let fixed = source;
  for (const { start, end, replacement } of replacements) {
    fixed = fixed.slice(0, start) + replacement + fixed.slice(end);
  }

  log.warn(
    `auto-fixed ${replacements.length} adjacent text+expression issue(s) in ${filePath}`,
  );

  return { result: fixed, fixCount: replacements.length };
}

/**
 * Walk a JSX element's children, detecting runs of adjacent text +
 * expression children and emitting replacement records.
 */
function processChildren(
  children: JSXChild[],
  source: string,
  replacements: Replacement[],
): void {
  let i = 0;
  while (i < children.length) {
    if (children[i].type !== "JSXText" && children[i].type !== "JSXExpressionContainer") {
      i++;
      continue;
    }

    let runEnd = i;
    let hasText = children[i].type === "JSXText";
    let hasExpr = children[i].type === "JSXExpressionContainer";

    // Expand run while next sibling is also text or expression
    while (
      runEnd + 1 < children.length &&
      (children[runEnd + 1].type === "JSXText" ||
        children[runEnd + 1].type === "JSXExpressionContainer")
    ) {
      runEnd++;
      if (children[runEnd].type === "JSXText") hasText = true;
      if (children[runEnd].type === "JSXExpressionContainer") hasExpr = true;
    }

    if (!hasText || !hasExpr) {
      i = runEnd + 1;
      continue;
    }

    const sliceStart = children[i].start;
    const sliceEnd = children[runEnd].end;
    const runText = source.slice(sliceStart, sliceEnd);
    const trimmed = runText.trim();

    if (!needsFix(trimmed)) {
      i = runEnd + 1;
      continue;
    }

    // Wrap in template literal: `{x} {y}` → {`${x} ${y}`}
    const tpl = trimmed.replace(/\{([^}]+)\}/g, "${$1}");
    replacements.push({
      start: sliceStart,
      end: sliceEnd,
      replacement: `{\`${tpl}\`}`,
    });

    i = runEnd + 1;
  }
}

/**
 * Decide whether a run of JSX text+expressions needs fixing.
 *
 * Single expressions or elements containing HTML tags are safe.
 */
function needsFix(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner.startsWith("`") && inner.endsWith("`")) return false;
    if (inner.length > 0 && !/<[a-zA-Z]/.test(inner)) return false;
  }

  if (!/\{/.test(trimmed)) return false;
  if (/<[a-zA-Z]/.test(trimmed)) return false;

  return true;
}
