import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientOnly, clientOnly } from "../runtime/ClientOnly";

const g = globalThis as any;

describe("ClientOnly", () => {
  beforeEach(() => {
    g.document = undefined;
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders fallback during SSG", () => {
    const html = renderToStaticMarkup(
      createElement(ClientOnly, {
        fallback: createElement("div", null, "Loading"),
        children: () => createElement("div", null, "Browser"),
      }),
    );

    expect(html).toContain("Loading");
    expect(html).not.toContain("Browser");
  });
});

describe("clientOnly", () => {
  beforeEach(() => {
    g.document = undefined;
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders fallback during SSG without calling loader", () => {
    const loader = vi.fn(async () => ({
      default: () => createElement("div", null, "Browser"),
    }));
    const Widget = clientOnly(loader, {
      fallback: createElement("div", null, "Loading"),
    });

    const html = renderToStaticMarkup(createElement(Widget));

    expect(html).toContain("Loading");
    expect(html).not.toContain("Browser");
    expect(loader).not.toHaveBeenCalled();
  });

  it("supports fallback render functions", () => {
    const Widget = clientOnly<{ label: string }>(
      async () => ({ default: ({ label }) => createElement("div", null, label) }),
      { fallback: ({ label }) => createElement("span", null, `Loading ${label}`) },
    );

    const html = renderToStaticMarkup(createElement(Widget, { label: "Reviews" }));

    expect(html).toContain("Loading Reviews");
  });
});
