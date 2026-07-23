import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSettingExpression, escape } from "../contract/expression";
import { createSnippetProxy } from "../runtime/Snippet";
import { useShopifyValue } from "../runtime/useLiquid";
import { restoreLiquidTokens } from "../ssg/post-process";

const globalState = globalThis as any;

describe("snippet SSG proxy", () => {
  beforeEach(() => {
    delete globalState.document;
    globalState.__shopify_ssg_runtime = "static";
    globalState.__shopify_ssg_liquid_tokens = new Map<string, string>();
    globalState.__shopify_ssg_liquid_token_prefix = "__TEST_SNIPPET";
    globalState.__shopify_ssg_value_references = new Map();
  });

  afterEach(() => {
    delete globalState.__shopify_ssg_runtime;
    delete globalState.__shopify_ssg_liquid_tokens;
    delete globalState.__shopify_ssg_liquid_token_prefix;
    delete globalState.__shopify_ssg_value_references;
  });

  it("compiles React props into named Liquid arguments", () => {
    const Snippet = createSnippetProxy("react-button", ["label", "style"]);

    function Caller() {
      const label = useShopifyValue(escape(createSettingExpression("block", "label")));
      return createElement(Snippet, { label, style: "button--primary" });
    }

    const html = renderToStaticMarkup(createElement(Caller));
    const restored = restoreLiquidTokens(
      html,
      globalState.__shopify_ssg_liquid_tokens as Map<string, string>,
    );
    expect(restored).toMatch(
      /^\{%- assign (shopify_snippet_react_button_label_\d+) = block\.settings\.label \| escape -%\}\{% render 'react-button', label: \1, style: 'button--primary' %\}$/,
    );
  });

  it("rejects callbacks crossing the snippet boundary", () => {
    const Snippet = createSnippetProxy("react-button", ["onClick"]);
    expect(() =>
      renderToStaticMarkup(createElement(Snippet, { onClick: () => undefined })),
    ).toThrow(/cannot cross the Liquid boundary/);
  });
});
