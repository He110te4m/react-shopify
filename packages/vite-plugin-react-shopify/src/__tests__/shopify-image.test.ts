import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ShopifyImage } from "../runtime/ShopifyImage";

const g = globalThis as any;

describe("ShopifyImage", () => {
  beforeEach(() => {
    g.document = undefined;
    g.__shopify_ssg_island_counter = { count: 0 };
    g.__shopify_ssg_tracked = new Map();
    g.__shopify_ssg_liquid_track = new Set();
    g.__shopify_ssg_liquid_blocks = [];
  });

  afterEach(() => {
    delete g.document;
    delete g.__shopify_ssg_island_counter;
    delete g.__shopify_ssg_tracked;
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_liquid_blocks;
  });

  it("derives image_url width from widths when width is omitted", () => {
    const html = renderToStaticMarkup(createElement(ShopifyImage, {
      image: "section.settings.image",
      widths: "375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840",
      sizes: "100vw",
      fetchPriority: "auto",
    }));

    expect(html).toContain("{{ section.settings.image | image_url: width: 3840 | image_tag:");
    expect(html).toContain("widths: '375, 550, 750, 1100, 1500, 1780, 2000, 3000, 3840'");
  });

  it("keeps explicit image_url width before widths inference", () => {
    const html = renderToStaticMarkup(createElement(ShopifyImage, {
      image: "section.settings.image",
      width: 1200,
      widths: "400, 800, 1600",
      fetchPriority: "auto",
    }));

    expect(html).toContain("{{ section.settings.image | image_url: width: 1200 | image_tag:");
  });
});
