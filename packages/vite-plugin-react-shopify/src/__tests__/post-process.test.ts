import { describe, expect, it } from "vitest";
import { restoreLiquidTokens } from "../ssg/post-process";

describe("restoreLiquidTokens", () => {
  it("restores only registered Liquid tokens", () => {
    const tokens = new Map([["__VRS_LIQUID_TOKEN_0__", "{{ section.settings.title | escape }}"]]);
    const html = "<p>__VRS_LIQUID_TOKEN_0__ &amp; more</p>";

    expect(restoreLiquidTokens(html, tokens)).toBe(
      "<p>{{ section.settings.title | escape }} &amp; more</p>",
    );
  });

  it("preserves normal encoded markup and quotes", () => {
    const html = "&lt;script&gt;&quot;safe&quot;&lt;/script&gt;";
    expect(restoreLiquidTokens(html, new Map())).toBe(html);
  });
});
