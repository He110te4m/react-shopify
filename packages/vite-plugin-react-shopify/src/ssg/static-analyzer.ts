import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../core/logger";

const log = logger("ssg:static");

const INTERACTIVE_HOOKS = new Set([
  "useState",
  "useReducer",
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useSyncExternalStore",
  "useTransition",
  "useDeferredValue",
  "useActionState",
  "useOptimistic",
]);

const INTERACTIVE_RUNTIME_CALLS = new Set([
  "ClientOnly",
  "clientOnly",
]);

const EVENT_HANDLER_RE = /^on[A-Z]/;

const cache = new Map<string, { source: string; interactive: boolean }>();

function checkSource(source: string, filePath: string): boolean {
  const cached = cache.get(filePath);
  if (cached?.source === source) return cached.interactive;

  let found = false;
  const externalComponents = new Set<string>();
  cache.set(filePath, { source, interactive: false });

  try {
    const parseResult = parseSync(filePath, source);
    walk(parseResult.program, {
      enter(node: any) {
        if (found) return;
        if (node.type === "ImportDeclaration" && node.source?.value) {
          const importPath = node.source.value as string;
          const trusted = importPath === "react" || importPath.startsWith("vite-plugin-react-shopify/");
          if (!trusted && !importPath.startsWith(".") && !importPath.startsWith("~/") && !importPath.startsWith("@/")) {
            for (const specifier of node.specifiers ?? []) {
              if (specifier.importKind !== "type" && specifier.local?.name) {
                externalComponents.add(specifier.local.name);
              }
            }
          }
        }
        if (
          node.type === "CallExpression" &&
          node.callee?.type === "Identifier" &&
          (INTERACTIVE_HOOKS.has(node.callee.name) || INTERACTIVE_RUNTIME_CALLS.has(node.callee.name))
        ) {
          found = true;
          return;
        }
        if (
          node.type === "JSXElement" &&
          node.openingElement?.name?.type === "JSXIdentifier" &&
          INTERACTIVE_RUNTIME_CALLS.has(node.openingElement.name.name)
        ) {
          found = true;
          return;
        }
        if (node.type === "JSXElement") {
          const name = node.openingElement?.name;
          const rootName = name?.type === "JSXIdentifier"
            ? name.name
            : name?.type === "JSXMemberExpression" && name.object?.type === "JSXIdentifier"
              ? name.object.name
              : undefined;
          if (rootName && externalComponents.has(rootName)) {
            found = true;
            return;
          }
        }
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
    found = true;
  }

  cache.set(filePath, { source, interactive: found });

  if (found) return true;

  // Follow local imports recursively
  try {
    walk(parseSync(filePath, source).program, {
      enter(node: any) {
        if (found) return;
        if (node.type === "ImportDeclaration" && node.source?.value) {
          const importPath = node.source.value as string;
          if (node.importKind === "type" || /\.(css|scss|sass|less|json|svg|png|jpe?g|webp|avif)$/.test(importPath)) return;
          if (!importPath.startsWith(".") && !importPath.startsWith("~/") && !importPath.startsWith("@/")) return;
          const resolved = resolveImport(importPath, filePath);
          if (resolved) {
            try {
              const importSource = fs.readFileSync(resolved, "utf-8");
              if (checkSource(importSource, resolved)) {
                found = true;
              }
            } catch {
              found = true;
            }
          } else {
            found = true;
          }
        }
      },
    });
  } catch {
    found = true;
  }

  cache.set(filePath, { source, interactive: found });
  return found;
}

function resolveImport(
  importPath: string,
  fromFile: string,
): string | null {
  const dir = path.dirname(fromFile);
  const frontendMarker = `${path.sep}frontend${path.sep}`;
  const frontendIndex = fromFile.lastIndexOf(frontendMarker);
  const sourceRoot = frontendIndex >= 0
    ? fromFile.slice(0, frontendIndex + frontendMarker.length - 1)
    : dir;
  const resolved = importPath.startsWith("~/") || importPath.startsWith("@/")
    ? path.resolve(sourceRoot, importPath.slice(2))
    : path.resolve(dir, importPath);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
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

export function clearStaticAnalysisCache(): void {
  cache.clear();
}

/**
 * Determines if a component is static (no React interaction hooks,
 * no JSX event handlers, and no interactive imports).
 */
export function isStaticComponent(
  source: string,
  filePath: string,
): boolean {
  const interactive = checkSource(source, filePath);
  if (!interactive) {
    log.debug("static: %s", filePath);
  }
  return !interactive;
}
