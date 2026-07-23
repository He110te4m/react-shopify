import { describe, expect, it } from "vitest";
import { isStaticComponent } from "../ssg/static-analyzer";

describe("isStaticComponent", () => {
  it("treats clientOnly usage as interactive", () => {
    const source = `
      import { clientOnly } from "vite-plugin-react-shopify/runtime";
      const BrowserOnly = clientOnly(() => import("./BrowserOnly.client"));
      export default function Section() { return <BrowserOnly />; }
    `;

    expect(isStaticComponent(source, "/tmp/ClientOnlySection.tsx")).toBe(false);
  });

  it("treats ClientOnly JSX usage as interactive", () => {
    const source = `
      import { ClientOnly } from "vite-plugin-react-shopify/runtime";
      export default function Section() {
        return <ClientOnly fallback={<div />}>{() => <div />}</ClientOnly>;
      }
    `;

    expect(isStaticComponent(source, "/tmp/ClientOnlyJsxSection.tsx")).toBe(false);
  });

  it("invalidates cached analysis when source changes", () => {
    const file = "/tmp/ChangingSection.tsx";
    expect(isStaticComponent("export default function A(){ return <div /> }", file)).toBe(true);
    expect(isStaticComponent("export default function A(){ return <button onClick={() => {}} /> }", file)).toBe(false);
  });

  it("conservatively hydrates unknown external JSX components", () => {
    const source = `
      import { Widget } from "third-party-ui";
      export default function Section() { return <Widget />; }
    `;
    expect(isStaticComponent(source, "/tmp/ExternalWidget.tsx")).toBe(false);
  });

  it("does not classify useMemo alone as client interaction", () => {
    const source = `
      import { useMemo } from "react";
      export default function Section() { return <div>{useMemo(() => "value", [])}</div>; }
    `;
    expect(isStaticComponent(source, "/tmp/MemoSection.tsx")).toBe(true);
  });
});
