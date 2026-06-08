import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticBlock } from "../runtime/StaticBlock";
import { LiquidDataProvider } from "../runtime/provider";

const g = globalThis as any;

describe("StaticBlock — SSR path", () => {
  beforeEach(() => {
    g.document = undefined;
    g.__shopify_ssg_island_counter = { count: 0 };
    g.__shopify_ssg_liquid_track = new Set<string>();
    g.__shopify_ssg_tracked = new Map<string, any>();
  });

  afterEach(() => {
    delete g.document;
    delete g.__shopify_ssg_island_counter;
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_tracked;
  });

  it("renders content_for block expression", () => {
    const html = renderToStaticMarkup(
      createElement(StaticBlock, { type: "react-hero-banner", id: "hero-1" }),
    );

    expect(html).toContain("<shopify-static-block");
    expect(html).toContain('data-ssg-i="i0"');
    expect(html).toContain('{% content_for "block", type: "react-hero-banner", id: "hero-1" %}');
  });

  it("serializes literal and liquid data", () => {
    const html = renderToStaticMarkup(
      createElement(StaticBlock, {
        type: "react-hero-banner",
        id: "hero-1",
        data: {
          label: "Hero \"A\"",
          count: 2,
          enabled: true,
          accent: { liquid: "section.settings.accent_color" },
        },
      }),
    );

    expect(html).toContain('label: "Hero \\"A\\""');
    expect(html).toContain("count: 2");
    expect(html).toContain("enabled: true");
    expect(html).toContain("accent: section.settings.accent_color");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.accent_color")).toBe(true);
  });

  it("rejects invalid data keys", () => {
    expect(() => renderToStaticMarkup(
      createElement(StaticBlock, {
        type: "x",
        id: "y",
        data: { "bad-key": "no" },
      }),
    )).toThrow("Invalid StaticBlock data key");
  });
});

describe("StaticBlock — client path", () => {
  beforeEach(() => {
    g.document = {};
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders captured static block DOM", () => {
    const html = renderToStaticMarkup(
      createElement(
        LiquidDataProvider,
        {
          value: {
            __ssg_islands: { i0: '<div data-ssg-component="hero-banner"></div>' },
            __ssg_island_counter: { count: 0 },
          },
        },
        createElement(StaticBlock, { type: "react-hero-banner", id: "hero-1" }),
      ),
    );

    expect(html).toContain('data-ssg-i="i0"');
    expect(html).toContain('<div data-ssg-component="hero-banner"></div>');
  });
});
