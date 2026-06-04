import { describe, it, expect } from "vitest";
import { validateShopifyMeta } from "../validate";
import * as rules from "../validate/rules";
import { deriveName } from "../ssg/scanner";

describe("deriveName", () => {
  it("converts PascalCase to space-separated", () => {
    expect(deriveName("BlockTestSection")).toBe("Block Test Section");
    expect(deriveName("HelloWorld")).toBe("Hello World");
    expect(deriveName("ProductCard")).toBe("Product Card");
  });

  it("handles consecutive uppercase (acronyms)", () => {
    expect(deriveName("SSGEntry")).toBe("SSG Entry");
    expect(deriveName("HTMLElement")).toBe("HTML Element");
  });

  it("handles kebab-case input", () => {
    expect(deriveName("hello-world")).toBe("hello world");
    expect(deriveName("my-component-name")).toBe("my component name");
  });

  it("handles snake_case input", () => {
    expect(deriveName("my_component")).toBe("my component");
  });

  it("preserves single-word names", () => {
    expect(deriveName("Counter")).toBe("Counter");
    expect(deriveName("index")).toBe("index");
  });

  it("truncates to 25 chars", () => {
    const name = deriveName("ThisIsAVeryLongComponentNameThatExceedsShopifyLimits");
    expect(name.length).toBeLessThanOrEqual(25);
  });
});

describe("validate/rules", () => {
  describe("checkNameLength", () => {
    it("returns null for names <= 25 chars", () => {
      expect(rules.checkNameLength({ name: "Hello" }, "test")).toBeNull();
      expect(rules.checkNameLength({ name: "A".repeat(25) }, "test")).toBeNull();
    });

    it("returns warning for names > 25 chars", () => {
      const result = rules.checkNameLength({ name: "A".repeat(26) }, "test-comp");
      expect(result).not.toBeNull();
      expect(result).toContain("26 chars");
      expect(result).toContain("test-comp");
      expect(result).toContain("Shopify limit: 25");
    });
  });

  describe("checkEmptyStringDefault", () => {
    it("returns null for non-empty defaults", () => {
      expect(rules.checkEmptyStringDefault({ type: "text", default: "Hello" })).toBeNull();
      expect(rules.checkEmptyStringDefault({ type: "number", default: 0 })).toBeNull();
      expect(rules.checkEmptyStringDefault({ type: "checkbox" })).toBeNull();
    });

    it("returns warning for empty string default", () => {
      const result = rules.checkEmptyStringDefault({
        id: "title",
        type: "text",
        default: "",
      });
      expect(result).not.toBeNull();
      expect(result).toContain("title");
      expect(result).toContain("text");
      expect(result).toContain("empty string default");
    });

  it("handles setting without id", () => {
    const result = rules.checkEmptyStringDefault({ type: "text", default: "" });
    expect(result).toContain("(no id)");
  });
});

describe("checkBlocksCoexistence", () => {
  it("returns null for empty blocks array", () => {
    expect(rules.checkBlocksCoexistence([], "test-comp")).toBeNull();
  });

  it("returns null for undefined blocks", () => {
    expect(rules.checkBlocksCoexistence(undefined, "test-comp")).toBeNull();
  });

  it("returns null for single entry", () => {
    expect(
      rules.checkBlocksCoexistence([{ type: "@theme" }], "test-comp"),
    ).toBeNull();
  });

  it("returns null when all entries are theme/app references", () => {
    expect(
      rules.checkBlocksCoexistence(
        [{ type: "@theme" }, { type: "@app" }, { type: "slide" }],
        "test-comp",
      ),
    ).toBeNull();
  });

  it("returns null when all entries are section blocks", () => {
    expect(
      rules.checkBlocksCoexistence(
        [
          { type: "product", name: "Product" },
          { type: "collection", name: "Collection", limit: 2 },
        ],
        "test-comp",
      ),
    ).toBeNull();
  });

  it("warns when section block and @theme are mixed", () => {
    const result = rules.checkBlocksCoexistence(
      [
        { type: "product", name: "Product" },
        { type: "@theme" },
      ],
      "test-comp",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("test-comp");
    expect(result).toContain("mutually exclusive");
    expect(result).toContain("@theme");
    expect(result).toContain("Product");
  });

  it("warns when section block and theme block filename are mixed", () => {
    const result = rules.checkBlocksCoexistence(
      [
        { type: "slide" },
        { type: "product", name: "Product", settings: [] },
      ],
      "test-comp",
    );
    expect(result).not.toBeNull();
    expect(result).toContain("mutually exclusive");
  });

  it("warns when section block has only limit (no name)", () => {
    const result = rules.checkBlocksCoexistence(
      [
        { type: "@app" },
        { type: "product", limit: 3 },
      ],
      "test-comp",
    );
    expect(result).not.toBeNull();
  });
});
});

describe("validateShopifyMeta", () => {
  it("warns about long name", () => {
    const warnings = validateShopifyMeta(
      { name: "A".repeat(30) },
      { kebabName: "test-comp", filePath: "/test.tsx" },
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("30 chars");
  });

  it("warns about empty string defaults", () => {
    const warnings = validateShopifyMeta(
      {
        name: "Test",
        settings: [
          { id: "title", type: "text", default: "" },
          { id: "count", type: "number", default: 0 },
        ],
      },
      { kebabName: "test-comp", filePath: "/test.tsx" },
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("title");
    expect(warnings[0]).toContain("empty string default");
  });

  it("returns empty array when all meta is valid", () => {
    const warnings = validateShopifyMeta(
      {
        name: "Test Section",
        settings: [
          { id: "title", type: "text", default: "Hello" },
        ],
      },
      { kebabName: "test-comp", filePath: "/test.tsx" },
    );
    expect(warnings).toHaveLength(0);
  });

  it("warns when blocks mix section and theme/app kinds", () => {
    const warnings = validateShopifyMeta(
      {
        name: "Test",
        blocks: [
          { type: "product", name: "Product" },
          { type: "@theme" },
        ],
      },
      { kebabName: "test-comp", filePath: "/test.tsx" },
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("mutually exclusive");
  });
});
