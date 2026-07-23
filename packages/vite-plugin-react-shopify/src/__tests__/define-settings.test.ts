import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import {
  compileShopifyReference,
  createCheckboxSetting,
  createImageSetting,
  createTextSetting,
  type SettingDescriptor,
} from "../contract";
import { bridgeId } from "../runtime/bridge";
import { defineSettings } from "../runtime/defineSettings";
import { LiquidDataProvider } from "../runtime/provider";

const globalState = globalThis as any;

const countSetting = {
  kind: "number",
  schema: { type: "number", label: "Count", default: 3 },
  defaultValue: 3,
} as const satisfies SettingDescriptor<{
  type: "number";
  label: "Count";
  default: 3;
}>;

const sizeSetting = {
  kind: "range",
  schema: { type: "range", label: "Size", min: 0, max: 10, default: 4 },
  defaultValue: 4,
} as const satisfies SettingDescriptor<{
  type: "range";
  label: "Size";
  min: 0;
  max: 10;
  default: 4;
}>;

const sidebarSetting = {
  kind: "header",
  schema: { type: "header", content: "Content" },
} as const satisfies SettingDescriptor<{
  type: "header";
  content: "Content";
}>;

describe("defineSettings", () => {
  beforeEach(() => {
    globalState.document = undefined;
    globalState.__shopify_ssg_liquid_track = new Set<string>();
    globalState.__shopify_ssg_tracked = new Map<string, any>();
  });

  afterEach(() => {
    delete globalState.document;
    delete globalState.__shopify_ssg_liquid_track;
    delete globalState.__shopify_ssg_tracked;
  });

  it("builds an aggregate descriptor contract with schema, refs, and typed props", () => {
    const settings = defineSettings("section", {
      title: createTextSetting({ label: "Title", default: "Hello" }),
      image: createImageSetting({ label: "Image" }),
      visible: createCheckboxSetting({ label: "Visible", default: true }),
      count: countSetting,
      size: sizeSetting,
      details: sidebarSetting,
    });

    expect(settings.schema).toEqual([
      { type: "text", label: "Title", default: "Hello", id: "title" },
      { type: "image_picker", label: "Image", id: "image" },
      { type: "checkbox", label: "Visible", default: true, id: "visible" },
      { type: "number", label: "Count", default: 3, id: "count" },
      { type: "range", label: "Size", min: 0, max: 10, default: 4, id: "size" },
      { type: "header", content: "Content" },
    ]);
    expect(
      Object.fromEntries(
        Object.entries(settings.refs).map(([key, ref]) => [key, compileShopifyReference(ref)]),
      ),
    ).toEqual({
      title: "section.settings.title",
      image: "section.settings.image",
      visible: "section.settings.visible",
      count: "section.settings.count",
      size: "section.settings.size",
    });

    expectTypeOf<ReturnType<typeof settings.useProps>>().toEqualTypeOf<{
      title: string;
      image: string;
      visible: boolean;
      count: number;
      size: number;
    }>();
    type Props = ReturnType<typeof settings.useProps>;
    type SidebarExcluded = "details" extends keyof Props ? false : true;
    const sidebarExcluded: SidebarExcluded = true;
    expect(sidebarExcluded).toBe(true);
  });

  it("tracks every input setting during SSG and returns Liquid placeholders", () => {
    const settings = defineSettings("section", {
      title: createTextSetting({ label: "Title" }),
      visible: createCheckboxSetting({ label: "Visible" }),
      count: countSetting,
      details: sidebarSetting,
    });
    let props: ReturnType<typeof settings.useProps> | undefined;

    function Example() {
      props = settings.useProps();
      return createElement("div", null, props.title);
    }

    renderToStaticMarkup(createElement(Example));

    expect(props).toEqual({
      title: "{{ section.settings.title }}",
      visible: "{{ section.settings.visible }}",
      count: "{{ section.settings.count }}",
    });
    expect(globalState.__shopify_ssg_tracked).toEqual(
      new Map([
        ["section.settings.title", { expression: "section.settings.title" }],
        [
          bridgeId("section.settings.visible", {
            expression: "section.settings.visible",
            type: "boolean",
          }),
          { expression: "section.settings.visible", type: "boolean" },
        ],
        [
          bridgeId("section.settings.count", {
            expression: "section.settings.count",
            type: "number",
          }),
          { expression: "section.settings.count", type: "number" },
        ],
      ]),
    );
  });

  it("reads client bridge values and coerces checkbox, number, and range settings", () => {
    globalState.document = {};
    const settings = defineSettings("block", {
      title: createTextSetting({ label: "Title", default: "Fallback" }),
      visible: createCheckboxSetting({ label: "Visible", default: true }),
      count: countSetting,
      size: sizeSetting,
    });
    const bridgeData = {
      "block.settings.title": "Hero",
      [bridgeId("block.settings.visible", {
        expression: "block.settings.visible",
        type: "boolean",
      })]: "false",
      [bridgeId("block.settings.count", {
        expression: "block.settings.count",
        type: "number",
      })]: "12.5",
      [bridgeId("block.settings.size", {
        expression: "block.settings.size",
        type: "number",
      })]: "7",
    };
    let props: ReturnType<typeof settings.useProps> | undefined;

    function Example() {
      props = settings.useProps();
      return null;
    }

    renderToStaticMarkup(
      createElement(LiquidDataProvider, { value: bridgeData }, createElement(Example)),
    );

    expect(props).toEqual({ title: "Hero", visible: false, count: 12.5, size: 7 });
  });

  it("preserves the readonly array schema compatibility path", () => {
    const schema = [
      { type: "text", id: "title", label: "Title" },
      { type: "header", content: "Content" },
    ] as const;
    const settings = defineSettings("section", schema);

    expect(settings.schema).toBe(schema);
    expect(compileShopifyReference(settings.refs.title)).toBe("section.settings.title");
    expect("useProps" in settings).toBe(false);

    expect(compileShopifyReference(settings.refs.title)).toBe("section.settings.title");
  });
});
