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
    useLayoutEffect: vi.fn(),
    createElement: vi.fn((type: any, props: any) => {
      const el = { type, props };
      capturedElements.push(el);
      return el;
    }),
    memo: vi.fn((Comp: any, compare: any) => Comp),
  };
});

async function importBlockSlot() {
  return await import("../runtime/BlockSlot");
}

function lastElement(): any {
  return capturedElements[capturedElements.length - 1];
}

describe("BlockSlot — SSR path", () => {
  beforeEach(() => {
    g.document = undefined;
    capturedElements.length = 0;
    for (const key of Object.keys(liquidData)) delete liquidData[key];
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders <shopify-block-slot> with content_for expression", async () => {
    const { BlockSlot } = await importBlockSlot();
    BlockSlot({});

    const el = lastElement();
    expect(el.type).toBe("shopify-block-slot");
    expect(el.props.dangerouslySetInnerHTML.__html).toBe("{% content_for 'blocks' %}");
    expect(el.props.suppressHydrationWarning).toBe(true);
  });

  it("emits data-ssg-i='__blocks__' for pre-capture", async () => {
    const { BlockSlot } = await importBlockSlot();
    BlockSlot({});

    const el = lastElement();
    expect(el.props["data-ssg-i"]).toBe("__blocks__");
  });

  it("passes className and style", async () => {
    const { BlockSlot } = await importBlockSlot();
    BlockSlot({ className: "slot-class", style: { padding: "8px" } });

    const el = lastElement();
    expect(el.props.className).toBe("slot-class");
    expect(el.props.style).toEqual({ padding: "8px" });
  });
});

describe("BlockSlot — client path", () => {
  beforeEach(() => {
    g.document = {};
    capturedElements.length = 0;
    for (const key of Object.keys(liquidData)) delete liquidData[key];
  });

  afterEach(() => {
    delete g.document;
  });

  it("renders captured block DOM on client", async () => {
    liquidData.__ssg_islands = { __blocks__: "<div data-ssg-component=\"child\"></div>" };

    const { BlockSlot } = await importBlockSlot();
    BlockSlot({});

    const el = lastElement();
    expect(el.props["data-ssg-i"]).toBe("__blocks__");
    expect(el.props.dangerouslySetInnerHTML.__html).toBe("<div data-ssg-component=\"child\"></div>");
  });

  it("passes ref for useLayoutEffect restoration", async () => {
    const { BlockSlot } = await importBlockSlot();
    BlockSlot({});

    const el = lastElement();
    expect(el.props.ref).toBeDefined();
  });
});
