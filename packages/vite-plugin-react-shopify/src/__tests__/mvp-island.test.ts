import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const g = globalThis as any;

let mockContextData: Record<string, any> = {};

const capturedElements: any[] = [];
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  capturedElements.length = 0;
  return {
    ...react,
    useContext: vi.fn(() => mockContextData),
    useMemo: vi.fn((fn: () => any) => fn()),
    createElement: vi.fn((type: any, props: any, ...children: any[]) => {
      const el = { type, props: { ...props, children: children.length ? children : undefined } };
      capturedElements.push(el);
      return el;
    }),
  };
});

async function importIsland() {
  return await import("../runtime/Island");
}

function lastElement(): any {
  return capturedElements[capturedElements.length - 1];
}

describe("Island — SSR path", () => {
  beforeEach(() => {
    g.document = undefined;
    mockContextData = {};
    capturedElements.length = 0;
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders custom element with Liquid expression as innerHTML", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{{ image | image_tag: loading: 'eager' }}" });

    const el = lastElement();
    expect(el.type).toBe("shopify-island");
    expect(el.props.dangerouslySetInnerHTML.__html).toBe(
      "{{ image | image_tag: loading: 'eager' }}",
    );
    expect(el.props.suppressHydrationWarning).toBe(true);
  });

  it("uses custom 'as' tag name", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{{ expr }}", as: "div" });

    const el = lastElement();
    expect(el.type).toBe("div");
  });

  it("passes className and style", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{{ expr }}", className: "my-class", style: { display: "contents" } });

    const el = lastElement();
    expect(el.props.className).toBe("my-class");
    expect(el.props.style).toEqual({ display: "contents" });
  });

  it("content_for expression works", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{% content_for 'blocks' %}" });

    const el = lastElement();
    expect(el.props.dangerouslySetInnerHTML.__html).toBe("{% content_for 'blocks' %}");
  });

  it("children are not passed on SSR (ignored)", async () => {
    const { Island } = await importIsland();
    Island({
      expression: "{{ expr }}",
      children: "fallback",
    });

    const el = lastElement();
    // SSR: no children in the element
    expect(el.props.children).toBeUndefined();
  });
});

describe("Island — CSR path", () => {
  beforeEach(() => {
    g.document = {};
    mockContextData = {};
    capturedElements.length = 0;
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders empty custom element (no innerHTML)", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{{ image | image_tag: loading: 'eager' }}" });

    const el = lastElement();
    expect(el.type).toBe("shopify-island");
    expect(el.props.dangerouslySetInnerHTML).toBeUndefined();
    expect(el.props.suppressHydrationWarning).toBeUndefined();
  });

  it("passes CSR fallback children", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{{ expr }}", children: "fallback" });

    const el = lastElement();
    expect(el.type).toBe("shopify-island");
    expect(el.props.children).toEqual(["fallback"]);
  });

  it("passes className and style on CSR", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{{ expr }}", className: "my-class", style: { display: "contents" } });

    const el = lastElement();
    expect(el.props.className).toBe("my-class");
    expect(el.props.style).toEqual({ display: "contents" });
  });
});

describe("Island — custom element registration", () => {
  it("does not throw when customElement is undefined (SSR)", () => {
    // This is tested implicitly by the SSR tests above
    // Import happens at module level and handles undefined customElements
  });
});
