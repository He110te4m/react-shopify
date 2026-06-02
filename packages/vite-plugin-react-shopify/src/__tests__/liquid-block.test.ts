import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const g = globalThis as any;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useContext: vi.fn(() => ({})),
    useMemo: vi.fn((fn: () => any) => fn()),
    useState: vi.fn((v: any) => [typeof v === "function" ? v() : v, vi.fn()]),
    useEffect: vi.fn(),
  };
});

async function importHooks() {
  return await import("../runtime/hooks");
}

describe("useLiquidBlock — SSR path", () => {
  beforeEach(() => {
    g.__shopify_ssg_liquid_track = new Set<string>();
    g.__shopify_ssg_liquid_blocks = [];
    delete g.document;
  });

  afterEach(() => {
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_liquid_blocks;
  });

  it("returns empty string in SSR", async () => {
    const { useLiquidBlock } = await importHooks();
    const result = useLiquidBlock("{{ section.settings.title }}");
    expect(result).toBe("");
  });

  it("pushes code to liquid_blocks registry", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["{{ section.settings.title }}"]);
  });

  it("tracks simple {{ expr }} expressions", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("tracks expressions with filters, stripping the filter part", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{{ section.settings.price | money }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.price")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.has("section.settings.price | money")).toBe(false);
    expect(g.__shopify_ssg_liquid_track.has("money")).toBe(false);
  });

  it("tracks multiple expressions from a multi-line Liquid block", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock(`{%- liquid
    assign price = section.settings.price_input | plus: 0
    assign formatted = price | money
  -%}
  {{ price }}
  {{ formatted }}`);
    expect(g.__shopify_ssg_liquid_track.has("price")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.has("formatted")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.size).toBe(2);
  });

  it("handles filter with complex arguments", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{{ img | img_url: 'master' }}");
    expect(g.__shopify_ssg_liquid_track.has("img")).toBe(true);
  });

  it("pushes empty string to registry for empty code", async () => {
    const { useLiquidBlock } = await importHooks();
    const result = useLiquidBlock("");
    expect(result).toBe("");
    expect(g.__shopify_ssg_liquid_blocks).toEqual([""]);
    expect(g.__shopify_ssg_liquid_track.size).toBe(0);
  });

  it("block without expressions does not modify tracker", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{%- liquid\n  assign x = 1\n%}");
    expect(g.__shopify_ssg_liquid_track.size).toBe(0);
  });

  it("tracks expressions with newline_to_br filter", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{{ section.settings.description | newline_to_br }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.description")).toBe(true);
  });

  it("deduplicates the same expression name", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{{ price }}\n{{ price }}");
    expect(g.__shopify_ssg_liquid_track.size).toBe(1);
  });

  it("works even when tracker is not set", async () => {
    delete g.__shopify_ssg_liquid_track;
    const { useLiquidBlock } = await importHooks();
    const result = useLiquidBlock("{{ section.settings.title }}");
    expect(result).toBe("");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["{{ section.settings.title }}"]);
  });

  it("works even when blocks registry is not set", async () => {
    delete g.__shopify_ssg_liquid_blocks;
    const { useLiquidBlock } = await importHooks();
    const result = useLiquidBlock("{{ section.settings.title }}");
    expect(result).toBe("");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("multiple calls accumulate in registry", async () => {
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{{ a }}");
    useLiquidBlock("{{ b }}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["{{ a }}", "{{ b }}"]);
    expect(g.__shopify_ssg_liquid_track.has("a")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.has("b")).toBe(true);
  });
});

describe("useLiquidBlock — client path", () => {
  beforeEach(() => {
    g.document = {};
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_liquid_blocks;
  });

  afterEach(() => {
    delete g.document;
  });

  it("returns empty string on client", async () => {
    const { useLiquidBlock } = await importHooks();
    const result = useLiquidBlock("{{ section.settings.title }}");
    expect(result).toBe("");
  });

  it("does not push to registry on client", async () => {
    g.__shopify_ssg_liquid_blocks = [];
    const { useLiquidBlock } = await importHooks();
    useLiquidBlock("{%- liquid\n  assign x = 1\n%}\n{{ x }}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual([]);
  });
});
