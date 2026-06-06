import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const g = globalThis as any;

let mockContextData: Record<string, any> = {};

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useContext: vi.fn(() => mockContextData),
    useState: vi.fn((v: any) => [typeof v === "function" ? v() : v, vi.fn()]),
    useMemo: vi.fn((fn: () => any) => fn()),
    useCallback: vi.fn((fn: () => any) => fn),
    createElement: vi.fn((type: any, props: any, ...children: any[]) => ({
      type,
      props: { ...props, children: children.length ? children : undefined },
    })),
  };
});

async function importShopifyContext() {
  return await import("../runtime/ShopifyContext");
}

async function importUseLiquid() {
  return await import("../runtime/useLiquid");
}

describe("ShopifyContext — SSR path", () => {
  beforeEach(() => {
    g.document = undefined;
    g.__shopify_ssg_liquid_track = new Set<string>();
    g.__shopify_ssg_liquid_blocks = [] as string[];
    g.__shopify_ssg_tracked = new Map<string, any>();
    mockContextData = {};
  });

  afterEach(() => {
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_liquid_blocks;
    delete g.__shopify_ssg_tracked;
    delete g.document;
  });

  it("isSSR is true", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    expect(ctx.isSSR).toBe(true);
  });

  it("read() returns Liquid placeholder and tracks expression", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    const val = ctx.read("section.settings.title");
    expect(val).toBe("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("track() adds to both global registries", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    ctx.track("section.settings.title");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
    expect(g.__shopify_ssg_tracked.has("section.settings.title")).toBe(true);
  });

  it("track() stores TrackOptions in tracked map", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    ctx.track("section.settings.image", {
      bridge: "{{ section.settings.image | image_url: width: 800 | json }}",
      type: "string",
    });
    const opts = g.__shopify_ssg_tracked.get("section.settings.image");
    expect(opts.bridge).toBe("{{ section.settings.image | image_url: width: 800 | json }}");
    expect(opts.type).toBe("string");
  });

  it("track() defaults opts to empty object", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    ctx.track("section.settings.title");
    const opts = g.__shopify_ssg_tracked.get("section.settings.title");
    expect(opts).toEqual({});
  });

  it("inject() pushes code to blocks array", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    ctx.inject("{%- liquid\n  assign x = 1\n-%}");
    expect(g.__shopify_ssg_liquid_blocks).toContain("{%- liquid\n  assign x = 1\n-%}");
  });

  it("inject() handles multiple blocks", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    ctx.inject("code1");
    ctx.inject("code2");
    expect(g.__shopify_ssg_liquid_blocks).toEqual(["code1", "code2"]);
  });

  it("read() handles empty path", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    expect(ctx.read("")).toBe("{{  }}");
  });
});

describe("ShopifyContext — CSR path", () => {
  beforeEach(() => {
    g.document = {};
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_liquid_blocks;
    delete g.__shopify_ssg_tracked;
    mockContextData = { "section.settings.title": "Hello" };
  });

  afterEach(() => {
    delete g.document;
    mockContextData = {};
  });

  it("isSSR is false", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    expect(ctx.isSSR).toBe(false);
  });

  it("read() returns bridge value", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    expect(ctx.read("section.settings.title")).toBe("Hello");
  });

  it("read() returns undefined for missing key", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    expect(ctx.read("section.settings.unknown")).toBeUndefined();
  });

  it("track() is no-op", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    ctx.track("section.settings.title");
    expect(g.__shopify_ssg_liquid_track).toBeUndefined();
  });

  it("inject() is no-op", async () => {
    const { useShopifyContext } = await importShopifyContext();
    const ctx = useShopifyContext();
    ctx.inject("code");
    expect(g.__shopify_ssg_liquid_blocks).toBeUndefined();
  });
});

describe("buildLiquidBridge", () => {
  beforeEach(() => {
    g.__shopify_ssg_tracked = new Map<string, any>();
  });

  afterEach(() => {
    delete g.__shopify_ssg_tracked;
  });

  it("returns empty string when no tracked expressions", async () => {
    const { buildLiquidBridge } = await importShopifyContext();
    expect(buildLiquidBridge()).toBe("");
  });

  it("returns empty string when tracked map is not set", async () => {
    delete g.__shopify_ssg_tracked;
    const { buildLiquidBridge } = await importShopifyContext();
    expect(buildLiquidBridge()).toBe("");
  });

  it("generates bridge with default | json filter", async () => {
    g.__shopify_ssg_tracked.set("section.settings.title", {});
    const { buildLiquidBridge } = await importShopifyContext();
    const result = buildLiquidBridge();
    expect(result).toContain("section.settings.title");
    expect(result).toContain("{{ section.settings.title | json }}");
    expect(result).toContain('data-ssg-liquid');
  });

  it("generates bridge with custom bridge expression", async () => {
    g.__shopify_ssg_tracked.set("section.settings.image", {
      bridge: "{{ section.settings.image | image_url: width: 800 | json }}",
    });
    const { buildLiquidBridge } = await importShopifyContext();
    const result = buildLiquidBridge();
    expect(result).toContain("section.settings.image");
    expect(result).toContain("image_url: width: 800");
    // Should NOT contain default | json pattern for this entry
    expect(result).not.toContain("{{ section.settings.image | json }}");
  });

  it("generates bridge with multiple entries", async () => {
    g.__shopify_ssg_tracked.set("section.settings.title", {});
    g.__shopify_ssg_tracked.set("section.settings.count", {});
    const { buildLiquidBridge } = await importShopifyContext();
    const result = buildLiquidBridge();
    expect(result).toContain("section.settings.title");
    expect(result).toContain("section.settings.count");
    // Valid JSON: no trailing comma
    expect(result).not.toMatch(/,(\s*)\}/);
  });

  it("generates bridge with single entry and no trailing comma", async () => {
    g.__shopify_ssg_tracked.set("section.settings.title", {});
    const { buildLiquidBridge } = await importShopifyContext();
    const result = buildLiquidBridge();
    expect(result).not.toMatch(/,(\s*)\}/);
  });

  it("generates bridge with mixed default and custom entries", async () => {
    g.__shopify_ssg_tracked.set("section.settings.title", {});
    g.__shopify_ssg_tracked.set("section.settings.image", {
      bridge: "{{ section.settings.image | image_url: width: 800 | json }}",
    });
    const { buildLiquidBridge } = await importShopifyContext();
    const result = buildLiquidBridge();
    expect(result).toContain("{{ section.settings.title | json }}");
    expect(result).toContain("image_url: width: 800");
  });
});

describe("useLiquid — SSR path", () => {
  beforeEach(() => {
    g.document = undefined;
    g.__shopify_ssg_liquid_track = new Set<string>();
    g.__shopify_ssg_tracked = new Map<string, any>();
    mockContextData = {};
  });

  afterEach(() => {
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_tracked;
    delete g.document;
  });

  it("returns Liquid placeholder and tracks expression", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.title");
    expect(val).toBe("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("number type returns Liquid placeholder in SSR", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.count", { type: "number" });
    expect(val).toBe("{{ section.settings.count }}");
  });

  it("boolean type returns false in SSR (hydration safety)", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.show", { type: "boolean" });
    expect(val).toBe(false);
  });

  it("tracks with TrackOptions including custom bridge", async () => {
    const { useLiquid } = await importUseLiquid();
    useLiquid("section.settings.image", {
      type: "string",
      bridge: "{{ expr | image_url: width: 800 | json }}",
    });
    const opts = g.__shopify_ssg_tracked.get("section.settings.image");
    expect(opts.bridge).toBe("{{ expr | image_url: width: 800 | json }}");
  });
});

describe("useLiquid — CSR path", () => {
  beforeEach(() => {
    g.document = {};
    delete g.__shopify_ssg_liquid_track;
    delete g.__shopify_ssg_tracked;
    mockContextData = {
      "section.settings.title": "Hello",
      "section.settings.count": 5,
      "section.settings.price": 19.99,
      "section.settings.show": true,
      "section.settings.empty": null,
      "section.settings.strNum": "42",
      "section.settings.badNum": "abc",
    };
  });

  afterEach(() => {
    delete g.document;
    mockContextData = {};
  });

  it("string: returns bridge value", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.title");
    expect(val).toBe("Hello");
  });

  it("string: returns defaultValue when missing", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.unknown", {
      defaultValue: "fallback",
    });
    expect(val).toBe("fallback");
  });

  it("number: returns parsed number", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.count", { type: "number" });
    expect(val).toBe(5);
    expect(typeof val).toBe("number");
  });

  it("number: returns defaultValue when missing", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.unknown", {
      type: "number",
      defaultValue: 99,
    });
    expect(val).toBe(99);
  });

  it("number: returns 0 when null", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.empty", { type: "number" });
    expect(val).toBe(0);
  });

  it("number: parses string '42' to number 42", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.strNum", { type: "number" });
    expect(val).toBe(42);
  });

  it("number: falls back to 0 for non-numeric string", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.badNum", { type: "number" });
    expect(val).toBe(0);
  });

  it("number: preserves floats", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.price", { type: "number" });
    expect(val).toBe(19.99);
  });

  it("boolean: returns false on first render (hydration safety)", async () => {
    const { useLiquid } = await importUseLiquid();
    const [val] = useLiquid("section.settings.show", { type: "boolean" });
    expect(val).toBe(false);
  });

  it("returns setter function", async () => {
    const { useLiquid } = await importUseLiquid();
    const [, setter] = useLiquid("section.settings.title");
    expect(typeof setter).toBe("function");
  });
});

describe("useLiquidCode", () => {
  beforeEach(() => {
    g.document = undefined;
    g.__shopify_ssg_liquid_blocks = [] as string[];
    g.__shopify_ssg_liquid_track = new Set<string>();
    mockContextData = {};
  });

  afterEach(() => {
    delete g.document;
    delete g.__shopify_ssg_liquid_blocks;
    delete g.__shopify_ssg_liquid_track;
  });

  it("SSR: injects code and tracks expressions", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{%- liquid\n  assign x = 1\n-%}", ["x"]);
    expect(g.__shopify_ssg_liquid_blocks).toContain(
      "{%- liquid\n  assign x = 1\n-%}",
    );
    expect(g.__shopify_ssg_liquid_track.has("x")).toBe(true);
  });

  it("SSR: works without tracked expressions", async () => {
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("{% render 'my-snippet' %}");
    expect(g.__shopify_ssg_liquid_blocks).toContain("{% render 'my-snippet' %}");
  });

  it("CSR: does not add to blocks array", async () => {
    g.document = {};
    const { useLiquidCode } = await importUseLiquid();
    useLiquidCode("code");
    // inject() no-ops on CSR, blocks array stays as-is from beforeEach
    expect(g.__shopify_ssg_liquid_blocks).toEqual([]);
  });
});
