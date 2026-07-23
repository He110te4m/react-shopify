/**
 * @file File-system scanner for discovering React component entries.
 *
 * Walks `frontend/{sections,blocks,templates,snippets}` directories with
 * fast-glob, building {@link SSGEntry} records that drive the SSG compilation
 * pipeline.
 */

import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";
import { parseSync } from "oxc-parser";
import { normalizePath } from "vite";
import type { ResolvedOptions } from "../core/options";
import type { SSGEntry } from "../types/ssg";
import type { ShopifyEntryType } from "../types/shopify";
import { MAX_NAME_LENGTH } from "../validate/rules";
import { logger } from "../core/logger";

const log = logger("ssg:scanner");
const SNIPPET_PROP_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const TYPE_BY_DIR: Record<string, ShopifyEntryType> = {
  templates: "template",
  sections: "section",
  blocks: "block",
  snippets: "snippet",
};

export function scanEntries(options: ResolvedOptions): SSGEntry[] {
  const sourceDir = path.resolve(options.themeRoot, options.sourceCodeDir);
  const entries: SSGEntry[] = [];

  for (const dir of options.ssg.directories) {
    const scanPath = normalizePath(path.join(sourceDir, dir, "**/*.{tsx,jsx}"));
    const files = glob.sync(scanPath, { onlyFiles: true });

    for (const filePath of files) {
      const absPath = path.resolve(filePath);
      const relativePath = normalizePath(path.relative(sourceDir, absPath));
      const relativeEntryPath = normalizePath(
        path.relative(path.join(sourceDir, dir), absPath),
      ).replace(/\.[^.]+$/, "");
      const fileName = path.basename(filePath, path.extname(filePath));
      const componentName = fileName;
      const pathSegments = relativeEntryPath.split("/").map(toKebabCase);
      const kebabName = pathSegments.join("-");
      const targetType: ShopifyEntryType = TYPE_BY_DIR[dir] ?? "section";
      const id = `${targetType}-${pathSegments.join("--")}`;
      const runtime = extractEntryRuntime(absPath);
      const snippetProps = targetType === "snippet" ? extractSnippetProps(absPath) : [];
      const meta: SSGEntry["meta"] = { name: deriveName(fileName) };

      if (targetType === "section") {
        const blockTypes = extractBlockTypes(absPath);
        if (blockTypes.length > 0) {
          (meta as any)._blockTypes = blockTypes;
          log.debug("%s declares blocks: %s", kebabName, blockTypes.join(", "));
        }
      }

      entries.push({
        id,
        filePath: absPath,
        relativePath,
        componentName,
        kebabName,
        targetType,
        runtime,
        snippetProps,
        meta,
      });
    }
  }

  return entries;
}

function extractSnippetProps(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf-8");
  let program: any;
  try {
    const result = parseSync(filePath, source);
    if (result.errors.length > 0) {
      const details = result.errors.map((error) => error.message).join("; ");
      throw new Error(`OXC parse failed: ${details}`);
    }
    program = result.program;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw snippetPropsError(filePath, message);
  }

  const declarations = new Map<string, any>();
  let defaultExport: any;

  const collectDeclaration = (declaration: any): void => {
    if (declaration?.type === "FunctionDeclaration" && declaration.id?.name) {
      declarations.set(declaration.id.name, declaration);
      return;
    }
    if (declaration?.type !== "VariableDeclaration") return;
    for (const item of declaration.declarations) {
      if (item.id?.type === "Identifier" && item.init) {
        declarations.set(item.id.name, unwrapExpression(item.init));
      }
    }
  };

  for (const statement of program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      if (defaultExport) throw snippetPropsError(filePath, "multiple default exports found");
      defaultExport = unwrapExpression(statement.declaration);
    } else if (statement.type === "ExportNamedDeclaration") {
      collectDeclaration(statement.declaration);
    } else {
      collectDeclaration(statement);
    }
  }

  if (!defaultExport) throw snippetPropsError(filePath, "a default component export is required");
  if (defaultExport.type === "Identifier") {
    const resolved = declarations.get(defaultExport.name);
    if (!resolved) {
      throw snippetPropsError(
        filePath,
        `default export identifier ${defaultExport.name} does not resolve to a local function`,
      );
    }
    defaultExport = unwrapExpression(resolved);
  }

  if (
    defaultExport.type !== "FunctionDeclaration" &&
    defaultExport.type !== "FunctionExpression" &&
    defaultExport.type !== "ArrowFunctionExpression"
  ) {
    throw snippetPropsError(filePath, "the default export must be a function or arrow component");
  }

  if (defaultExport.params.length === 0) return [];
  if (defaultExport.params.length !== 1 || defaultExport.params[0].type !== "ObjectPattern") {
    throw snippetPropsError(
      filePath,
      "the default component must have exactly one object-destructured props parameter",
    );
  }

  const props: string[] = [];
  for (const property of defaultExport.params[0].properties) {
    if (property.type === "RestElement") {
      throw snippetPropsError(filePath, "rest properties are not supported");
    }
    if (property.computed || property.key?.type !== "Identifier") {
      throw snippetPropsError(filePath, "computed or non-identifier prop names are not supported");
    }

    const name = property.key.name;
    if (!SNIPPET_PROP_PATTERN.test(name)) {
      throw snippetPropsError(
        filePath,
        `prop ${JSON.stringify(name)} is not a valid Liquid argument name`,
      );
    }
    if (name === "children") {
      throw snippetPropsError(filePath, "children is not supported across the Liquid boundary");
    }

    const value = property.value;
    const binding = value?.type === "AssignmentPattern" ? value.left : value;
    if (binding?.type !== "Identifier") {
      throw snippetPropsError(filePath, `nested destructuring is not supported for prop ${name}`);
    }
    props.push(name);
  }

  return props;
}

function unwrapExpression(node: any): any {
  while (
    node &&
    [
      "ParenthesizedExpression",
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSTypeAssertion",
      "TSNonNullExpression",
    ].includes(node.type)
  ) {
    node = node.expression;
  }
  return node;
}

function snippetPropsError(filePath: string, reason: string): Error {
  return new Error(`Unable to analyze snippet props in ${filePath}: ${reason}`);
}

function extractEntryRuntime(filePath: string): SSGEntry["runtime"] {
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const match = source.match(
      /(?:export\s+)?const\s+shopifyEntry\s*=\s*\{[\s\S]*?\bruntime\s*:\s*["'](auto|static|hydrate|client)["']/,
    );
    return (match?.[1] as SSGEntry["runtime"] | undefined) ?? "auto";
  } catch {
    return "auto";
  }
}

function extractBlockTypes(filePath: string): string[] {
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const types = new Set<string>();

    const m = source.match(/blocks\s*:\s*\[([\s\S]*?)\]/);
    if (m) {
      const re = /type\s*:\s*['"]([^'"]+)['"]/g;
      let item: RegExpExecArray | null;
      while ((item = re.exec(m[1])) !== null) {
        if (!item[1].startsWith("@")) types.add(item[1]);
      }
    }

    const staticBlockRe = /<StaticBlock\b[\s\S]*?\btype\s*=\s*['"]([^'"]+)['"][\s\S]*?>/g;
    let staticItem: RegExpExecArray | null;
    while ((staticItem = staticBlockRe.exec(source)) !== null) {
      types.add(staticItem[1]);
    }

    return [...types];
  } catch {
    return [];
  }
}

/** Convert PascalCase / camelCase to kebab-case. */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Derive a human-readable display name from a filename.
 *
 * Converts `ProductPrice` → `Product Price`, `my-section` → `my section`.
 * Truncated to 25 characters (Shopify's limit).
 */
export function deriveName(fileName: string): string {
  const readable = fileName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return readable.length > MAX_NAME_LENGTH ? readable.slice(0, MAX_NAME_LENGTH) : readable;
}
