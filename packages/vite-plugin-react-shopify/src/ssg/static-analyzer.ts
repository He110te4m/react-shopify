import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";
import fs from "node:fs";
import path from "node:path";

const INTERACTIVE_HOOKS = new Set([
  "useState",
  "useReducer",
  "useRef",
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useCallback",
  "useMemo",
]);

const EVENT_HANDLER_RE = /^on[A-Z]/;

// Cache: filePath -> isInteractive
const cache = new Map<string, boolean>();

function checkSource(source: string, filePath: string): boolean {
  const cached = cache.get(filePath);
  if (cached !== undefined) return cached;

  let found = false;

  try {
    const parseResult = parseSync(filePath, source);
    walk(parseResult.program, {
      enter(node: any) {
        if (found) return;
        // Detect React hooks (useState, useEffect, etc.)
        if (
          node.type === "CallExpression" &&
          node.callee?.type === "Identifier" &&
          INTERACTIVE_HOOKS.has(node.callee.name)
        ) {
          found = true;
          return;
        }
        // Detect JSX event handlers (onClick, onChange, etc.)
        if (
          node.type === "JSXAttribute" &&
          node.name?.type === "JSXIdentifier" &&
          EVENT_HANDLER_RE.test(node.name.name)
        ) {
          found = true;
        }
      },
    });
  } catch {
    // Parse error — assume interactive to be safe
    found = true;
  }

  cache.set(filePath, found);

  if (found) return true;

  // Follow local imports recursively
  try {
    walk(parseSync(filePath, source).program, {
      enter(node: any) {
        if (found) return;
        if (node.type === "ImportDeclaration" && node.source?.value) {
          const importPath = node.source.value as string;
          if (!importPath.startsWith(".")) return;
          const resolved = resolveImport(importPath, filePath);
          if (resolved) {
            try {
              const importSource = fs.readFileSync(resolved, "utf-8");
              if (checkSource(importSource, resolved)) {
                found = true;
              }
            } catch {
              // Can't read — assume interactive to be safe
              found = true;
            }
          }
        }
      },
    });
  } catch {
    found = true;
  }

  if (found) cache.set(filePath, true);
  return found;
}

function resolveImport(
  importPath: string,
  fromFile: string,
): string | null {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, importPath);
  const extensions = [
    ".tsx", ".ts", ".jsx", ".js",
    "/index.tsx", "/index.ts", "/index.jsx", "/index.js",
  ];
  for (const ext of extensions) {
    const full = resolved + ext;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  return null;
}

/**
 * Determines if a component is static (no React interaction hooks,
 * no JSX event handlers, and no interactive imports).
 */
export function isStaticComponent(
  source: string,
  filePath: string,
): boolean {
  return !checkSource(source, filePath);
}
