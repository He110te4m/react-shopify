import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const g = globalThis as any;

let mockContextData: Record<string, any> = {};

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useContext: vi.fn(() => mockContextData),
    useState: vi.fn((v: any) => [typeof v === "function" ? v() : v, vi.fn()]),
    useEffect: vi.fn(),
  };
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

  it("useLiquidValue tracks expression and returns Liquid placeholder", async () => {
    const { useLiquidValue } = await importHooks();
    const [val] = useLiquidValue("section.settings.title");
    expect(val).toBe("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("useLiquidValue tracks nested expressions", async () => {
    const { useLiquidValue } = await importHooks();
    useLiquidValue("section.settings.product.name");
    useLiquidValue("section.settings.product.price");
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
    expect(result).toEqual({
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

  it("useSectionSettings delegates with section prefix", async () => {
    const { useSectionSettings } = await importHooks();
    const result = useSectionSettings("title");
    expect(result.value).toBe("{{ section.settings.title }}");
    expect(g.__shopify_ssg_liquid_track.has("section.settings.title")).toBe(true);
  });

  it("useBlockSettings delegates with block prefix", async () => {
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
    const { useLiquidValue } = await importHooks();
    const [val] = useLiquidValue("section.settings.title");
    expect(val).toBe("{{ section.settings.title }}");
  });

  it("handles blank expression", async () => {
    const { useLiquidValue } = await importHooks();
    const [val] = useLiquidValue("");
    expect(val).toBe("{{  }}");
  });

  it("useLiquidValues with empty map returns empty object", async () => {
    const { useLiquidValues } = await importHooks();
    const result = useLiquidValues({});
    expect(result).toEqual({});
    expect(g.__shopify_ssg_liquid_track.size).toBe(0);
  });

  it("tracks expression containing special Liquid characters", async () => {
    const { useLiquidValue } = await importHooks();
    const expr = "collection.products | where: 'available'";
    useLiquidValue(expr);
    expect(g.__shopify_ssg_liquid_track.has(expr)).toBe(true);
  });
});

describe("runtime hooks — browser hydration path (first render)", () => {
  beforeEach(() => {
    g.document = {};
    delete g.__shopify_ssg_liquid_track;
    mockContextData = {};
  });

  afterEach(() => {
    delete g.document;
    mockContextData = {};
  });

  describe("useLiquidValue with number type", () => {
    it("returns parsed number on first render (no useEffect needed)", async () => {
      mockContextData = { "section.settings.count": 5 };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.count", "number");
      expect(val).toBe(5);
      expect(typeof val).toBe("number");
    });

    it("returns 0 when expression missing from data", async () => {
      mockContextData = {};
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.count", "number");
      expect(val).toBe(0);
    });

    it("returns 0 when value is null", async () => {
      mockContextData = { "section.settings.count": null };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.count", "number");
      expect(val).toBe(0);
    });

    it("parses string '42' to number 42", async () => {
      mockContextData = { "section.settings.count": "42" };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.count", "number");
      expect(val).toBe(42);
    });

    it("parses '0' string to 0", async () => {
      mockContextData = { "section.settings.count": "0" };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.count", "number");
      expect(val).toBe(0);
    });

    it("falls back to 0 for non-numeric string", async () => {
      mockContextData = { "section.settings.count": "abc" };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.count", "number");
      expect(val).toBe(0);
    });

    it("preserves negative numbers", async () => {
      mockContextData = { "section.settings.delta": -3 };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.delta", "number");
      expect(val).toBe(-3);
    });

    it("preserves floats", async () => {
      mockContextData = { "section.settings.price": 19.99 };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.price", "number");
      expect(val).toBe(19.99);
    });
  });

  describe("useLiquidValue with boolean type", () => {
    it("returns false on first render even when real value is true (avoids hydration mismatch when real is false)", async () => {
      mockContextData = { "section.settings.show": true };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.show", "boolean");
      expect(val).toBe(false);
    });

    it("returns false on first render when real value is false", async () => {
      mockContextData = { "section.settings.show": false };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.show", "boolean");
      expect(val).toBe(false);
    });

    it("returns false when expression missing", async () => {
      mockContextData = {};
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.show", "boolean");
      expect(val).toBe(false);
    });

    it("treats 'true' string as false on first render (useEffect will flip it)", async () => {
      mockContextData = { "section.settings.show": "true" };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.show", "boolean");
      expect(val).toBe(false);
    });
  });

  describe("useLiquidValue with string type (default)", () => {
    it("returns string on first render", async () => {
      mockContextData = { "section.settings.title": "Hello" };
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.title");
      expect(val).toBe("Hello");
    });

    it("returns undefined when expression missing", async () => {
      mockContextData = {};
      const { useLiquidValue } = await importHooks();
      const [val] = useLiquidValue("section.settings.title");
      expect(val).toBeUndefined();
    });
  });

  describe("useLiquidValues with mixed types", () => {
    it("parses each key according to its type on first render", async () => {
      mockContextData = {
        "section.settings.title": "Hello",
        "section.settings.count": 7,
        "section.settings.show": true,
      };
      const { useLiquidValues } = await importHooks();
      const result = useLiquidValues(
        {
          title: "section.settings.title",
          count: "section.settings.count",
          show: "section.settings.show",
        },
        { count: "number", show: "boolean" },
      );
      expect(result.title).toBe("Hello");
      expect(result.count).toBe(7);
      expect(result.show).toBe(false);
    });

    it("defaults number keys to 0 when data missing", async () => {
      mockContextData = {};
      const { useLiquidValues } = await importHooks();
      const result = useLiquidValues(
        { count: "section.settings.count" },
        { count: "number" },
      );
      expect(result).toEqual({ count: 0 });
    });

    it("defaults boolean keys to false when data missing", async () => {
      mockContextData = {};
      const { useLiquidValues } = await importHooks();
      const result = useLiquidValues(
        { show: "section.settings.show" },
        { show: "boolean" },
      );
      expect(result).toEqual({ show: false });
    });

    it("string key (no type) returns undefined when missing", async () => {
      mockContextData = {};
      const { useLiquidValues } = await importHooks();
      const result = useLiquidValues({ title: "section.settings.title" });
      expect(result).toEqual({ title: undefined });
    });

    it("treats undeclared type as string", async () => {
      mockContextData = { "section.settings.x": "abc" };
      const { useLiquidValues } = await importHooks();
      const result = useLiquidValues({ x: "section.settings.x" });
      expect(result).toEqual({ x: "abc" });
    });
  });
});

describe("runtime hooks — SSR regression (number/boolean default behaviour preserved)", () => {
  beforeEach(() => {
    g.__shopify_ssg_liquid_track = new Set<string>();
    delete g.document;
    mockContextData = {};
  });

  afterEach(() => {
    delete g.__shopify_ssg_liquid_track;
  });

  it("number type in SSR still emits Liquid placeholder so Shopify replaces it", async () => {
    const { useLiquidValue } = await importHooks();
    const [val] = useLiquidValue("section.settings.count", "number");
    expect(val).toBe("{{ section.settings.count }}");
  });

  it("boolean type in SSR still defaults to false (no mismatch when real value is false)", async () => {
    const { useLiquidValue } = await importHooks();
    const [val] = useLiquidValue("section.settings.show", "boolean");
    expect(val).toBe(false);
  });

  it("useLiquidValues number key in SSR emits Liquid placeholder", async () => {
    const { useLiquidValues } = await importHooks();
    const result = useLiquidValues(
      { count: "section.settings.count" },
      { count: "number" },
    );
    expect(result).toEqual({ count: "{{ section.settings.count }}" });
  });

  it("useLiquidValues boolean key in SSR defaults to false", async () => {
    const { useLiquidValues } = await importHooks();
    const result = useLiquidValues(
      { show: "section.settings.show" },
      { show: "boolean" },
    );
    expect(result).toEqual({ show: false });
  });
});
