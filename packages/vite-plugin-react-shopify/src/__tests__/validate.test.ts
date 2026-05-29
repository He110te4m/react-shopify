import { describe, it, expect, vi } from "vitest";
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
});
