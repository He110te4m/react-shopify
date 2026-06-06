import { describe, it, expect, beforeEach, afterEach } from "vitest";

const g = globalThis as any;

describe("buildLiquidBridge — complex bridge expressions", () => {
  beforeEach(() => {
    g.__shopify_ssg_tracked = new Map<string, any>();
  });

  afterEach(() => {
    delete g.__shopify_ssg_tracked;
  });

  async function getBuildBridge() {
    const mod = await import("../runtime/bridge");
    return mod.buildLiquidBridge;
  }

  it("image_url custom bridge", async () => {
    g.__shopify_ssg_tracked.set("section.settings.image", {
      bridge: "{{ section.settings.image | image_url: width: 800, height: 600, crop: 'center' | json }}",
      type: "string",
    });

    const buildBridge = await getBuildBridge();
    const result = buildBridge();
    expect(result).toContain("section.settings.image");
    expect(result).toContain("image_url: width: 800, height: 600, crop: 'center'");
    expect(result).toContain("| json }}");
    // data-ssg-liquid attribute present
    expect(result).toContain('data-ssg-liquid');
    // Valid JSON structure
    expect(result).toContain('"section.settings.image":');
  });

  it("conditional Liquid bridge (section.index based)", async () => {
    g.__shopify_ssg_tracked.set("_lazy", {
      bridge: "{% if section.index < 4 %}true{% else %}false{% endif %}",
      type: "boolean",
    });

    const buildBridge = await getBuildBridge();
    const result = buildBridge();
    expect(result).toContain("_lazy");
    expect(result).toContain("{% if section.index < 4 %}true{% else %}false{% endif %}");
    // Should not have extra | json (Liquid already outputs valid JSON boolean)
    expect(result).not.toContain("_lazy\": {{");
  });

  it("snippet capture bridge", async () => {
    g.__shopify_ssg_tracked.set("_card", {
      bridge: '{% render "product-card", product: product | json %}',
      type: "html",
    });

    const buildBridge = await getBuildBridge();
    const result = buildBridge();
    expect(result).toContain("_card");
    expect(result).toContain('{% render "product-card", product: product | json %}');
  });

  it("multi-line liquid block bridge", async () => {
    const liquidBlock = [
      "{%- liquid",
      "  assign result = section.settings.count | plus: 1",
      "  echo result | json",
      "-%}",
    ].join("\n");
    g.__shopify_ssg_tracked.set("_computed", {
      bridge: liquidBlock,
      type: "number",
    });

    const buildBridge = await getBuildBridge();
    const result = buildBridge();
    expect(result).toContain("_computed");
    expect(result).toContain("assign result");
    expect(result).toContain("plus: 1");
  });

  it("mixed simple and custom expressions in same bridge", async () => {
    g.__shopify_ssg_tracked.set("section.settings.title", {});
    g.__shopify_ssg_tracked.set("section.settings.image", {
      bridge: "{{ section.settings.image | image_url: width: 800 | json }}",
    });
    g.__shopify_ssg_tracked.set("section.settings.count", {
      type: "number",
    });
    g.__shopify_ssg_tracked.set("_condition", {
      bridge: "{% if section.index < 4 %}true{% else %}false{% endif %}",
    });

    const buildBridge = await getBuildBridge();
    const result = buildBridge();

    // Simple expression gets default | json
    expect(result).toContain("{{ section.settings.title | json }}");
    // Image gets custom bridge
    expect(result).toContain("image_url: width: 800");
    // Count gets default | json
    expect(result).toContain("{{ section.settings.count | json }}");
    // Condition gets custom bridge
    expect(result).toContain("{% if section.index < 4 %}");

    // All keys present
    expect(result).toContain('"section.settings.title":');
    expect(result).toContain('"section.settings.image":');
    expect(result).toContain('"section.settings.count":');
    expect(result).toContain('"_condition":');
  });

  it("pros duces valid JSON (no trailing comma after any entry)", async () => {
    g.__shopify_ssg_tracked.set("a", {});
    g.__shopify_ssg_tracked.set("b", { bridge: "custom1" });
    g.__shopify_ssg_tracked.set("c", {});

    const buildBridge = await getBuildBridge();
    const result = buildBridge();

    // No trailing comma before closing brace
    expect(result).not.toMatch(/,(\s*)\n(\s*)\}/);
  });
});

describe("buildLiquidBridge — edge cases", () => {
  beforeEach(() => {
    g.__shopify_ssg_tracked = new Map<string, any>();
  });

  afterEach(() => {
    delete g.__shopify_ssg_tracked;
  });

  async function getBuildBridge() {
    const mod = await import("../runtime/bridge");
    return mod.buildLiquidBridge;
  }

  it("bridge expression containing Liquid tags is not double-wrapped", async () => {
    // When bridge already starts with {{ or {%, don't add extra
    g.__shopify_ssg_tracked.set("x", {
      bridge: "{{ already.liquid | json }}",
    });
    const buildBridge = await getBuildBridge();
    const result = buildBridge();
    expect(result).toContain('"x": {{ already.liquid | json }}');
    // Not double-wrapped
    expect(result).not.toContain("{{ {{");
  });
});
