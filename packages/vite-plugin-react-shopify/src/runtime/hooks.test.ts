import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const g = globalThis as any;

// Mock React's useContext to return an empty object.
// In real use, useContext would be called inside a React render tree;
// here we're testing just the SSR tracking logic.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useContext: vi.fn(() => ({})) };
});

async function importHooks() {
  return await import("../runtime/hooks");
}

describe("runtime hooks — SSR path", () => {
  beforeEach(() => {
    g.__shopify_ssg_liquid_track = new Set<string>();
    delete g.document;
  });

  afterEach(() => {
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_target;
  });

  it("useLiquid tracks expression and returns Liquid placeholder", async () => {
    const { useLiquid } = await importHooks();
    const result = useLiquid("section.settings.title");
    expect(result.value).toBe("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("useLiquid tracks nested expressions", async () => {
    const { useLiquid } = await importHooks();
    useLiquid("section.settings.product.name");
    useLiquid("section.settings.product.price");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.product.name")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.has("section.settings.product.price")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.size).toBe(2);
  });

  it("useLiquidValues tracks all expressions and returns placeholders", async () => {
    const { useLiquidValues } = await importHooks();
    const result = useLiquidValues({
      title: "section.settings.title",
      price: "section.settings.price",
    });
    expect(result.values).toEqual({
      title: "{{ section.settings.title }}",
      price: "{{ section.settings.price }}",
    });
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.has("section.settings.price")).toBe(true);
  });

  it("useLiquidValues deduplicates same expressions", async () => {
    const { useLiquidValues } = await importHooks();
    useLiquidValues({ a: "section.settings.title", b: "section.settings.title" });
    expect(g.__shopify_ssg_liquid_track.size).toBe(1);
  });

  it("useSectionSettings delegates to useLiquid with section prefix", async () => {
    const { useSectionSettings } = await importHooks();
    const result = useSectionSettings("title");
    expect(result.value).toBe("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("useBlockSettings delegates to useLiquid with block prefix", async () => {
    const { useBlockSettings } = await importHooks();
    const result = useBlockSettings("color");
    expect(result.value).toBe("{{ block.settings.color }}");
    expect(g.__shopify_ssg_liquid_track.has("block.settings.color")).toBe(true);
  });

  it("useSnippetParams uses raw expression", async () => {
    const { useSnippetParams } = await importHooks();
    const result = useSnippetParams("product_title");
    expect(result.value).toBe("{{ product_title }}");
    expect(g.__shopify_ssg_liquid_track.has("product_title")).toBe(true);
  });

  it("useBlockParams uses raw expression", async () => {
    const { useBlockParams } = await importHooks();
    const result = useBlockParams("product_id");
    expect(result.value).toBe("{{ product_id }}");
    expect(g.__shopify_ssg_liquid_track.has("product_id")).toBe(true);
  });

  it("returns placeholder even when tracker is not set", async () => {
    delete g.__shopify_ssg_liquid_track;
    const { useLiquid } = await importHooks();
    const result = useLiquid("section.settings.title");
    expect(result.value).toBe("{{ section.settings.title }}");
  });

  it("handles blank expression", async () => {
    const { useLiquid } = await importHooks();
    const result = useLiquid("");
    expect(result.value).toBe("{{  }}");
  });

  it("useLiquidValues with empty map returns empty object", async () => {
    const { useLiquidValues } = await importHooks();
    const result = useLiquidValues({});
    expect(result.values).toEqual({});
    expect(g.__shopify_ssg_liquid_track.size).toBe(0);
  });

  it("tracks expression containing special Liquid characters", async () => {
    const { useLiquid } = await importHooks();
    const expr = "collection.products | where: 'available'";
    useLiquid(expr);
    expect(g.__shopify_ssg_liquid_track.has(expr)).toBe(true);
  });
});
