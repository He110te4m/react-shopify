import { describe, expect, expectTypeOf, it } from "vitest";
import type { InferSettings, ShopifySettingObject } from "../types/settings";
import {
  createArticleListSetting,
  createArticleSetting,
  createBlogSetting,
  createCheckboxSetting,
  createCollectionListSetting,
  createCollectionSetting,
  createColorBackgroundSetting,
  createColorSchemeGroupSetting,
  createColorSchemeSetting,
  createColorSetting,
  createFontPickerSetting,
  createHeaderSetting,
  createHtmlSetting,
  createImageSetting,
  createInlineRichTextSetting,
  createLineBreakSetting,
  createLinkListSetting,
  createLiquidSetting,
  createMetaobjectListSetting,
  createMetaobjectSetting,
  createNumberSetting,
  createPageSetting,
  createParagraphSetting,
  createProductListSetting,
  createProductSetting,
  createRadioSetting,
  createRangeSetting,
  createRichTextSetting,
  createSelectSetting,
  createSettingsSchema,
  createTextAlignmentSetting,
  createTextSetting,
  createTextareaSetting,
  createUrlSetting,
  createVideoSetting,
  createVideoUrlSetting,
  validateSettingSchemas,
} from "../contract";

describe("setting builders", () => {
  it("creates a descriptor without requiring an id", () => {
    expect(createTextSetting({ label: "Title", default: "Hello" })).toEqual({
      kind: "text",
      schema: { type: "text", label: "Title", default: "Hello" },
      defaultValue: "Hello",
    });
  });

  it("builds text, image, and checkbox schemas with key-derived ids", () => {
    const schema = createSettingsSchema({
      title: createTextSetting({ label: "Title", default: "Hello" }),
      image: createImageSetting({ label: "Image" }),
      visible: createCheckboxSetting({ label: "Visible", default: true }),
    });

    expect(schema).toEqual([
      { type: "text", label: "Title", default: "Hello", id: "title" },
      { type: "image_picker", label: "Image", id: "image" },
      { type: "checkbox", label: "Visible", default: true, id: "visible" },
    ]);

    type Props = InferSettings<typeof schema>;
    const props: Props = { title: "Hello", image: null, visible: false };
    expect(props.visible).toBe(false);
  });

  it("provides builders for every declared setting schema type", () => {
    const schema = createSettingsSchema({
      article: createArticleSetting({ label: "Article" }),
      articles: createArticleListSetting({ label: "Articles" }),
      blog: createBlogSetting({ label: "Blog" }),
      checkbox: createCheckboxSetting({ label: "Checkbox" }),
      collection: createCollectionSetting({ label: "Collection" }),
      collections: createCollectionListSetting({ label: "Collections" }),
      color: createColorSetting({ label: "Color" }),
      background: createColorBackgroundSetting({ label: "Background" }),
      colorScheme: createColorSchemeSetting({ label: "Color scheme" }),
      schemes: createColorSchemeGroupSetting({
        label: "Schemes",
        definition: [{ type: "color", id: "text", label: "Text", default: "#000000" }],
        role: { text: "text", background: "text" },
      }),
      font: createFontPickerSetting({ label: "Font", default: "helvetica_n4" }),
      html: createHtmlSetting({ label: "HTML" }),
      image: createImageSetting({ label: "Image" }),
      inline: createInlineRichTextSetting({ label: "Inline" }),
      menu: createLinkListSetting({ label: "Menu" }),
      liquid: createLiquidSetting({ label: "Liquid" }),
      metaobject: createMetaobjectSetting({ label: "Metaobject", metaobject_type: "author" }),
      metaobjects: createMetaobjectListSetting({
        label: "Metaobjects",
        metaobject_type: "author",
      }),
      number: createNumberSetting({ label: "Number" }),
      page: createPageSetting({ label: "Page" }),
      product: createProductSetting({ label: "Product" }),
      products: createProductListSetting({ label: "Products" }),
      radio: createRadioSetting({
        label: "Radio",
        options: [{ value: "a", label: "A" }],
      }),
      range: createRangeSetting({ label: "Range", min: 0, max: 10, default: 5 }),
      richtext: createRichTextSetting({ label: "Rich text" }),
      select: createSelectSetting({
        label: "Select",
        options: [{ value: "a", label: "A" }],
      }),
      alignment: createTextAlignmentSetting({ label: "Alignment" }),
      text: createTextSetting({ label: "Text" }),
      textarea: createTextareaSetting({ label: "Textarea" }),
      url: createUrlSetting({ label: "URL" }),
      video: createVideoSetting({ label: "Video" }),
      videoUrl: createVideoUrlSetting({ label: "Video URL", accept: ["youtube"] }),
      header: createHeaderSetting({ content: "Header" }),
      paragraph: createParagraphSetting({ content: "Paragraph" }),
      break: createLineBreakSetting(),
    });

    expect(schema.map((setting) => setting.type)).toEqual([
      "article",
      "article_list",
      "blog",
      "checkbox",
      "collection",
      "collection_list",
      "color",
      "color_background",
      "color_scheme",
      "color_scheme_group",
      "font_picker",
      "html",
      "image_picker",
      "inline_richtext",
      "link_list",
      "liquid",
      "metaobject",
      "metaobject_list",
      "number",
      "page",
      "product",
      "product_list",
      "radio",
      "range",
      "richtext",
      "select",
      "text_alignment",
      "text",
      "textarea",
      "url",
      "video",
      "video_url",
      "header",
      "paragraph",
      "line_break",
    ]);
    expect(schema[0]).toMatchObject({ id: "article" });
    expect(schema.at(-1)).toEqual({ type: "line_break" });
  });

  it("infers object and object-list values instead of strings", () => {
    const schema = createSettingsSchema({
      product: createProductSetting({ label: "Product" }),
      products: createProductListSetting({ label: "Products" }),
      url: createUrlSetting({ label: "URL" }),
    });
    type Props = InferSettings<typeof schema>;

    expectTypeOf<Props["product"]>().toEqualTypeOf<ShopifySettingObject | null>();
    expectTypeOf<Props["products"]>().toEqualTypeOf<ShopifySettingObject[]>();
    expectTypeOf<Props["url"]>().toEqualTypeOf<string>();
  });

  it("keeps an explicit id instead of the object key", () => {
    const schema = createSettingsSchema({
      heading: createTextSetting({ id: "hero_heading", label: "Heading" }),
    });

    expect(schema).toEqual([{ type: "text", id: "hero_heading", label: "Heading" }]);
  });
});

describe("setting schema validator", () => {
  it("reports duplicate and invalid ids", () => {
    const errors = validateSettingSchemas([
      { type: "text", id: "title", label: "Title" },
      { type: "checkbox", id: "title", label: "Visible" },
      { type: "text", id: "has space", label: "Invalid" },
      { type: "text", id: "", label: "Empty" },
    ]);

    expect(errors.map((error) => error.code)).toEqual(["duplicate_id", "invalid_id", "empty_id"]);
    expect(errors[0].message).toContain('Duplicate setting id "title"');
    expect(errors[1].message).toContain("letters, numbers, and underscores");
  });

  it("reports empty string and default type errors", () => {
    const errors = validateSettingSchemas([
      { type: "text", id: "title", label: "Title", default: "" },
      { type: "checkbox", id: "visible", label: "Visible", default: "yes" },
      { type: "number", id: "count", label: "Count", default: "1" },
      { type: "text", id: "body", label: "Body", default: false },
    ]);

    expect(errors.map((error) => error.code)).toEqual([
      "empty_string_default",
      "invalid_default_type",
      "invalid_default_type",
      "invalid_default_type",
    ]);
    expect(errors[0].message).toContain("empty string default");
    expect(errors[1].message).toContain("default must be a boolean");
    expect(errors[2].message).toContain("default must be a number");
    expect(errors[3].message).toContain("default must be a string");
  });

  it("rejects invalid schema input through the builder", () => {
    expect(() =>
      createSettingsSchema({
        "bad id": createTextSetting({ label: "Invalid" }),
      }),
    ).toThrow(/Setting schema validation failed/);

    expect(() =>
      createSettingsSchema({
        title: createTextSetting({ default: "" as never, label: "Title" }),
      }),
    ).toThrow(/empty string default/);

    expect(() =>
      createSettingsSchema({
        first: createTextSetting({ id: "same", label: "First" }),
        second: createCheckboxSetting({ id: "same", label: "Second" }),
      }),
    ).toThrow(/Duplicate setting id "same"/);
  });
});
