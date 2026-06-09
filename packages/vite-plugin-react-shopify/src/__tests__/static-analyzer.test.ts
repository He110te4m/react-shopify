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
});
