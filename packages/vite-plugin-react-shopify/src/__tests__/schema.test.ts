import { describe, it, expect } from "vitest";
import { generateSchema } from "../ssg/schema";
import type { ShopifyMeta } from "../types";

const base: ShopifyMeta = { name: "Test" };

describe("generateSchema — section blocks array", () => {
  /** Extract the value of the top-level `"blocks": [...]` field. */
  function extractBlocksArray(schema: string): string {
    const match = schema.match(/"blocks":\s*(\[[\s\S]*?\])(?=\s*[,\n}])/);
    expect(match).not.toBeNull();
    return match![1];
  }

  it("emits only `type` for theme block filename references", () => {
    const out = generateSchema({
      ...base,
      blocks: [{ type: "react-color-block" }, { type: "react-text-block" }],
    });
    const blocksJson = extractBlocksArray(out);
    expect(blocksJson).toContain('"type": "react-color-block"');
    expect(blocksJson).toContain('"type": "react-text-block"');
    expect(blocksJson).not.toContain('"name"');
  });

  it("emits only `type` for @theme and @app references", () => {
    const out = generateSchema({
      ...base,
      blocks: [{ type: "@theme" }, { type: "@app" }],
    });
    const blocksJson = extractBlocksArray(out);
    expect(blocksJson).toContain('"type": "@theme"');
    expect(blocksJson).toContain('"type": "@app"');
    expect(blocksJson).not.toContain('"name"');
  });

  it("emits explicit name/limit/settings for section blocks", () => {
    const out = generateSchema({
      ...base,
      blocks: [
        {
          type: "product",
          name: "Product",
          limit: 4,
          settings: [
            { type: "text", id: "title", label: "Title" },
          ],
        },
      ],
    });
    const blocksJson = extractBlocksArray(out);
    expect(blocksJson).toContain('"type": "product"');
    expect(blocksJson).toContain('"name": "Product"');
    expect(blocksJson).toContain('"limit": 4');
    expect(blocksJson).toContain('"settings"');
    expect(blocksJson).toContain('"id": "title"');
  });

  it("treats a bare type-only entry as a theme block reference (no name/limit/settings)", () => {
    const out = generateSchema({
      ...base,
      blocks: [{ type: "product" }],
    });
    const blocksJson = extractBlocksArray(out);
    expect(blocksJson).toContain('"type": "product"');
    expect(blocksJson).not.toContain('"name"');
    expect(blocksJson).not.toContain('"limit"');
    expect(blocksJson).not.toContain('"settings"');
  });

  it("promotes entry to section block as soon as any extra field is present", () => {
    const out = generateSchema({
      ...base,
      blocks: [
        { type: "a", limit: 1 },
        { type: "b", settings: [{ type: "text", id: "x", label: "X" }] },
      ],
    });
    const blocksJson = extractBlocksArray(out);
    expect(blocksJson).toContain('"type": "a"');
    expect(blocksJson).toContain('"limit": 1');
    expect(blocksJson).not.toContain('"name": "a"');
    expect(blocksJson).toContain('"type": "b"');
    expect(blocksJson).toContain('"settings"');
    expect(blocksJson).not.toContain('"name": "b"');
  });
});

describe("generateSchema — preset block serialization", () => {
  it("emits name, settings, and nested blocks for normal preset blocks", () => {
    const out = generateSchema({
      ...base,
      presets: [
        {
          name: "Hero",
          blocks: [
            { type: "slide", name: "Slide", settings: { title: "Hello" } },
            {
              type: "group",
              settings: { heading: "Group" },
              blocks: [{ type: "text", settings: { text: "Child" } }],
            },
          ],
        },
      ],
    });
    expect(out).toContain('"name": "Slide"');
    expect(out).toContain('"title": "Hello"');
    expect(out).toContain('"heading": "Group"');
    expect(out).toContain('"type": "text"');
    expect(out).toContain('"text": "Child"');
  });

  it("emits id and settings for static preset blocks", () => {
    const out = generateSchema({
      ...base,
      presets: [
        {
          name: "App",
          blocks: [
            {
              type: "_button",
              static: true,
              id: "btn-1",
              name: "Button",
              settings: { label: "Click" },
            },
          ],
        },
      ],
    });
    expect(out).toContain('"static": true');
    expect(out).toContain('"id": "btn-1"');
    expect(out).toContain('"name": "Button"');
    expect(out).toContain('"label": "Click"');
  });

  it("drops empty-string setting values to undefined", () => {
    const out = generateSchema({
      ...base,
      presets: [
        {
          name: "P",
          blocks: [{ type: "x", settings: { title: "", body: "ok" } }],
        },
      ],
    });
    const block = out.match(/"blocks":\s*\[\s*\{[^}]*"settings":\s*\{[^}]*\}/)![0];
    expect(block).toContain('"body": "ok"');
    expect(block).not.toContain('"title": ""');
  });
});

describe("generateSchema — section-level fields", () => {
  it("emits default and locales when present", () => {
    const out = generateSchema({
      ...base,
      default: {
        name: "Statically rendered",
        settings: { title: "Hi" },
        blocks: [{ type: "slide" }],
      },
      locales: {
        en: { title: "Hello" },
        fr: { title: "Bonjour" },
      },
    });
    expect(out).toContain('"default"');
    expect(out).toContain('"Statically rendered"');
    expect(out).toContain('"locales"');
    expect(out).toContain('"Bonjour"');
  });

  it("emits enabled_on / disabled_on as TemplateScope objects", () => {
    const out = generateSchema({
      ...base,
      enabled_on: { templates: ["index"], groups: ["footer"] },
      disabled_on: { templates: ["cart"] },
    });
    expect(out).toContain('"enabled_on": {');
    expect(out).toContain('"templates": [\n      "index"\n    ]');
    expect(out).toContain('"groups": [\n      "footer"\n    ]');
    expect(out).toContain('"disabled_on": {');
  });

  it("emits tag: null verbatim when explicitly set", () => {
    const out = generateSchema({ ...base, tag: null });
    expect(out).toContain('"tag": null');
  });

  it("omits tag key entirely when undefined (Shopify default <div>)", () => {
    const out = generateSchema({ ...base });
    expect(out).not.toContain('"tag"');
  });
});
