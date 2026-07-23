import type { ComponentType } from "react";
import {
  compileShopifyReference,
  isShopifyReference,
  type ShopifyExpressionNode,
} from "../contract/expression";
import { resolveShopifyReference, useShopifyContext } from "./ShopifyContext";

const PROP_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function liquidString(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

let snippetValueId = 0;

function containsFilter(node: ShopifyExpressionNode): boolean {
  if (node.kind === "filter") return true;
  if (node.kind === "property") return containsFilter(node.source);
  if (node.kind === "binary") return containsFilter(node.left) || containsFilter(node.right);
  if (node.kind === "logical") return node.operands.some(containsFilter);
  return false;
}

function compileProp(
  snippetName: string,
  name: string,
  value: unknown,
): { setup?: string; value: string } {
  const reference = isShopifyReference(value) ? value : resolveShopifyReference(value);
  if (reference) {
    const compiled = compileShopifyReference(reference);
    if (containsFilter(reference.node)) {
      const variable = `shopify_snippet_${snippetName.replace(/[^A-Za-z0-9_]/g, "_")}_${name}_${snippetValueId++}`;
      return { setup: `{%- assign ${variable} = ${compiled} -%}`, value: variable };
    }
    return { value: compiled };
  }
  if (value === null || value === undefined) return { value: "nil" };
  if (typeof value === "string") return { value: liquidString(value) };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Snippet prop ${name} must be finite`);
    return { value: String(value) };
  }
  if (typeof value === "boolean") return { value: value ? "true" : "false" };
  throw new TypeError(
    `Snippet prop ${name} cannot cross the Liquid boundary; use a literal or Shopify reference`,
  );
}

/** Internal SSG proxy for imports that resolve into `frontend/snippets`. */
export function createSnippetProxy(
  snippetName: string,
  declaredProps: readonly string[],
): ComponentType<Record<string, unknown>> {
  const allowed = new Set(declaredProps);

  return function ShopifySnippetProxy(props) {
    const ctx = useShopifyContext();
    if (ctx.phase !== "ssg") {
      throw new Error("Snippet proxies may only execute during the SSG render pass");
    }

    const setup: string[] = [];
    const args: string[] = [];
    for (const [name, value] of Object.entries(props)) {
      if (name === "children") {
        if (value !== undefined && value !== null) {
          throw new TypeError(`Snippet ${snippetName} does not support children`);
        }
        continue;
      }
      if (!PROP_PATTERN.test(name)) throw new TypeError(`Invalid snippet prop name ${name}`);
      if (!allowed.has(name)) {
        throw new TypeError(`Snippet ${snippetName} does not declare prop ${name}`);
      }
      const compiled = compileProp(snippetName, name, value);
      if (compiled.setup) setup.push(compiled.setup);
      args.push(`${name}: ${compiled.value}`);
    }

    const suffix = args.length > 0 ? `, ${args.join(", ")}` : "";
    return ctx.serialize(`${setup.join("")}{% render '${snippetName}'${suffix} %}`);
  };
}
