import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  and,
  append,
  compileShopifyReference,
  createSettingExpression,
  dividedBy,
  eq,
  isShopifyReference,
  isPresent,
  literal,
  multiply,
  not,
  or,
  property,
  round,
} from "../contract/expression";
import { when } from "../runtime/LiquidIf";
import { each } from "../runtime/LiquidEach";
import { ShopifyOutput } from "../runtime/ShopifyOutput";
import { LiquidDataProvider } from "../runtime/provider";
import { restoreLiquidTokens } from "../ssg/post-process";

const globalState = globalThis as any;

describe("Shopify expression contract", () => {
  it("builds typed comparisons without exposing Liquid syntax to callers", () => {
    const behavior = createSettingExpression<string>("section", "image_behavior");
    const image = createSettingExpression<unknown, "object">("section", "image");
    const condition = and(eq(behavior, "ambient"), isPresent(image));

    expect(compileShopifyReference(condition)).toBe(
      "section.settings.image_behavior == 'ambient' and section.settings.image != blank",
    );
  });

  it("composes property and numeric filter expressions", () => {
    const image = createSettingExpression<unknown, "object">("section", "image");
    const width = property<number>(image, "width");
    const ratio = property<number>(image, "aspect_ratio");
    const percentage = append(round(multiply(dividedBy(width, ratio), 100)), "%");

    expect(compileShopifyReference(percentage)).toBe(
      "section.settings.image.width | divided_by: section.settings.image.aspect_ratio | times: 100 | round: 0 | append: '%'",
    );
  });

  it("preserves an explicitly requested floating-point divisor literal", () => {
    const opacity = createSettingExpression<number>("section", "image_overlay_opacity");

    expect(compileShopifyReference(dividedBy(opacity, 100))).toBe(
      "section.settings.image_overlay_opacity | divided_by: 100",
    );
    expect(compileShopifyReference(dividedBy(opacity, 100, { divisorFormat: "float" }))).toBe(
      "section.settings.image_overlay_opacity | divided_by: 100.0",
    );
  });

  it("normalizes negation without emitting chained comparisons", () => {
    const behavior = createSettingExpression<string>("section", "image_behavior");
    const image = createSettingExpression<unknown, "object">("section", "image");

    expect(compileShopifyReference(not(eq(behavior, "ambient")))).toBe(
      "section.settings.image_behavior != 'ambient'",
    );
    expect(compileShopifyReference(not(and(eq(behavior, "ambient"), isPresent(image))))).toBe(
      "section.settings.image_behavior != 'ambient' or section.settings.image == blank",
    );
  });

  it("rejects mixed logical nesting that Liquid cannot parenthesize", () => {
    const behavior = createSettingExpression<string>("section", "image_behavior");
    const ambient = eq(behavior, "ambient");
    const fixed = eq(behavior, "fixed");
    const zoom = eq(behavior, "zoom-in");

    expect(() => and(or(ambient, fixed), zoom)).toThrowError(
      "Liquid cannot nest or() inside and(); parentheses are not supported",
    );
    expect(() => or(and(ambient, fixed), zoom)).toThrowError(
      "Liquid cannot nest and() inside or(); parentheses are not supported",
    );
    expect(compileShopifyReference(and(and(ambient, fixed), zoom))).toBe(
      "section.settings.image_behavior == 'ambient' and section.settings.image_behavior == 'fixed' and section.settings.image_behavior == 'zoom-in'",
    );
  });

  it("keeps literals and paths as distinct immutable IR nodes", () => {
    const text = literal("section.settings.title");
    const setting = createSettingExpression("section", "title");

    expect(text.node).toEqual({ kind: "literal", value: "section.settings.title" });
    expect(setting.node).toEqual({
      kind: "path",
      segments: ["section", "settings", "title"],
    });
    expect(text).not.toHaveProperty("expression");
    expect(Object.isFrozen(setting.node)).toBe(true);
    expect(compileShopifyReference(text)).toBe("'section.settings.title'");
    expect(compileShopifyReference(setting)).toBe("section.settings.title");
  });
});

describe("when", () => {
  beforeEach(() => {
    delete globalState.document;
    globalState.__shopify_ssg_liquid_track = new Set<string>();
    globalState.__shopify_ssg_tracked = new Map<string, any>();
    globalState.__shopify_ssg_liquid_tokens = new Map<string, string>();
    globalState.__shopify_ssg_liquid_token_prefix = "__TEST_LIQUID";
  });

  afterEach(() => {
    delete globalState.document;
    delete globalState.__shopify_ssg_liquid_track;
    delete globalState.__shopify_ssg_tracked;
    delete globalState.__shopify_ssg_liquid_tokens;
    delete globalState.__shopify_ssg_liquid_token_prefix;
  });

  it("registers a boolean bridge and serializes an SSG conditional", () => {
    const condition = isPresent(createSettingExpression("section", "title"));
    const html = renderToStaticMarkup(when(condition, createElement("strong", null, "Title")));
    const tracked = globalState.__shopify_ssg_tracked as Map<string, any>;

    expect(html).toContain("__TEST_LIQUID");
    expect([...tracked.values()]).toEqual([
      {
        type: "boolean",
        bridge: "{% if section.settings.title != blank %}true{% else %}false{% endif %}",
        expression: "condition:if:section.settings.title != blank",
      },
    ]);
  });

  it("selects the client branch from bridge data", () => {
    globalState.document = {};
    const condition = isPresent(createSettingExpression("section", "title"));
    const key = "condition:if:section.settings.title != blank";

    const truthy = renderToStaticMarkup(
      createElement(
        LiquidDataProvider,
        { value: { [key]: true } },
        when(condition, createElement("strong", null, "Yes"), createElement("span", null, "No")),
      ),
    );
    const fallback = renderToStaticMarkup(
      createElement(
        LiquidDataProvider,
        { value: { [key]: false } },
        when(condition, createElement("strong", null, "Yes"), createElement("span", null, "No")),
      ),
    );

    expect(truthy).toBe("<strong>Yes</strong>");
    expect(fallback).toBe("<span>No</span>");
  });
});

describe("each", () => {
  beforeEach(() => {
    delete globalState.document;
    globalState.__shopify_ssg_liquid_track = new Set<string>();
    globalState.__shopify_ssg_tracked = new Map<string, any>();
    globalState.__shopify_ssg_liquid_tokens = new Map<string, string>();
    globalState.__shopify_ssg_liquid_token_prefix = "__TEST_EACH";
  });

  afterEach(() => {
    delete globalState.document;
    delete globalState.__shopify_ssg_liquid_track;
    delete globalState.__shopify_ssg_tracked;
    delete globalState.__shopify_ssg_liquid_tokens;
    delete globalState.__shopify_ssg_liquid_token_prefix;
  });

  it("emits a Liquid loop and renders browser collection values", () => {
    const products = createSettingExpression<readonly { title: string }[], "object">(
      "section",
      "products",
    );
    const ssgHtml = renderToStaticMarkup(
      each(products, (product, index) => {
        const title = isShopifyReference(product)
          ? property<string>(product, "title")
          : product.title;
        return createElement(
          "span",
          null,
          createElement(ShopifyOutput, { value: index }),
          ":",
          createElement(ShopifyOutput, { value: title }),
        );
      }),
    );
    const restored = restoreLiquidTokens(
      ssgHtml,
      globalState.__shopify_ssg_liquid_tokens as Map<string, string>,
    );
    expect(restored).toMatch(/\{% for shopify_item_\d+ in section\.settings\.products %\}/);
    expect(restored).toMatch(
      /<span>\{\{ forloop\.index0 \}\}:\{\{ shopify_item_\d+\.title \}\}<\/span>/,
    );

    globalState.document = {};
    const clientHtml = renderToStaticMarkup(
      createElement(
        LiquidDataProvider,
        { value: { "collection:section.settings.products": [{ title: "One" }] } },
        each(products, (product, index) => {
          const title = isShopifyReference(product)
            ? property<string>(product, "title")
            : product.title;
          return createElement(
            "span",
            null,
            createElement(ShopifyOutput, { value: index }),
            ":",
            createElement(ShopifyOutput, { value: title }),
          );
        }),
      ),
    );
    expect(clientHtml).toBe("<span>0:One</span>");
  });
});
