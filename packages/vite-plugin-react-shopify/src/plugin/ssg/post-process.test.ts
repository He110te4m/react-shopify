import { describe, it, expect } from "vitest";
import { unwrapHtmlEntities } from "./post-process";

describe("post-process", () => {
  describe("unwrapHtmlEntities", () => {
    it("unwraps &amp;", () => {
      expect(unwrapHtmlEntities("a &amp; b")).toBe("a & b");
    });

    it("unwraps &lt; and &gt;", () => {
      expect(unwrapHtmlEntities("&lt;div&gt;")).toBe("<div>");
    });

    it("unwraps &quot;", () => {
      expect(unwrapHtmlEntities("&quot;hello&quot;")).toBe('"hello"');
    });

    it("unwraps &#x27;", () => {
      expect(unwrapHtmlEntities("it&#x27;s")).toBe("it's");
    });

    it("handles mixed entities", () => {
      const input = '&lt;a href=&quot;x&quot;&gt;link&lt;/a&gt;';
      expect(unwrapHtmlEntities(input)).toBe('<a href="x">link</a>');
    });

    it("preserves Liquid expressions", () => {
      const input = "&lt;h1&gt;{{ section.settings.title }}&lt;/h1&gt;";
      expect(unwrapHtmlEntities(input)).toBe("<h1>{{ section.settings.title }}</h1>");
    });

    it("returns unchanged when no entities", () => {
      expect(unwrapHtmlEntities("plain text")).toBe("plain text");
    });

    it("handles empty string", () => {
      expect(unwrapHtmlEntities("")).toBe("");
    });
  });
});
