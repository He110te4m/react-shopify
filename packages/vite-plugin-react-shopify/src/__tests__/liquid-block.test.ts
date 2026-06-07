import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const g = globalThis as any;

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useContext: vi.fn(() => ({})),
    useMemo: vi.fn((fn: () => any) => fn()),
    useState: vi.fn((v: any) => [typeof v === "function" ? v() : v, vi.fn()]),
    useCallback: vi.fn((fn: () => any) => fn),
  };
});

async function importUseLiquid() {
  return await import("../runtime/useLiquid");
}

describe("useLiquidCode — SSR path", () => {
  beforeEach(() => {
    g.__shopify_ssg_liquid_track = new Set<string>();
    g.__shopify_ssg_liquid_blocks = [] as string[];
    g.__shopify_ssg_tracked = new Map<string, any>();
    delete g.document;
  });

  afterEach(() => {
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_liquid_blocks;
    delete g.__shopify_ssg_tracked;
  });

  it("pushes code to liquid_blocks registry", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["{{ section.settings.title }}"]);
  });

  it("tracks specified expressions", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{% render 'snippet' %}", ["param1", "param2"]);
    expect(g.__shopify_ssg_liquid_track.has("param1")).toBe(true);
    expect(g.__shopify_ssg_liquid_track.has("param2")).toBe(true);
  });

  it("works without tracked expressions", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{%- liquid\n  assign x = 1\n%}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["{%- liquid\n  assign x = 1\n%}"]);
    expect(g.__shopify_ssg_liquid_track.size).toBe(0);
  });

  it("multiple calls accumulate in registry", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{{ a }}");
    useLiquidCode("{{ b }}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["{{ a }}", "{{ b }}"]);
  });

  it("works even when tracker is not set", async () => {
    delete g.__shopify_ssg_liquid_track;
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["{{ section.settings.title }}"]);
  });

  it("works even when blocks registry is not set", async () => {
    delete g.__shopify_ssg_liquid_blocks;
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{{ section.settings.title }}", ["section.settings.title"]);
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });
});

describe("useLiquidCode — client path", () => {
  beforeEach(() => {
    g.document = {};
    g.__shopify_ssg_liquid_blocks = [] as string[];
    g.__shopify_ssg_liquid_track = new Set<string>();
  });

  afterEach(() => {
    delete g.document;
    delete g.__shopify_ssg_liquid_blocks;
    delete g.__shopify_ssg_liquid_track;
  });

  it("does not push to registry on client", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{%- liquid\n  assign x = 1\n%}\n{{ x }}");
    expect(g.__shopify_ssg_liquid_blocks).toEqual([]);
  });

  it("does not track expressions on client", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("code", ["a", "b"]);
    expect(g.__shopify_ssg_liquid_track.size).toBe(0);
  });
});

describe("useLiquid — SSR path", () => {
  beforeEach(() => {
    g.document = undefined;
    g.__shopify_ssg_liquid_track = new Set<string>();
    g.__shopify_ssg_tracked = new Map<string, any>();
  });

  afterEach(() => {
    delete g.document;
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_tracked;
  });

  it("string: returns Liquid placeholder and tracks expression", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.title");
    expect(val).toBe("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("number: returns Liquid placeholder in SSR", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.count", { type: "number" });
    expect(val).toBe("{{ section.settings.count }}");
  });

  it("boolean: returns Liquid placeholder in SSR", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.show", { type: "boolean" });
    expect(val).toBe("{{ section.settings.show }}");
  });

  it("registers in track map with options", async () => {
    const { useLiquid } = await importUseLiquid();
    useLiquid("section.settings.image", {
      type: "string",
      bridge: "{{ expr | image_url: width: 800 | json }}",
    });
    const opts = g.__shopify_ssg_tracked.get("section.settings.image");
    expect(opts.bridge).toBe("{{ expr | image_url: width: 800 | json }}");
  });

  it("returns setter function", async () => {
    const { useLiquid } = await importUseLiquid();
    const [, setter] = useLiquid("section.settings.title");
    expect(typeof setter).toBe("function");
  });
});