import { describe, it, expect } from "vitest";
import { autoFixAdjacentText } from "../ssg/hydration-fix";

describe("autoFixAdjacentText", () => {
  it("fixes text followed by expression", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<button>-{s.step}</button>`, "test.tsx",
    );
    expect(fixCount).toBe(1);
    expect(result).toContain('{`-${s.step}`}');
  });

  it("fixes expression surrounded by text", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<li>title = {title}</li>`, "test.tsx",
    );
    expect(fixCount).toBe(1);
    expect(result).toContain("`title = ${title}`");
  });

  it("fixes expression followed by text", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<span>{count} items</span>`, "test.tsx",
    );
    expect(fixCount).toBe(1);
    expect(result).toContain("`${count} items`");
  });

  it("fixes Chinese text + expression", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<p>effect_only_text = {result}</p>`, "test.tsx",
    );
    expect(fixCount).toBe(1);
    expect(result).toContain("`effect_only_text = ${result}`");
  });

  it("does NOT touch pure text (no expression)", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<button>Reset</button>`, "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("does NOT touch single expression", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<h1>{title}</h1>`, "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("does NOT touch already-safe template literal", () => {
    const { result, fixCount } = autoFixAdjacentText(
      "<button>{`-${s.step}`}</button>", "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("does NOT touch ternary expression", () => {
    const { result, fixCount } = autoFixAdjacentText(
      "<div>{show ? 'yes' : 'no'}</div>", "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("fixes multiple mixed patterns", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<span>-{step} / +{step}</span>`, "test.tsx",
    );
    expect(fixCount).toBe(1);
    expect(result).toContain("`-${step} / +${step}`");
  });

  it("fixes element with className containing template literal", () => {
    const src = `<div className="foo">text{expr}</div>`;
    const { result, fixCount } = autoFixAdjacentText(src, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toContain("`text${expr}`");
  });

  it("does NOT touch elements with child JSX tags", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<div>text{expr}<span>child</span></div>`, "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("fixes multiple elements in the same source", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<button>-{step}</button>\n<li>title = {title}</li>\n<h1>{title}</h1>\n<p>Reset</p>`,
      "test.tsx",
    );
    expect(fixCount).toBe(2);
    expect(result).toContain('{`-${step}`}');
    expect(result).toContain("`title = ${title}`");
    expect(result).toContain("<h1>{title}</h1>");
    expect(result).toContain("<p>Reset</p>");
  });
});
