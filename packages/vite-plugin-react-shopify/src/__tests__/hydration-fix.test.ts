import { describe, it, expect } from "vitest";
import { autoFixAdjacentText } from "../hydration-fix";

describe("autoFixAdjacentText", () => {
  it("diagnoses text followed by expression without rewriting it", () => {
    const source = `<button>-{s.step}</button>`;
    const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(source);
  });

  it("diagnoses expression surrounded by text without rewriting it", () => {
    const source = `<li>title = {title}</li>`;
    const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(source);
  });

  it("diagnoses expression followed by text without rewriting it", () => {
    const source = `<span>{count} items</span>`;
    const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(source);
  });

  it("diagnoses text + expression without rewriting it", () => {
    const source = `<p>effect_only_text = {result}</p>`;
    const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(source);
  });

  it("does NOT touch pure text (no expression)", () => {
    const { fixCount } = autoFixAdjacentText(`<button>Reset</button>`, "test.tsx");
    expect(fixCount).toBe(0);
  });

  it("does NOT touch single expression", () => {
    const { fixCount } = autoFixAdjacentText(`<h1>{title}</h1>`, "test.tsx");
    expect(fixCount).toBe(0);
  });

  it("does NOT touch already-safe template literal", () => {
    const { fixCount } = autoFixAdjacentText("<button>{`-${s.step}`}</button>", "test.tsx");
    expect(fixCount).toBe(0);
  });

  it("does NOT touch ternary expression", () => {
    const { fixCount } = autoFixAdjacentText("<div>{show ? 'yes' : 'no'}</div>", "test.tsx");
    expect(fixCount).toBe(0);
  });

  it("diagnoses multiple mixed patterns without rewriting them", () => {
    const source = `<span>-{step} / +{step}</span>`;
    const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(source);
  });

  it("diagnoses element with an unrelated className", () => {
    const src = `<div className="foo">text{expr}</div>`;
    const { result, fixCount } = autoFixAdjacentText(src, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(src);
  });

  it("diagnoses adjacent text+expr before child JSX tags", () => {
    const source = `<div>text{expr}<span>child</span></div>`;
    const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(source);
  });

  it("diagnoses multiple JSX elements without rewriting the component", () => {
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
    expect(result).toBe(src);
  });

  it("diagnoses multi-line JSX without rewriting attributes", () => {
    const src = [
      `<button type="button" onClick={() => setCount((c) => c - stepNum)}>`,
      `  -{s.step}`,
      `</button>`,
    ].join("\n");
    const { result, fixCount } = autoFixAdjacentText(src, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(src);
  });

  it("diagnoses multi-line JSX text+expression followed by text", () => {
    const src = [`<span>`, `  {count} items`, `</span>`].join("\n");
    const { result, fixCount } = autoFixAdjacentText(src, "test.tsx");
    expect(fixCount).toBe(1);
    expect(result).toBe(src);
  });

  it.each(["null", "false", "undefined", "node"])(
    "preserves React child semantics for %s expressions",
    (expression) => {
      const source = `<div>prefix:{${expression}}</div>`;
      const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");

      expect(fixCount).toBe(1);
      expect(result).toBe(source);
    },
  );

  it("preserves arbitrary ReactNode expressions", () => {
    const source = `const node: React.ReactNode = <strong>value</strong>; export default () => <div>prefix:{node}</div>`;
    const { result, fixCount } = autoFixAdjacentText(source, "test.tsx");

    expect(fixCount).toBe(1);
    expect(result).toBe(source);
  });
});
