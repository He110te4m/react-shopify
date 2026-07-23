/**
 * @file AST-based hydration mismatch diagnostics for JSX/TSX source.
 *
 * React SSR renders adjacent text and expression children without separators,
 * but browser hydration treats them as separate DOM nodes, causing mismatches.
 * This module parses the source with OXC and detects runs of adjacent
 * `JSXText` + `JSXExpressionContainer` children. It intentionally does not
 * rewrite them: coercing arbitrary React children into a template literal
 * changes the rendering semantics of nullish, boolean, and element values.
 */

import type { JSXChild, JSXElement, JSXFragment } from "@oxc-project/types";
import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";
import { logger } from "../core/logger";

const log = logger("hydration-fix");

/**
 * Analyze a JSX/TSX source file for adjacent-text hydration risks.
 *
 * @param source The raw source code string.
 * @param filePath The file path (used for error reporting and parser config).
 * @returns The unchanged source and a count of potential issues found.
 */
export function autoFixAdjacentText(
  source: string,
  filePath: string,
): { result: string; fixCount: number } {
  const parseResult = parseSync(filePath, source);

  if (parseResult.errors.length > 0) {
    log.debug("OXC parse errors for %s, skipping hydration diagnostics", filePath);
    return { result: source, fixCount: 0 };
  }

  let issueCount = 0;
  walk(parseResult.program, {
    enter(node) {
      if (node.type === "JSXElement" || node.type === "JSXFragment") {
        const children = (node as JSXElement | JSXFragment).children;
        if (children.length > 0) {
          issueCount += countAdjacentTextIssues(children, source);
        }
      }
    },
  });

  if (issueCount === 0) {
    return { result: source, fixCount: 0 };
  }

  log.warn(
    `detected ${issueCount} adjacent text+expression hydration risk(s) in ${filePath}; source was left unchanged`,
  );

  return { result: source, fixCount: issueCount };
}

/**
 * Count runs of adjacent text + expression children in a JSX element.
 */
function countAdjacentTextIssues(children: JSXChild[], source: string): number {
  let issueCount = 0;
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

    if (!isAdjacentTextRisk(trimmed)) {
      i = runEnd + 1;
      continue;
    }

    issueCount++;

    i = runEnd + 1;
  }

  return issueCount;
}

/**
 * Decide whether a run of JSX text+expressions warrants a diagnostic.
 *
 * Single expressions or elements containing HTML tags are safe.
 */
function isAdjacentTextRisk(content: string): boolean {
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
