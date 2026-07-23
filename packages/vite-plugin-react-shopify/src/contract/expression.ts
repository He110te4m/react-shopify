declare const shopifyReferenceBrand: unique symbol;

export type SettingsScope = "section" | "block";
export type ShopifyContentKind = "text" | "html" | "object";
export type ShopifyLiteral = string | number | boolean | null;

export type ShopifyExpressionNode =
  | {
      readonly kind: "literal";
      readonly value: ShopifyLiteral;
      readonly numberFormat?: "float";
    }
  | { readonly kind: "path"; readonly segments: readonly string[] }
  | { readonly kind: "property"; readonly source: ShopifyExpressionNode; readonly name: string }
  | {
      readonly kind: "binary";
      readonly operator: "==" | "!=" | ">" | ">=" | "<" | "<=";
      readonly left: ShopifyExpressionNode;
      readonly right: ShopifyExpressionNode;
    }
  | {
      readonly kind: "logical";
      readonly operator: "and" | "or";
      readonly operands: readonly ShopifyExpressionNode[];
    }
  | {
      readonly kind: "filter";
      readonly source: ShopifyExpressionNode;
      readonly name: string;
      readonly args: readonly ShopifyExpressionNode[];
    }
  | { readonly kind: "keyword"; readonly value: "blank" | "empty" | "nil" }
  | { readonly kind: "unsafe"; readonly source: string };

/** Opaque typed expression consumed by the Shopify Liquid emitter. */
export type ShopifyReference<T = string, Content extends ShopifyContentKind = "text"> = {
  readonly kind: "shopify-reference";
  readonly node: ShopifyExpressionNode;
  readonly [shopifyReferenceBrand]: { value: T; content: Content };
  toString(): string;
  [Symbol.toPrimitive](): string;
};

export type ShopifyCondition = ShopifyReference<boolean>;
export type ShopifyOperand<T extends ShopifyLiteral = ShopifyLiteral> =
  | ShopifyReference<T, any>
  | T;

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function assertIdentifier(value: string, label: string): void {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a Shopify identifier, received ${JSON.stringify(value)}`);
  }
}

function freezeNode<Node extends ShopifyExpressionNode>(node: Node): Node {
  if (node.kind === "path") Object.freeze(node.segments);
  if (node.kind === "logical") Object.freeze(node.operands);
  if (node.kind === "filter") Object.freeze(node.args);
  return Object.freeze(node);
}

function reference<T, Content extends ShopifyContentKind = "text">(
  node: ShopifyExpressionNode,
): ShopifyReference<T, Content> {
  const frozenNode = freezeNode(node);
  return Object.freeze({
    kind: "shopify-reference" as const,
    node: frozenNode,
    toString: () => compileShopifyNode(frozenNode),
    [Symbol.toPrimitive]: () => compileShopifyNode(frozenNode),
  }) as ShopifyReference<T, Content>;
}

function literalNode(value: ShopifyLiteral, numberFormat?: "float"): ShopifyExpressionNode {
  return freezeNode({ kind: "literal", value, ...(numberFormat ? { numberFormat } : {}) });
}

function operandNode(
  value: ShopifyReference<unknown, any> | ShopifyLiteral,
): ShopifyExpressionNode {
  return isShopifyReference(value) ? value.node : literalNode(value);
}

function compileLiteral(value: ShopifyLiteral, numberFormat?: "float"): string {
  if (value === null) return "nil";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Liquid numeric literals must be finite`);
    if (numberFormat === "float" && Number.isInteger(value)) return `${value}.0`;
    return String(value);
  }
  if (numberFormat) {
    throw new TypeError("Liquid float literals require a numeric value");
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function assertComparisonOperand(node: ShopifyExpressionNode): void {
  if (node.kind === "binary" || node.kind === "logical") {
    throw new TypeError(
      "Liquid comparison operands cannot contain comparison or logical expressions",
    );
  }
}

function nestedLogicalError(parent: "and" | "or", child: "and" | "or"): TypeError {
  return new TypeError(
    `Liquid cannot nest ${child}() inside ${parent}(); parentheses are not supported`,
  );
}

export function compileShopifyNode(node: ShopifyExpressionNode): string {
  switch (node.kind) {
    case "literal":
      return compileLiteral(node.value, node.numberFormat);
    case "path":
      return node.segments.join(".");
    case "property":
      return `${compileShopifyNode(node.source)}.${node.name}`;
    case "binary":
      assertComparisonOperand(node.left);
      assertComparisonOperand(node.right);
      return `${compileShopifyNode(node.left)} ${node.operator} ${compileShopifyNode(node.right)}`;
    case "logical":
      return node.operands
        .map((operand) => {
          if (operand.kind === "logical" && operand.operator !== node.operator) {
            throw nestedLogicalError(node.operator, operand.operator);
          }
          return compileShopifyNode(operand);
        })
        .join(` ${node.operator} `);
    case "filter": {
      const args = node.args.length ? `: ${node.args.map(compileShopifyNode).join(", ")}` : "";
      return `${compileShopifyNode(node.source)} | ${node.name}${args}`;
    }
    case "keyword":
      return node.value;
    case "unsafe":
      return node.source;
  }
}

export function isShopifyReference(value: unknown): value is ShopifyReference<unknown, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "shopify-reference" &&
    typeof (value as { node?: unknown }).node === "object" &&
    (value as { node?: unknown }).node !== null
  );
}

/** The only supported boundary for emitting a typed expression as Liquid. */
export function compileShopifyReference(referenceValue: ShopifyReference<unknown, any>): string {
  return compileShopifyNode(referenceValue.node);
}

export function literal<T extends ShopifyLiteral>(value: T): ShopifyReference<T> {
  return reference(literalNode(value));
}

export function path<T = string, Content extends ShopifyContentKind = "text">(
  ...segments: readonly string[]
): ShopifyReference<T, Content> {
  if (segments.length === 0) throw new TypeError("Shopify path requires at least one segment");
  for (const segment of segments) assertIdentifier(segment, "Shopify path segment");
  return reference({ kind: "path", segments: [...segments] });
}

/** Build the canonical setting path for a contract. */
export function createSettingExpression<T = string, Content extends ShopifyContentKind = "text">(
  scope: SettingsScope,
  id: string,
): ShopifyReference<T, Content> {
  return path(scope, "settings", id);
}

/** Reference a property on the current section object, such as `id` or `index`. */
export function sectionValue<T = string>(propertyName: string): ShopifyReference<T> {
  return path("section", propertyName);
}

/** Reference a global theme setting without exposing a Liquid path. */
export function themeSetting<T = string>(id: string): ShopifyReference<T> {
  return path("settings", id);
}

/** Reference a nested property on a Shopify object. */
export function property<T = string, Content extends ShopifyContentKind = "text">(
  source: ShopifyReference<unknown, any>,
  propertyName: string,
): ShopifyReference<T, Content>;
export function property<T = string>(source: Record<string, unknown>, propertyName: string): T;
export function property<T = string, Content extends ShopifyContentKind = "text">(
  source: ShopifyReference<unknown, any> | Record<string, unknown>,
  propertyName: string,
): ShopifyReference<T, Content> | T {
  assertIdentifier(propertyName, "Shopify property name");
  if (!isShopifyReference(source)) return source[propertyName] as T;
  return reference({ kind: "property", source: source.node, name: propertyName });
}

function binary<T extends string | number | boolean>(
  operator: "==" | "!=" | ">" | ">=" | "<" | "<=",
  left: ShopifyReference<T, any>,
  right: ShopifyReference<T, any> | T,
): ShopifyCondition {
  const rightNode = operandNode(right);
  assertComparisonOperand(left.node);
  assertComparisonOperand(rightNode);
  return reference({
    kind: "binary",
    operator,
    left: left.node,
    right: rightNode,
  });
}

export function eq<T extends string | number | boolean>(
  left: ShopifyReference<T, any>,
  right: ShopifyReference<T, any> | T,
): ShopifyCondition {
  return binary("==", left, right);
}

export function neq<T extends string | number | boolean>(
  left: ShopifyReference<T, any>,
  right: ShopifyReference<T, any> | T,
): ShopifyCondition {
  return binary("!=", left, right);
}

export function gt<T extends string | number>(
  left: ShopifyReference<T, any>,
  right: ShopifyReference<T, any> | T,
): ShopifyCondition {
  return binary(">", left, right);
}

export function gte<T extends string | number>(
  left: ShopifyReference<T, any>,
  right: ShopifyReference<T, any> | T,
): ShopifyCondition {
  return binary(">=", left, right);
}

export function lt<T extends string | number>(
  left: ShopifyReference<T, any>,
  right: ShopifyReference<T, any> | T,
): ShopifyCondition {
  return binary("<", left, right);
}

export function lte<T extends string | number>(
  left: ShopifyReference<T, any>,
  right: ShopifyReference<T, any> | T,
): ShopifyCondition {
  return binary("<=", left, right);
}

const BLANK_NODE = freezeNode({ kind: "keyword", value: "blank" });

export function isBlank(value: ShopifyReference<unknown, any>): ShopifyCondition {
  return reference({ kind: "binary", operator: "==", left: value.node, right: BLANK_NODE });
}

export function isPresent(value: ShopifyReference<unknown, any>): ShopifyCondition {
  return reference({ kind: "binary", operator: "!=", left: value.node, right: BLANK_NODE });
}

export function isTruthy(value: ShopifyReference<boolean, any>): ShopifyCondition {
  return eq(value, true);
}

export function not(condition: ShopifyCondition): ShopifyCondition {
  const node = condition.node;
  if (node.kind === "binary") {
    const operator = {
      "==": "!=",
      "!=": "==",
      ">": "<=",
      ">=": "<",
      "<": ">=",
      "<=": ">",
    } as const;
    return reference({ ...node, operator: operator[node.operator] });
  }
  if (node.kind === "logical") {
    const operator = node.operator === "and" ? "or" : "and";
    return logical(
      operator,
      node.operands.map((operand) => not(reference<boolean>(operand))),
    );
  }
  return eq(condition, false);
}

function logical(
  operator: "and" | "or",
  conditions: readonly ShopifyCondition[],
): ShopifyCondition {
  if (conditions.length === 0) {
    throw new TypeError(`${operator}() requires at least one condition`);
  }
  if (conditions.length === 1) return conditions[0];
  const operands = conditions.flatMap((condition) => {
    const node = condition.node;
    if (node.kind !== "logical") return [node];
    if (node.operator !== operator) throw nestedLogicalError(operator, node.operator);
    return node.operands;
  });
  return reference({ kind: "logical", operator, operands });
}

export function and(...conditions: readonly ShopifyCondition[]): ShopifyCondition {
  return logical("and", conditions);
}

export function or(...conditions: readonly ShopifyCondition[]): ShopifyCondition {
  return logical("or", conditions);
}

export function filter<T = string, Content extends ShopifyContentKind = "text">(
  value: ShopifyReference<unknown, any> | ShopifyLiteral,
  name: string,
  ...args: readonly (ShopifyReference<unknown, any> | ShopifyLiteral)[]
): ShopifyReference<T, Content> {
  assertIdentifier(name, "Shopify filter name");
  return reference({
    kind: "filter",
    source: operandNode(value),
    name,
    args: args.map(operandNode),
  });
}

export function dividedBy(
  value: ShopifyReference<number, any> | number,
  divisor: ShopifyReference<number, any>,
): ShopifyReference<number>;
export function dividedBy(
  value: ShopifyReference<number, any> | number,
  divisor: number,
  options?: { readonly divisorFormat: "float" },
): ShopifyReference<number>;
export function dividedBy(
  value: ShopifyReference<number, any> | number,
  divisor: ShopifyReference<number, any> | number,
  options?: { readonly divisorFormat: "float" },
): ShopifyReference<number> {
  const divisorNode =
    options?.divisorFormat === "float"
      ? literalNode(divisor as number, "float")
      : operandNode(divisor);
  return reference({
    kind: "filter",
    source: operandNode(value),
    name: "divided_by",
    args: [divisorNode],
  });
}

export function multiply(
  value: ShopifyReference<number, any> | number,
  multiplier: ShopifyReference<number, any> | number,
): ShopifyReference<number> {
  return filter<number>(value, "times", multiplier);
}

export function round(
  value: ShopifyReference<number, any>,
  precision = 0,
): ShopifyReference<number> {
  return filter<number>(value, "round", precision);
}

export function append(
  value: ShopifyReference<string | number, any>,
  suffix: string,
): ShopifyReference<string> {
  return filter<string>(value, "append", suffix);
}

export function escape(value: ShopifyReference<string, any>): ShopifyReference<string> {
  return filter<string>(value, "escape");
}

export function placeholderSvg(name: string, className: string): ShopifyReference<string, "html"> {
  return filter<string, "html">(name, "placeholder_svg_tag", className);
}

/** Legacy escape hatch. New business code should use functional builders. */
export function unsafeShopifyReference<T = string, Content extends ShopifyContentKind = "text">(
  source: string,
): ShopifyReference<T, Content> {
  return reference({ kind: "unsafe", source });
}
