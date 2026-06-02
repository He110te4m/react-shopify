import { describe, it, expect } from "vitest";
import { autoFixAdjacentText } from "../hydration-fix";

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
    const { fixCount } = autoFixAdjacentText(
      `<button>Reset</button>`, "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("does NOT touch single expression", () => {
    const { fixCount } = autoFixAdjacentText(
      `<h1>{title}</h1>`, "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("does NOT touch already-safe template literal", () => {
    const { fixCount } = autoFixAdjacentText(
      "<button>{`-${s.step}`}</button>", "test.tsx",
    );
    expect(fixCount).toBe(0);
  });

  it("does NOT touch ternary expression", () => {
    const { fixCount } = autoFixAdjacentText(
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

  it("fixes adjacent text+expr before child JSX tags", () => {
    const { result, fixCount } = autoFixAdjacentText(
      `<div>text{expr}<span>child</span></div>`, "test.tsx",
    );
    // "text{expr}" is an adjacent text+expression — should be fixed
    // The <span>child</span> child JSXElement should be left unchanged
    expect(fixCount).toBe(1);
    expect(result).toContain("`text${expr}`");
    expect(result).toContain("<span>child</span>");
  });

  it("fixes multiple JSX elements in a component", () => {
    const src = [
      `export default function Test() {`,
      `  return (`,
      `    <>`,
      `      <button>-{step}</button>`,
      `      <li>title = {title}</li>`,
      `      <h1>{title}</h1>`,
      `      <p>Reset</p>`,
      `    </>`,
      `  );`,
      `}`,
    ].join("\n");
    const { result, fixCount } = autoFixAdjacentText(src, "test.tsx");
    expect(fixCount).toBe(2);
    expect(result).toContain('{`-${step}`}');
    expect(result).toContain("`title = ${title}`");
    expect(result).toContain("<h1>{title}</h1>");
    expect(result).toContain("<p>Reset</p>");
  });

  it("fixes multi-line JSX with arrow function in attrs", () => {
    const src = [
      `<button type="button" onClick={() => setCount((c) => c - stepNum)}>`,
      `  -{s.step}`,
      `</button>`,
    ].join("\n");
    const { result, fixCount } = autoFixAdjacentText(src, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toContain('{`-${s.step}`}');
    expect(result).toContain("onClick={() => setCount((c) => c - stepNum)}");
  });

  it("fixes multi-line JSX text+expression followed by text", () => {
    const src = [
      `<span>`,
      `  {count} items`,
      `</span>`,
    ].join("\n");
    const { result, fixCount } = autoFixAdjacentText(src, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toContain("`${count} items`");
  });
});
