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

const INTERACTIVE_RUNTIME_CALLS = new Set(["ClientOnly", "clientOnly"]);

const STATIC_REACT_HOOKS = new Set(["useCallback", "useMemo"]);

const BROWSER_GLOBALS = new Set([
  "document",
  "history",
  "localStorage",
  "location",
  "navigator",
  "sessionStorage",
  "window",
]);

const BROWSER_GLOBAL_CALLS = new Set([
  "alert",
  "cancelAnimationFrame",
  "confirm",
  "getComputedStyle",
  "matchMedia",
  "prompt",
  "requestAnimationFrame",
]);

const BROWSER_GLOBAL_CONSTRUCTORS = new Set([
  "BroadcastChannel",
  "EventSource",
  "IntersectionObserver",
  "MutationObserver",
  "ResizeObserver",
  "WebSocket",
  "Worker",
]);

const EVENT_HANDLER_RE = /^on[A-Z]/;
const HOOK_RE = /^use(?:[A-Z0-9]|$)/;

const cache = new Map<string, { source: string; interactive: boolean }>();

function checkSource(source: string, filePath: string): boolean {
  const cached = cache.get(filePath);
  if (cached?.source === source) return cached.interactive;

  let found = false;
  const externalComponents = new Set<string>();
  const reactNamespaces = new Set<string>();
  const reactHooks = new Map<string, string>();
  const runtimeHooks = new Map<string, string>();
  const settingsFactories = new Set<string>();
  const settingsContracts = new Set<string>();
  const interactiveAliases = new Set<string>();
  cache.set(filePath, { source, interactive: false });

  try {
    const parseResult = parseSync(filePath, source);
    if (parseResult.errors.length > 0) {
      found = true;
    }
    walk(parseResult.program, {
      enter(node: any) {
        if (found) return;
        if (node.type === "ImportDeclaration" && node.source?.value) {
          const importPath = node.source.value as string;
          if (importPath === "react") {
            for (const specifier of node.specifiers ?? []) {
              if (
                (specifier.type === "ImportDefaultSpecifier" ||
                  specifier.type === "ImportNamespaceSpecifier") &&
                specifier.local?.name
              ) {
                reactNamespaces.add(specifier.local.name);
              } else if (
                specifier.type === "ImportSpecifier" &&
                specifier.importKind !== "type" &&
                specifier.local?.name &&
                specifier.imported?.name
              ) {
                reactHooks.set(specifier.local.name, specifier.imported.name);
              }
            }
          }
          if (importPath.startsWith("vite-plugin-react-shopify/")) {
            for (const specifier of node.specifiers ?? []) {
              if (
                specifier.type === "ImportSpecifier" &&
                specifier.importKind !== "type" &&
                specifier.local?.name &&
                specifier.imported?.name === "defineSettings"
              ) {
                settingsFactories.add(specifier.local.name);
              }
              if (
                specifier.type === "ImportSpecifier" &&
                specifier.importKind !== "type" &&
                specifier.local?.name &&
                HOOK_RE.test(specifier.imported?.name)
              ) {
                runtimeHooks.set(specifier.local.name, specifier.imported.name);
              }
            }
          }
          const trusted =
            importPath === "react" || importPath.startsWith("vite-plugin-react-shopify/");
          if (
            !trusted &&
            !importPath.startsWith(".") &&
            !importPath.startsWith("~/") &&
            !importPath.startsWith("@/")
          ) {
            for (const specifier of node.specifiers ?? []) {
              if (specifier.importKind !== "type" && specifier.local?.name) {
                externalComponents.add(specifier.local.name);
              }
            }
          }
        }
        if (node.type === "VariableDeclarator" && node.id?.type === "Identifier") {
          const alias = node.id.name as string;
          const init = node.init;
          if (
            init?.type === "CallExpression" &&
            init.callee?.type === "Identifier" &&
            settingsFactories.has(init.callee.name)
          ) {
            settingsContracts.add(alias);
          }
          const aliasedReactHook =
            init?.type === "Identifier" ? reactHooks.get(init.name) : undefined;
          const aliasedRuntimeHook =
            init?.type === "Identifier" ? runtimeHooks.get(init.name) : undefined;
          if (
            init?.type === "Identifier" &&
            (interactiveAliases.has(init.name) ||
              INTERACTIVE_HOOKS.has(aliasedReactHook ?? "") ||
              (HOOK_RE.test(aliasedReactHook ?? init.name) &&
                aliasedRuntimeHook === undefined &&
                !STATIC_REACT_HOOKS.has(aliasedReactHook ?? "")))
          ) {
            interactiveAliases.add(alias);
          }
          if (
            init?.type === "MemberExpression" &&
            init.object?.type === "Identifier" &&
            reactNamespaces.has(init.object.name) &&
            init.property?.type === "Identifier" &&
            INTERACTIVE_HOOKS.has(init.property.name)
          ) {
            interactiveAliases.add(alias);
          }
        }
        if (node.type === "ImportExpression") {
          found = true;
          return;
        }
        if (node.type === "CallExpression" && node.callee?.type === "Identifier") {
          const name = node.callee.name as string;
          const reactHook = reactHooks.get(name);
          const runtimeHook = runtimeHooks.get(name);
          if (
            INTERACTIVE_HOOKS.has(reactHook ?? name) ||
            INTERACTIVE_RUNTIME_CALLS.has(name) ||
            interactiveAliases.has(name) ||
            BROWSER_GLOBAL_CALLS.has(name) ||
            (HOOK_RE.test(reactHook ?? runtimeHook ?? name) &&
              runtimeHook === undefined &&
              !STATIC_REACT_HOOKS.has(reactHook ?? ""))
          ) {
            found = true;
            return;
          }
        }
        if (
          node.type === "CallExpression" &&
          node.callee?.type === "MemberExpression" &&
          node.callee.object?.type !== "Super" &&
          node.callee.property?.type === "Identifier" &&
          HOOK_RE.test(node.callee.property.name) &&
          !(
            node.callee.property.name === "useProps" &&
            node.callee.object?.type === "Identifier" &&
            settingsContracts.has(node.callee.object.name)
          ) &&
          !(
            node.callee.object?.type === "Identifier" &&
            reactNamespaces.has(node.callee.object.name) &&
            STATIC_REACT_HOOKS.has(node.callee.property.name)
          )
        ) {
          found = true;
          return;
        }
        if (
          node.type === "NewExpression" &&
          node.callee?.type === "Identifier" &&
          BROWSER_GLOBAL_CONSTRUCTORS.has(node.callee.name)
        ) {
          found = true;
          return;
        }
        if (
          node.type === "MemberExpression" &&
          node.object?.type === "Identifier" &&
          BROWSER_GLOBALS.has(node.object.name)
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
          const rootName =
            name?.type === "JSXIdentifier"
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
          (EVENT_HANDLER_RE.test(node.name.name) || node.name.name === "ref")
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
          if (
            node.importKind === "type" ||
            /\.(css|scss|sass|less|json|svg|png|jpe?g|webp|avif)$/.test(importPath)
          )
            return;
          if (
            !importPath.startsWith(".") &&
            !importPath.startsWith("~/") &&
            !importPath.startsWith("@/")
          )
            return;
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

function resolveImport(importPath: string, fromFile: string): string | null {
  const dir = path.dirname(fromFile);
  const frontendMarker = `${path.sep}frontend${path.sep}`;
  const frontendIndex = fromFile.lastIndexOf(frontendMarker);
  const sourceRoot =
    frontendIndex >= 0 ? fromFile.slice(0, frontendIndex + frontendMarker.length - 1) : dir;
  const resolved =
    importPath.startsWith("~/") || importPath.startsWith("@/")
      ? path.resolve(sourceRoot, importPath.slice(2))
      : path.resolve(dir, importPath);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  const extensions = [
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    "/index.tsx",
    "/index.ts",
    "/index.jsx",
    "/index.js",
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
export function isStaticComponent(source: string, filePath: string): boolean {
  const interactive = checkSource(source, filePath);
  if (!interactive) {
    log.debug("static: %s", filePath);
  }
  return !interactive;
}
