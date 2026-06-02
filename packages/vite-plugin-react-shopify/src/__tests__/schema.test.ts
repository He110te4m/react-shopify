import { describe, it, expect } from "vitest";
import { generateSchema } from "../ssg/schema";
import type { ShopifyMeta } from "../types";

const base: ShopifyMeta = { name: "Test" };

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
