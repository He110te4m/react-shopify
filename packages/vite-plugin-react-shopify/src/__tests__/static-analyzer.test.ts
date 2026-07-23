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
    expect(
      isStaticComponent(
        "export default function A(){ return <button onClick={() => {}} /> }",
        file,
      ),
    ).toBe(false);
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

  it("treats React.useState as interactive", () => {
    const source = `
      import * as React from "react";
      export default function Section() {
        const [count] = React.useState(0);
        return <div>{count}</div>;
      }
    `;
    expect(isStaticComponent(source, "/tmp/ReactStateSection.tsx")).toBe(false);
  });

  it("treats an aliased React hook import as interactive", () => {
    const source = `
      import { useState as useCounterState } from "react";
      export default function Section() {
        const [count] = useCounterState(0);
        return <div>{count}</div>;
      }
    `;
    expect(isStaticComponent(source, "/tmp/AliasedStateSection.tsx")).toBe(false);
  });

  it("treats a local alias of an interactive hook as interactive", () => {
    const source = `
      import React from "react";
      const state = React.useState;
      export default function Section() {
        const [count] = state(0);
        return <div>{count}</div>;
      }
    `;
    expect(isStaticComponent(source, "/tmp/LocalStateAliasSection.tsx")).toBe(false);
  });

  it("conservatively treats custom local hooks as interactive", () => {
    const source = `
      function useFeature() { return "value"; }
      export default function Section() { return <div>{useFeature()}</div>; }
    `;
    expect(isStaticComponent(source, "/tmp/LocalHookSection.tsx")).toBe(false);
  });

  it("conservatively treats member-style custom hooks as interactive", () => {
    const source = `
      const feature = { useValue: () => "value" };
      export default function Section() { return <div>{feature.useValue()}</div>; }
    `;
    expect(isStaticComponent(source, "/tmp/MemberHookSection.tsx")).toBe(false);
  });

  it("does not trust an arbitrary member named useProps", () => {
    const source = `
      const feature = { useProps: () => ({ title: "Title" }) };
      export default function Section() {
        const { title } = feature.useProps();
        return <div>{title}</div>;
      }
    `;
    expect(isStaticComponent(source, "/tmp/UnknownUsePropsSection.tsx")).toBe(false);
  });

  it("allows Shopify compiler runtime hooks in static output", () => {
    const source = `
      import {
        createTextSetting,
        defineSettings,
        useLiquidClass,
        useShopifyValue,
      } from "vite-plugin-react-shopify/runtime";
      const settings = defineSettings("section", {
        title: createTextSetting({ label: "Title" }),
      });
      export default function Section() {
        const { title } = settings.useProps();
        const value = useShopifyValue({});
        return <div className={useLiquidClass({}, "visible")}>{title}{value}</div>;
      }
    `;
    expect(isStaticComponent(source, "/tmp/LiquidExpressionSection.tsx")).toBe(true);
  });

  it("allows aliased Shopify compiler hooks in static output", () => {
    const source = `
      import { useShopifyValue as readValue } from "vite-plugin-react-shopify/runtime";
      export default function Section() { return <div>{readValue({})}</div>; }
    `;
    expect(isStaticComponent(source, "/tmp/ShopifyValueSection.tsx")).toBe(true);
  });

  it("treats React.useId as dynamic because build-time ids repeat across instances", () => {
    const source = `
      import * as React from "react";
      export default function Section() { return <div id={React.useId()} />; }
    `;
    expect(isStaticComponent(source, "/tmp/ReactIdSection.tsx")).toBe(false);
  });

  it("treats browser API access as interactive", () => {
    const source = `
      export default function Section() {
        return <div>{window.location.pathname}</div>;
      }
    `;
    expect(isStaticComponent(source, "/tmp/BrowserApiSection.tsx")).toBe(false);
  });

  it("treats callback refs as interactive", () => {
    const source = `
      export default function Section() {
        return <input ref={(node) => node?.focus()} />;
      }
    `;
    expect(isStaticComponent(source, "/tmp/CallbackRefSection.tsx")).toBe(false);
  });

  it("treats dynamic imports as interactive", () => {
    const source = `
      const feature = import("./feature");
      export default function Section() {
        return <div>{String(feature)}</div>;
      }
    `;
    expect(isStaticComponent(source, "/tmp/DynamicImportSection.tsx")).toBe(false);
  });

  it("treats parse errors as interactive because static output cannot be proven", () => {
    const source = `export default function Section( { return <div />; }`;
    expect(isStaticComponent(source, "/tmp/InvalidSection.tsx")).toBe(false);
  });
});
