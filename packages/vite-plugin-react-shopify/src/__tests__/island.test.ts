import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const g = globalThis as any;

const capturedElements: any[] = [];
const liquidData: Record<string, any> = {};
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  capturedElements.length = 0;
  return {
    ...react,
    useContext: vi.fn(() => liquidData),
    useMemo: vi.fn((fn: () => any) => fn()),
    useRef: vi.fn(() => ({ current: null })),
    createElement: vi.fn((type: any, props: any, ...children: any[]) => {
      const el = { type, props: { ...props, children: children.length ? children : undefined } };
      capturedElements.push(el);
      return el;
    }),
    memo: vi.fn((Comp: any, compare: any) => Comp),
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
    g.__shopify_ssg_island_counter = { count: 0 };
    capturedElements.length = 0;
    for (const key of Object.keys(liquidData)) delete liquidData[key];
  });

  afterEach(() => {
    delete g.document;
    delete g.__shopify_ssg_island_counter;
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

  it("renders `data-ssg-i` with auto-incremented key", async () => {
    const { Island } = await importIsland();
    Island({ expression: "{{ a }}" });
    Island({ expression: "{{ b }}" });

    expect(lastElement().props["data-ssg-i"]).toBe("i1");
    expect(capturedElements[0].props["data-ssg-i"]).toBe("i0");
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
  });
});

describe("Island — client path", () => {
  beforeEach(() => {
    g.document = {};
    capturedElements.length = 0;
    for (const key of Object.keys(liquidData)) delete liquidData[key];
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders captured Liquid HTML as innerHTML", async () => {
    liquidData.__ssg_islands = { i0: "<img src=\"hero.jpg\">" };
    liquidData.__ssg_island_counter = { count: 0 };

    const { Island } = await importIsland();
    Island({ expression: "{{ image | image_tag: loading: 'eager' }}" });

    const el = lastElement();
    expect(el.type).toBe("shopify-island");
    expect(el.props["data-ssg-i"]).toBe("i0");
    expect(el.props.dangerouslySetInnerHTML.__html).toBe("<img src=\"hero.jpg\">");
    expect(el.props.suppressHydrationWarning).toBe(true);
  });

  it("increments client island keys from provider counter", async () => {
    liquidData.__ssg_islands = { i0: "<span>a</span>", i1: "<span>b</span>" };
    liquidData.__ssg_island_counter = { count: 0 };

    const { Island } = await importIsland();
    Island({ expression: "{{ a }}" });
    Island({ expression: "{{ b }}" });

    expect(capturedElements[0].props["data-ssg-i"]).toBe("i0");
    expect(capturedElements[0].props.dangerouslySetInnerHTML.__html).toBe("<span>a</span>");
    expect(lastElement().props["data-ssg-i"]).toBe("i1");
    expect(lastElement().props.dangerouslySetInnerHTML.__html).toBe("<span>b</span>");
  });
});
