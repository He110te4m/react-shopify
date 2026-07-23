import { describe, expect, it } from "vitest";
import type { InferSettings } from "../types/settings";
import {
  createCheckboxSetting,
  createImageSetting,
  createSettingsSchema,
  createTextSetting,
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
    const props: Props = { title: "Hello", image: "", visible: false };
    expect(props.visible).toBe(false);
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
