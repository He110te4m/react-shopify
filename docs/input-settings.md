---
title: Input settings
description: About input setting types.
source_url:
  html: >-
    https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings
  md: >-
    https://shopify.dev/docs/storefronts/themes/architecture/settings/input-settings.md
---

# Input settings

Input settings can hold a value and are configurable by merchants.

Input settings are generally composed of [standard attributes](#standard-attributes), and there are two categories:

* [Basic input settings](#basic-input-settings)
* [Specialized input settings](#specialized-input-settings)

To learn how to access the values of these settings for use in your theme, refer to the [settings overview](https://shopify.dev/docs/storefronts/themes/architecture/settings#access-settings).

**Tip:**

If you want to add informational elements to your settings display, like a heading, then refer to [Sidebar settings](https://shopify.dev/docs/storefronts/themes/architecture/settings/sidebar-settings).

***

## Standard attributes

The following are standard attributes across input settings. However, depending on the input type, there might be extra attributes or some might not apply:

| Attribute | Description | Required |
| - | - | - |
| `type` | The setting type, which can be any of the [basic](#basic-input-settings) or [specialized](#specialized-input-settings) input setting types. | Yes |
| `id` | The setting ID, which is used to access the setting value. | Yes |
| `label` | The setting label, which will show in the theme editor. | Yes |
| `default` | The default value for the setting. | No |
| `info` | An option for informational text about the setting. | No |

***

## Basic input settings

The following are the basic input setting types:

* [checkbox](#checkbox)
* [number](#number)
* [radio](#radio)
* [range](#range)
* [select](#select)
* [text](#text)
* [textarea](#textarea)

***

## checkbox

A setting of type `checkbox` outputs a checkbox field. This setting type can be used for toggling features on and off, such as whether to show an announcement bar.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "checkbox",
  "id": "show_announcement",
  "label": "Show announcement",
  "default": true
}
```

## Output

![checkbox setting](https://shopify.dev/assets/assets/images/themes/settings/basic/checkbox-B9evgs1-.png)

When accessing the value of a `checkbox` type setting, data is returned as a [boolean](https://shopify.dev/docs/api/liquid/basics/types#boolean).

**Note:**

If `default` is unspecified, then the value is `false` by default.

***

## number

A setting of type `number` outputs a single number field. In addition to the [standard attributes](#standard-attributes) of an input setting, `number` type settings have the following attribute:

| Attribute | Description | Required |
| - | - | - |
| `placeholder` | A placeholder value for the input. These values only appear for settings defined in `settings_schema.json`. They don't appear for settings defined in a section's schema. | No |

You can use this setting type to capture a varying numerical value, such as the number of products to show per page on a collection page.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "number",
  "id": "products_per_page",
  "label": "Products per page",
  "default": 20
}
```

## Output

![number setting](https://shopify.dev/assets/assets/images/themes/settings/basic/number-CS1t32hl.png)

When accessing the value of a `number` type setting, data is returned in one of the following formats:

* [A number](https://shopify.dev/docs/api/liquid/basics/types#number).
* [nil](https://shopify.dev/docs/api/liquid/basics/types#nil), if nothing has been entered.

**Caution:**

The `default` attribute is optional. However, the value must be a number and not a string. Failing to adhere results in an error.

***

## radio

A setting of type `radio` outputs a radio option field. In addition to the [standard attributes](#standard-attributes) of an input setting, `radio` type settings have a required `options` attribute that accepts an array of `value` and `label` definitions.

You can use this setting type to capture a multi-option selection, such as the alignment of a header logo.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "radio",
  "id": "logo_alignment",
  "label": "Logo alignment",
  "options": [
    {
      "value": "left",
      "label": "Left"
    },
    {
      "value": "centered",
      "label": "Centered"
    }
  ],
  "default": "left"
}
```

## Output

![radio setting](https://shopify.dev/assets/assets/images/themes/settings/basic/radio-CCoZNBwU.png)

When accessing the value of a `radio` type setting, data is returned as a [string](https://shopify.dev/docs/api/liquid/basics/types#string).

**Note:**

If `default` is unspecified, then the first option is selected by default.

***

## range

A setting of type `range` outputs a range slider field with an input field. In addition to the [standard attributes](#standard-attributes) of an input setting, `range` type settings have the following attributes:

| Attribute | Description | Required |
| - | - | - |
| `min` | The minimum value of the input | Yes |
| `max` | The maximum value of the input | Yes |
| `step` | The increment size between steps of the slider. Defaults to `1` when omitted. | No |
| `unit` | The unit for the input. For example, you can set `px` for a font-size slider. | No |

You can use this setting type to capture a varying numerical value, such as font size.

You can update the `range` value using the provided slider, or by typing a value into the input field:

* If you enter a value that doesn't respect the `step` definition, then the value rounds to the closest step.
* If you enter a value outside of the given `min` and `max`, then the value reverts to the `min` or `max` value accordingly.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "range",
  "id": "font_size",
  "min": 12,
  "max": 24,
  "step": 1,
  "unit": "px",
  "label": "Font size",
  "default": 16
}
```

## Output

![range setting](https://shopify.dev/assets/assets/images/themes/settings/basic/range-aWMy5szy.png)

When accessing the value of a `range` type setting, data is returned as a [number](https://shopify.dev/docs/api/liquid/basics/types#number).

**Caution:**

The `default` attribute is required. The `min`, `max`, `step`, and `default` attributes can't be string values. Failing to adhere results in an error.

***

## select

A setting of type `select` outputs [different selector fields](#selector-fields), depending on certain criteria. In addition to the [standard attributes](#standard-attributes) of an input setting, `select` type settings have the following attributes:

| Attribute | Description | Required |
| - | - | - |
| `options` | Takes an array of `value`/`label` definitions for each option in the drop-down. | Yes |
| `group` | An optional attribute that you can add to each option to create option groups in the drop-down. | No |

### Selector fields

The following criteria render selector fields as either a `DropDown` or a `SegmentedControl`:

| Field | Rendering criteria | Output | | |
| - | - | - | - | - |
| `Dropdown` | * The optional `group` attribute is used.
* More than five options are provided.
* The options are too long and might overflow their container. | ![Selector fields rendered as a field of type DropDown](https://shopify.dev/assets/assets/images/themes/settings/basic/select_dropdown-CUcAaqoR.png) | | |
| `SegmentedControl` | - The optional `group` attribute isn't used.
- Two to five options are provided.
- All options fit within their container and don't overflow. | ![Selector fields rendered as a SegmentedControl field](https://shopify.dev/assets/assets/images/themes/settings/basic/select_segmented_control-DM4rog_O.png) | * The optional `group` attribute isn't used.
* Two to five options are provided.
* All options fit within their container and don't overflow. | ![Selector fields rendered as a SegmentedControl field](https://shopify.dev/assets/assets/images/themes/settings/basic/select_segmented_control-DM4rog_O.png) |

You can use this setting type to capture a multi-option selection, such as the vertical alignment of slideshow text.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "select",
  "id": "vertical_alignment",
  "label": "Vertical alignment",
  "options": [
    {
      "value": "top",
      "label": "Top"
    },
    {
      "value": "middle",
      "label": "Middle"
    },
    {
      "value": "bottom",
      "label": "Bottom"
    }
  ],
  "default": "middle"
}
```

## Output

![select setting](https://shopify.dev/assets/assets/images/themes/settings/basic/select_segmented_control-DM4rog_O.png)

However, if your setting matches the criteria for a drop-down field (`DropDown`) because it has more than five options, then the following output is generated:

## Setting

```json
{
  "type": "select",
  "id": "sizes",
  "label": "Sizes",
  "options": [
    {
      "value": "xs",
      "label": "X-small"
    },
    {
      "value": "s",
      "label": "Small"
    },
    {
      "value": "m",
      "label": "Medium"
    },
    {
      "value": "l",
      "label": "Large"
    },
    {
      "value": "xl",
      "label": "X-large"
    },
    {
      "value": "xxl",
      "label": "XX-large"
    }
  ],
  "default": "m"
}
```

## Output

![select setting](https://shopify.dev/assets/assets/images/themes/settings/basic/select_dropdown-CUcAaqoR.png)

When accessing the value of a `select` type setting, data is returned as a [string](https://shopify.dev/docs/api/liquid/basics/types#string).

**Note:**

If `default` is unspecified, then the first option is selected by default.

***

## text

A setting of type `text` outputs a single-line text field. In addition to the [standard attributes](#standard-attributes) of an input setting, `text` type settings have the following attribute:

| Attribute | Description | Required |
| - | - | - |
| `placeholder` | A placeholder value for the input. These values only appear for settings defined in `settings_schema.json`. They don't appear for settings defined in a section's schema. | No |

You can use this setting type to capture short strings, such as titles.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "text",
  "id": "footer_linklist_title",
  "label": "Heading",
  "default": "Quick links"
}
```

## Output

![text setting](https://shopify.dev/assets/assets/images/themes/settings/basic/text-CAnGUyes.png)

When accessing the value of a `text` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string).
* An [`empty` object](https://shopify.dev/docs/api/liquid/basics/types#emptydrop), if nothing has been entered.

**Tip:**

Settings of type `text` are not updated when switching presets.

***

## textarea

A setting of type `textarea` outputs a multi-line text field. In addition to the [standard attributes](#standard-attributes) of an input setting, `textarea` type settings have the following attribute:

| Attribute | Description | Required |
| - | - | - |
| `placeholder` | A placeholder value for the input. These values only appear for settings defined in `settings_schema.json`. They don't appear for settings defined in a section's schema. | No |

You can use this setting type to capture larger blocks of text, such as messages.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "textarea",
  "id": "home_welcome_message",
  "label": "Welcome message",
  "default": "Welcome to my shop!"
}
```

## Output

![textarea setting](https://shopify.dev/assets/assets/images/themes/settings/basic/textarea-RUfHgDDX.png)

When accessing the value of a `textarea` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string).
* An [`empty` object](https://shopify.dev/docs/api/liquid/basics/types#emptydrop), if nothing has been entered.

***

## Specialized input settings

The following are the specialized input setting types:

* [article](#article)
* [article\_list](#article_list)
* [blog](#blog)
* [collection](#collection)
* [collection\_list](#collection_list)
* [color](#color)
* [color\_background](#color_background)
* [color\_scheme](#color_scheme)
* [color\_scheme\_group](#color_scheme_group)
* [font\_picker](#font_picker)
* [html](#html)
* [image\_picker](#image_picker)
* [inline\_richtext](#inline_richtext)
* [link\_list](#link_list)
* [liquid](#liquid)
* [metaobject](#metaobject)
* [metaobject\_list](#metaobject_list)
* [page](#page)
* [product](#product)
* [product\_list](#product_list)
* [richtext](#richtext)
* [text\_alignment](#text_alignment)
* [url](#url)
* [video](#video)
* [video\_url](#video_url)

***

## article

A setting of type `article` outputs an article picker field that's automatically populated with the available articles for the store. You can use this setting type to capture an article selection, such as the article to feature on the homepage.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "article",
  "id": "article",
  "label": "Article"
}
```

## Output

![article setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/article-CjWR9_o2.png)

When accessing the value of an `article` type setting, data is returned in one of the following formats:

* An [`article` object](https://shopify.dev/docs/api/liquid/objects/article).

To ensure backwards compatibility with [legacy resource-based settings](https://shopify.dev/docs/storefronts/themes/architecture/settings#legacy-resource-based-settings), outputting the setting directly will return the object's handle.

* `blank` if no selection has been made, the selection isn't visible, or the selection no longer exists

**Note:**

Settings of type `article` are not updated when switching presets. `article` settings also don't support the `default` attribute.

***

## article\_​list

A setting of type `article_list` outputs an article picker field that's automatically populated with the available blog articles for the store. You can use this setting type to capture multiple articles, such as a group of articles to feature on the homepage.

**Note:**

You can only choose from articles that are published.

In addition to the [standard attributes](#standard-attributes) of an input setting, `article_list` type settings have the following attributes:

| Attribute | Description | Required |
| - | - | - |
| `limit` | The maximum number of articles that the merchant can select. The default limit, and the maximum limit you can set, is 50. | No |

## Setting

```json
{
  "type": "article_list",
  "id": "featured_articles",
  "label": "Featured articles",
  "limit": 12
}
```

## Output

![article\_list setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/article_list-DsF9KSDO.png)

When accessing the value of an `article_list` type setting, data is returned in one of the following formats:

* An array of [`article` objects](https://shopify.dev/docs/api/liquid/objects/article)

The array supports pagination using the [paginate](https://shopify.dev/docs/api/liquid/tags/paginate#paginate-paginating-setting-arrays) tag. You can also append `.count` to the [setting key](https://shopify.dev/docs/storefronts/themes/architecture/settings#access-settings) to return the number of articles in the array.

* `blank` if no selection has been made, the selection isn't visible, or the selection no longer exists

***

## blog

A setting of type `blog` outputs a blog picker field that's automatically populated with the available blogs for the store. You can use this setting type to capture a blog selection, such as the blog to feature in the sidebar.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "blog",
  "id": "blog",
  "label": "Blog"
}
```

## Output

![blog setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/blog-BVKhA-y3.png)

When accessing the value of a `blog` type setting, data is returned in one of the following formats:

* A [`blog` object](https://shopify.dev/docs/api/liquid/objects/blog).

To ensure backwards compatibility with [legacy resource-based settings](https://shopify.dev/docs/storefronts/themes/architecture/settings#legacy-resource-based-settings), outputting the setting directly will return the object's handle.

* `blank`, if either no selection has been made or the selection no longer exists.

**Note:**

Settings of type `blog` are not updated when switching presets. `blog` settings also don't support the `default` attribute.

***

## collection

A setting of type `collection` outputs a collection picker field that's automatically populated with the available collections for the store. You can use this setting type to capture a collection selection, such as a collection for featuring products on the homepage.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "collection",
  "id": "collection",
  "label": "Collection"
}
```

## Output

![collection setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/collection-Dbsx6Vk7.png)

When accessing the value of a `collection` type setting, data is returned in one of the following formats:

* A [`collection` object](https://shopify.dev/docs/api/liquid/objects/collection).

To ensure backwards compatibility with [legacy resource-based settings](https://shopify.dev/docs/storefronts/themes/architecture/settings#legacy-resource-based-settings), outputting the setting directly will return the object's handle.

* `blank`, if no selection has been made, the selection isn't visible, or the selection no longer exists.

**Note:**

Settings of type `collection` are not updated when switching presets. `collection` settings also don't support the `default` attribute.

***

## collection\_​list

A setting of type `collection_list` outputs a collection picker field that's automatically populated with the available collections for the store. You can use this setting type to capture multiple collections, such as a group of collections to feature on the homepage.

In addition to the [standard attributes](#standard-attributes) of an input setting, `collection_list` type settings have the following attributes:

| Attribute | Description | Required |
| - | - | - |
| `limit` | The maximum number of collections that the merchant can select. The default limit, and the maximum limit you can set, is 50. | No |

## Setting

```json
{
  "type": "collection_list",
  "id": "collection_list",
  "label": "Collections",
  "limit": 8
}
```

## Output

![collection\_list
setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/collection_list-DnN-pRRN.png)

## Output

![collection\_list setting
selector](https://shopify.dev/assets/assets/images/themes/settings/specialized/collection_list-detail-DsUsWzFl.png)

When accessing the value of a `collection_list` type setting, data is returned in one of the following formats:

* An array of [`collection` objects](https://shopify.dev/docs/api/liquid/objects/collection)

The array supports pagination using the [paginate](https://shopify.dev/docs/api/liquid/tags/paginate#paginate-paginating-setting-arrays) tag. You can also append `.count` to the [setting key](https://shopify.dev/docs/storefronts/themes/architecture/settings#access-settings) to return the number of collections in the array.

* `blank` if no selection has been made, the selection isn't visible, or the selection no longer exists

***

## color

A setting of type `color` outputs a color picker field. You can use this setting type to capture a color selection for various theme elements, such as the body text color.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "color",
  "id": "body_text",
  "label": "Body text",
  "default": "#000000"
}
```

## Output

![color setting picker](https://shopify.dev/assets/assets/images/themes/settings/specialized/color-DQX-ko7V.png)

When accessing the value of a `color` type setting, data is returned in one of the following formats:

* A [`color` object](https://shopify.dev/docs/api/liquid/objects/color).
* `blank`, if no selection has been made.

***

## color\_​background

A setting of type `color_background` outputs a text field for entering [CSS background](https://developer.mozilla.org/en-US/docs/Web/CSS/background) properties. You can use this setting type to capture background settings for various theme elements, such as the store background.

**Caution:**

Settings of type `color_background` do not support image related background properties.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "color_background",
  "id": "background",
  "label": "Background",
  "default": "linear-gradient(#ffffff, #000000)"
}
```

## Output

![color\_background setting
input](https://shopify.dev/assets/assets/images/themes/settings/specialized/color-background-input-WkRtRyyo.png)

When accessing the value of a `color_background` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string).
* An empty string, if nothing has been entered.

***

## color\_​scheme

A setting of type `color_scheme` outputs a picker with all of the available theme color schemes, and a preview of the selected color scheme. Theme color schemes in the picker are defined using the [`color_scheme_group`](#color_scheme_group) setting. You can apply a color scheme to sections, blocks and general theme settings. Color scheme settings aren't supported in app blocks.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "color_scheme",
  "id": "color_scheme",
  "default": "scheme_1",
  "label": "Color scheme"
}
```

## Output

![color scheme setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/color_scheme-COyirGuy.png)

When accessing the value of a `color_scheme` type setting, Shopify returns the selected `color_scheme` object from `color_scheme_group`.

If no value was entered, or the value was invalid, then the default value from `color_scheme` is returned. If the default value is also invalid, then the first `color_scheme` from `color_scheme_group` is returned.

If the theme doesn't have `color_scheme_group` data in `settings_data.json`, then [nil](https://shopify.dev/docs/api/liquid/basics/types#nil) is returned.

***

## color\_​scheme\_​group

A setting of type `color_scheme_group` outputs a color scheme which is composed of the following input setting types:

* `header`

* `color`

* `color_background`

  Color schemes can be added only in `settings_schema.json`.

  For example, the following setting generates the following output:

## Setting

```json
{
  "type": "color_scheme_group",
  "id": "color_schemes",
  "definition": [
    {
      "type": "color",
      "id": "background",
      "label": "t:settings_schema.colors.settings.background.label",
      "default": "#FFFFFF"
    },
    {
      "type": "color_background",
      "id": "background_gradient",
      "label": "t:settings_schema.colors.settings.background_gradient.label",
      "info": "t:settings_schema.colors.settings.background_gradient.info"
    },
    {
      "type": "color",
      "id": "text",
      "label": "t:settings_schema.colors.settings.text.label",
      "default": "#121212"
    },
    {
      "type": "color",
      "id": "button",
      "label": "t:settings_schema.colors.settings.button_background.label",
      "default": "#121212"
    },
    {
      "type": "color",
      "id": "button_label",
      "label": "t:settings_schema.colors.settings.button_label.label",
      "default": "#FFFFFF"
    },
    {
      "type": "color",
      "id": "secondary_button_label",
      "label": "t:settings_schema.colors.settings.secondary_button_label.label",
      "default": "#121212"
    },
    {
      "type": "color",
      "id": "shadow",
      "label": "t:settings_schema.colors.settings.shadow.label",
      "default": "#121212"
    }
  ],
  "role": {
    "text": "text",
    "background": {
      "solid": "background",
      "gradient": "background_gradient"
    },
    "links": "secondary_button_label",
    "icons": "text",
    "primary_button": "button",
    "on_primary_button": "button_label",
    "primary_button_border": "button",
    "secondary_button": "background",
    "on_secondary_button": "secondary_button_label",
    "secondary_button_border": "secondary_button_label"
  }
}
```

## Output

![color\_scheme\_group setting
input](https://shopify.dev/assets/assets/images/themes/settings/specialized/color_scheme_group-COY53K7M.png)

### role

The `role` field outputs a color scheme preview. The color scheme previews are visible to merchants anywhere in the editor where they might pick a color scheme. You can assign roles to your color scheme definitions to map the color scheme to the previews. For example you can assign `role.background` to the `Background` definition. Role uses the following standardized mapping of the `color_scheme_group` definition to the color scheme preview:

| Role | Description | Required? | Gradient? |
| - | - | - | - |
| `role.background` | Renders the background color of the preview | Yes | Optional |
| `role.text` | Renders the text color of the preview | Yes | No |
| `role.primary_button``role.secondary_button` | Render the 1st and 2nd pills in the preview | Yes | Optional |
| `role.primary_button_border``role.secondary_button_border` | Render the 1st and 2nd pills' border in the preview | Yes | No |
| `role.on_primary_button``role.on_secondary_button` | Aren't used in the preview | Yes | No |
| `role.links``role.icons` | Aren't used in the preview | Yes | No |

## Output

![color scheme
mapping](https://shopify.dev/assets/assets/images/themes/settings/specialized/color-scheme-mapping-WPDqcLK2.png)

***

## font\_​picker

A setting of type `font_picker` outputs a font picker field that's automatically populated with fonts from the [Shopify font library](https://shopify.dev/docs/storefronts/themes/architecture/settings/fonts#shopify-font-library). This library includes system fonts and a selection of Google Fonts.

You can use this setting type to capture a font selection for various theme elements, such as the base heading font.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "font_picker",
  "id": "heading_font",
  "label": "Heading font",
  "default": "helvetica_n4"
}
```

## Output

![font setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/font_picker-Dbgudqpj.png)

When accessing the value of a `font_picker` type setting, data is returned as a [`font` object](https://shopify.dev/docs/api/liquid/objects/font).

**Caution:**

The `default` attribute is required. Failing to include it will result in an error. You can find the possible values through the [available fonts](https://shopify.dev/docs/storefronts/themes/architecture/settings/fonts#available-fonts) in the Shopify font library.

***

## html

A setting of type `html` outputs a multi-line text field that accepts HTML markup. In addition to the [standard attributes](#standard-attributes) of an input setting, `html` type settings have the following attribute:

| Attribute | Description | Required |
| - | - | - |
| `placeholder` | A placeholder value for the input | No |

You can use this setting type to capture custom blocks of HTML content, such as a video embed.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "html",
  "id": "video_embed",
  "label": "Video embed"
}
```

## Output

![html setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/html-faprOLP2.png)

The following HTML tags will be automatically removed:

* `<html>`
* `<head>`
* `<body>`

When accessing the value of an `html` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string) that contains the entered content.
* An [`empty` object](https://shopify.dev/docs/api/liquid/basics/types#emptydrop), if nothing has been entered.

**Note:**

Unclosed HTML tags are automatically closed when the setting is saved. This may not line up with your intended formatting, so be sure to verify your input.

***

## image\_​picker

A setting of type `image_picker` outputs an image picker field that's automatically populated with the available images from the [Files](https://help.shopify.com/manual/shopify-admin/productivity-tools/file-uploads) section of Shopify admin, and has the option to upload new images. Merchants also have an opportunity to enter alt text and select a [focal point](#image-focal-points) for their image.

You can use this setting type to capture an image selection, such as logos, favicons, and slideshow images.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "image_picker",
  "id": "image_with_text_image",
  "label": "Image"
}
```

## Output

![image setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/image-C-_MRJC_.png)

## Output (Preview and edit modal)

![image setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/image_editor-DSyUvApw.png)

When accessing the value of an `image_picker` type setting, data is returned in one of the following formats:

* An [`image` object](https://shopify.dev/docs/api/liquid/objects/image).
* [nil](https://shopify.dev/docs/api/liquid/basics/types#nil), if either no selection has been made or the selection no longer exists.

**Note:**

Settings of type `image_picker` are not updated when switching presets. `image_picker` settings also don't support the `default` attribute.

### Image focal points

Images selected using an `image_picker` setting support focal points. A focal point is a position in an image that the merchant wants to remain in view as the image is cropped and adjusted by the theme. Focal points can be set in the theme editor `image_picker` setting, or from the **Files** page.

To make sure that your theme respects the focal point of the image, do the following:

* Render your images using the [`image_tag`](https://shopify.dev/docs/api/liquid/filters/image_tag) filter.
* Consider positioning images within containers using `object-fit: cover`.

Using `image_tag`, if a focal point was provided, then an `object-position` style is added to the image tag, with the value set to the focal point.

## Input

```liquid
{{ section.settings.image_with_text_image | image_url: width: 1500 | image_tag }}
```

## Output

```html
<img src="/content/assets/images/octopus-tentacle.jpg?v=1&width=1500" alt="My alt text"
 srcset="octopus-tentacle.jpg?v=1&width=352 352w,
         octopus-tentacle.jpg?v=1&width=832 832w,
         octopus-tentacle.jpg?v=1&width=1200 1200w"
 width="1500" height="1875"
 style={{objectPosition: '25% 10%'}} />
```

If you need to override the `object-position` style for a specific use case, then pass a `style: object-position: inherit;` property to the `image_tag` filter.

**Tip:**

You can also access the focal point data using [`image.presentation.focal_point`](https://shopify.dev/docs/api/liquid/objects/image_presentation#image_presentation-focal_point).

***

## inline\_​richtext

A setting of type `inline_richtext` outputs HTML markup that isn't wrapped in paragraph tags (`<p>`). The setting includes the following basic formatting options:

* Bold
* Italic
* Link

**Note:**

The `inline_richtext` setting doesn't support the following features:

* Line breaks (`<br />`)
* An underline option in the rich text editor. Merchants can underline text using the `Command+U` or `Control+U` keyboard shortcut.

You can use this setting type to capture formatted text content, such as introductory brand content on the homepage.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "inline_richtext",
  "id": "inline",
  "default": "my <i>inline</i> <b>text</b>",
  "label": "Inline rich text"
}
```

## Output

![inline\_richtext
setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/inline_rich_text-DGwTH9yH.png)

When accessing the value of an `inline_richtext` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string) that contains the entered content.
* An [`empty` object](https://shopify.dev/docs/api/liquid/basics/types#emptydrop), if nothing has been entered.

***

## link\_​list

A setting of type `link_list` outputs a menu picker field that's automatically populated with the available menus for the store. You can use this setting type to capture a menu selection, such as the menu to use for footer links.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "link_list",
  "id": "menu",
  "label": "Menu"
}
```

## Output

![link\_list setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/linklist-p6TUcGXd.png)

When accessing the value of a `link_list` type setting, data is returned in one of the following formats:

* A [`linklist` object](https://shopify.dev/docs/api/liquid/objects/linklist).
* `blank`, if either no selection has been made or the selection no longer exists.

**Note:**

Accepted values for the `default` attribute are `main-menu` and `footer`.

***

## liquid

A setting of type `liquid` outputs a multi-line text field that accepts HTML and [limited](#limitations) Liquid markup. You can use this setting type to capture custom blocks of HTML and Liquid content, such as a product-specific message. Merchants can also use a liquid setting to add the code needed to integrate certain types of [apps](https://shopify.dev/docs/apps/build/online-store) into your theme.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "liquid",
  "id": "battery_message",
  "label": "Battery message",
  "default": "{% if product.tags contains 'battery' %}This product can only be shipped by ground.{% else %}This product can be shipped by ground or air.{% endif %}"
}
```

## Output

![liquid setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/liquid-DT_qkQts.png)

When accessing the value of a `liquid` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string) that contains the entered content.
* An [`empty` object](https://shopify.dev/docs/api/liquid/basics/types#emptydrop), if nothing has been entered.

**Note:**

The `default` attribute is optional. However, if you use it, then its value can't be an empty string. Additionally, unclosed HTML tags are automatically closed when the setting is saved. This might not line up with your intended formatting, so be sure to verify your input.

### Limitations

Settings of type `liquid` don't have access to the following liquid objects/tags:

* [layout](https://shopify.dev/docs/api/liquid/tags/layout)
* [content\_for\_header](https://shopify.dev/docs/api/liquid/objects/content_for_header)
* [content\_for\_layout](https://shopify.dev/docs/api/liquid/objects/content_for_layout)
* [content\_for\_index](https://shopify.dev/docs/api/liquid/objects/content_for_index)
* [section](https://shopify.dev/docs/api/liquid/tags/section)
* [javascript](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags#javascript)
* [stylesheet](https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags#stylesheet)
* [schema](https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema)
* [settings](https://shopify.dev/docs/api/liquid/objects/settings)

However, `liquid` settings can access the following:

* [Global Liquid objects](https://shopify.dev/docs/api/liquid/objects)
* Template specific objects like `collection`, `product`, etc. (within their respective templates)
* Standard Liquid [tags](https://shopify.dev/docs/api/liquid/tags) and [filters](https://shopify.dev/docs/api/liquid/filters)

If your content includes non-existent, or empty, Liquid tags, then they will be rendered as empty strings. For example, the following setting generates the following output:

## Setting

```json
{
  "type": "liquid",
  "id": "message",
  "label": "Message",
  "default": "Hello {{ not_a_real_tag }}, welcome to our shop."
}
```

## Output

```text
Hello , welcome to our shop.
```

**Caution:**

Content entered in these settings can't exceed 50kb. Saving content that either exceeds this limit or includes invalid Liquid will result in an error.

***

## metaobject

A `metaobject` setting allows merchants to select metaobject entries of a designated type through a picker interface. This setting supports both standard and custom metaobject definitions:

1. Standard metaobject definitions: These are readily available in the theme editor and do not need to be pre-enabled on a shop. An example of a standard metaobject is the `product_review` metaobject. [Learn more](https://shopify.dev/docs/apps/build/custom-data/metaobjects/list-of-standard-definitions) about current standard metaobject definitions.
2. Custom metaobject definitions: These are designed for custom themes and require the metaobject definition to already exist. Note that custom metaobject definitions are not allowed in themes listed on the Theme Store. An example of a custom metaobject would be an `author` metaobject.

Additionally, apps can utilize `metaobject` settings with their own app-owned metaobject definitions and entries.

`metaobject` type settings have the following attributes, in addition to the [standard attributes](#standard-attributes) of an input setting:

| Attribute | Description | Required |
| - | - | - |
| `metaobject_type` | The metaobject type allowed by the picker. | Yes |

A `metaobject` setting value can be either of the following formats:

* A [`metaobject` object](https://shopify.dev/docs/api/liquid/objects/metaobject)
* `blank` if no selection has been made, the selection isn't visible, or the selection no longer exists

### Standard metaobject example

## Setting

```json
{
  "type": "metaobject",
  "id": "my_material_setting",
  "label": "Material",
  "metaobject_type": "shopify--material"
}
```

## Output

![metaobject setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/metaobject-DXxYCQH5.png)

### Custom metaobject example

## Setting

```json
{
  "type": "metaobject",
  "id": "my_artist",
  "label": "Artist",
  "metaobject_type": "artist"
}
```

## Output

![metaobject
setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/custom_metaobject-BBO5BXOS.png)

### Limitations

* Only a single `metaobject_type` is supported at a time, as defined in the setting's schema.
* In order for themes to meet [publishing guidelines](https://shopify.dev/docs/storefronts/themes/store/requirements#14-settings) for the Shopify Theme Store, only standard definitions can be used. Custom or app owned definitions cannot be used.
* When referencing a **custom** or **app created** `metaobject_type`, the definition must exist on the shop and be available to the storefront. If either condition isn't met, the setting will show an error in the theme editor.

![metaobject-missing-definition](https://shopify.dev/assets/assets/images/themes/settings/specialized/metaobject_error--DgB5sV3.png)

### Usage in apps

Apps can leverage `metaobject` settings in their app blocks or embeds to enhance theme functionality. By creating metaobject definitions under [reserved namespaces](https://shopify.dev/docs/apps/build/custom-data/ownership#create-metaobject-definitions-with-reserved-types), apps can offer advanced configuration options for merchants while maintaining a simple user experience.

Consider an app designed to improve brand storytelling through customer testimonials. Here's a potential implementation:

1. Create a custom metaobject definition named `Customer Testimonial`
2. Use app blocks to collect customer data on a post-purchase page
3. Write this data as `Customer Testimonial` metaobject entries
4. Provide a `Testimonial` app block with a `metaobject` setting that uses the `Customer Testimonial` metaobject type
5. Access the `metaobject` setting value in Liquid to display the selected testimonials

## Setting

```json
{
  "type": "metaobject",
  "id": "my_testimonial",
  "label": "Testimonial",
  "metaobject_type": "app--<appid>-testimonial"
}
```

***

## metaobject\_​list

A `metaobject_list` setting allows merchants to select multiple metaobject entries of a designated type through a picker interface. This setting supports both standard and custom metaobject definitions:

1. Standard metaobject definitions: These are readily available in the theme editor and do not need to be pre-enabled on a shop. An example of a standard metaobject is the `product_review` metaobject. [Learn more](https://shopify.dev/docs/apps/build/custom-data/metaobjects/list-of-standard-definitions) about current standard metaobject definitions.
2. Custom metaobject definitions: These are designed for custom themes and require the metaobject definition to already exist. Note that custom metaobject definitions are not allowed in themes listed on the Theme Store. An example of a custom metaobject would be an `author` metaobject.

Additionally, apps can utilize `metaobject_list` settings with their own app-owned metaobject definitions and entries.

`metaobject_list` type settings have the following attributes, in addition to the [standard attributes](#standard-attributes) of an input setting:

| Attribute | Description | Required |
| - | - | - |
| `limit` | The maximum number of metaobject entries that the merchant can select. The default limit, and the maximum limit you can set, is 50. | No |
| `metaobject_type` | The metaobject type allowed by the picker. | Yes |

A `metaobject_list` setting value can be either of the following formats:

* An array of [`metaobject` objects](https://shopify.dev/docs/api/liquid/objects/metaobject)

  The array supports pagination using the [paginate](https://shopify.dev/docs/api/liquid/tags/paginate#paginate-paginating-setting-arrays) tag. You can also append `.count` to the [setting key](https://shopify.dev/docs/storefronts/themes/architecture/settings#access-settings) to return the number of metaobject entries in the array.

* `blank` if no selection has been made, the selection isn't visible, or the selection no longer exists

### Standard metaobject list example

## Setting

```json
{
  "type": "metaobject_list",
  "id": "my_material_list_setting",
  "label": "Materials",
  "metaobject_type": "shopify--material",
  "limit": 12
}
```

## Output

![metaobject\_list
setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/metaobject_list-BRPogIV_.png)

### Custom metaobject list example

## Setting

```json
{
  "type": "metaobject_list",
  "id": "my_artist_list",
  "label": "Artists",
  "metaobject_type": "artist",
  "limit": 12
}
```

## Output

![metaobject\_list
setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/custom_metaobject_list-D_xebCul.png)

### Limitations

* Only a single `metaobject_type` is supported at a time, as defined in the setting's schema.
* In order for themes to meet [publishing guidelines](https://shopify.dev/docs/storefronts/themes/store/requirements#14-settings) for the Shopify Theme Store, custom or app owned definitions cannot be used.
* When referencing a **custom** or **app created** `metaobject_type`, the definition must exist on the shop and be available to the storefront. If either condition isn't met, the setting will show an error in the theme editor.

![metaobject-list-missing-definition](https://shopify.dev/assets/assets/images/themes/settings/specialized/metaobject_error--DgB5sV3.png)

### Usage in apps

Apps can leverage `metaobject_list` settings in their app blocks or embeds to enhance theme functionality. By creating metaobject definitions under [reserved namespaces](https://shopify.dev/docs/apps/build/custom-data/ownership#create-metaobject-definitions-with-reserved-types), apps can offer advanced configuration options for merchants while maintaining a simple user experience. Using the same [example](#metaobject) as above, a `Testimonials` app-block could allow merchants to select multiple testimonial entries. The `metaobject_list` setting would make this implementation possible.

## Setting

```json
{
  "type": "metaobject_list",
  "id": "my_testimonial_list",
  "label": "Testimonials list",
  "metaobject_type": "app--<appid>-testimonial",
  "limit": 12
}
```

***

## page

A setting of type `page` outputs a page picker field that's automatically populated with the available pages for the store. You can use this setting type to capture a page selection, such as the page to feature content for in a size-chart display.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "page",
  "id": "page",
  "label": "Page"
}
```

## Output

![page setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/page-DY3jU_ff.png)

When accessing the value of a `page` type setting, data is returned in one of the following formats:

* A [`page` object](https://shopify.dev/docs/api/liquid/objects/page).

To ensure backwards compatibility with [legacy resource-based settings](https://shopify.dev/docs/storefronts/themes/architecture/settings#legacy-resource-based-settings), outputting the setting directly will return the object's handle.

* `blank`, if no selection has been made, the selection isn't visible, or the selection no longer exists.

**Note:**

Settings of type `page` are not updated when switching presets. `page` settings also don't support the `default` attribute.

***

## product

A setting of type `product` outputs a product picker field that's automatically populated with the available products for the store. You can use this setting type to capture a product selection, such as the product to feature on the homepage.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "product",
  "id": "product",
  "label": "Product"
}
```

## Output

![product setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/product-BU89p2xJ.png)

When accessing the value of a `product` type setting, data is returned in one of the following formats:

* A [`product` object](https://shopify.dev/docs/api/liquid/objects/product).

To ensure backwards compatibility with [legacy resource-based settings](https://shopify.dev/docs/storefronts/themes/architecture/settings#legacy-resource-based-settings), outputting the setting directly will return the object's handle.

* `blank` if no selection has been made, the selection isn't visible, or the selection no longer exists

**Note:**

Settings of type `product` are not updated when switching presets. `product` settings also don't support the `default` attribute.

***

## product\_​list

A setting of type `product_list` outputs a product picker field that's automatically populated with the available products for the store. You can use this setting type to capture multiple products, such as a group of products to feature on the homepage.

**Note:**

You can only choose from products that are published to the online store and have an `active` status.

In addition to the [standard attributes](#standard-attributes) of an input setting, `product_list` type settings have the following attributes:

| Attribute | Description | Required |
| - | - | - |
| `limit` | The maximum number of products that the merchant can select. The default limit, and the maximum limit you can set, is 50. | No |

## Setting

```json
{
  "type": "product_list",
  "id": "product_list",
  "label": "Products",
  "limit": 12
}
```

## Output

![product\_list setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/product_list-CLbCBDvu.png)

When accessing the value of a `product_list` type setting, data is returned in one of the following formats:

* An array of [`product` objects](https://shopify.dev/docs/api/liquid/objects/product)

The array supports pagination using the [paginate](https://shopify.dev/docs/api/liquid/tags/paginate#paginate-paginating-setting-arrays) tag. You can also append `.count` to the [setting key](https://shopify.dev/docs/storefronts/themes/architecture/settings#access-settings) to return the number of products in the array.

* `blank` if no selection has been made, the selection isn't visible, or the selection no longer exists

***

## richtext

A setting of type `richtext` outputs a multi-line text field with the following basic formatting options:

* Bold
* Italic
* Underline
* Link
* Paragraph
* Unordered list

**Note:**

No underline option appears in the rich text component. Merchants can underline text using the `Command+U` or `Control+U` keyboard shortcut.

You can use this setting type to capture formatted text content, such as introductory brand content on the homepage.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "richtext",
  "id": "paragraph",
  "label": "Paragraph"
}
```

## Output

![richtext setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/richtext-CdgN-WUR.png)

When accessing the value of a `richtext` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string) that contains the entered content.
* An [`empty` object](https://shopify.dev/docs/api/liquid/basics/types#emptydrop), if nothing has been entered.

### default

The `default` attribute isn't required. However, if it's used, then only `<p>` or `<ul>` tags are supported as top-level elements.

The following HTML tags are also supported inside the parent `<p>` tag:

* `<p>`
* `<br />`
* `<strong>`
* `<b>`
* `<em>`
* `<i>`
* `<u>`
* `<span>`
* `<a>`

**Caution:**

Failing to wrap the `default` content in `<p>` or `<ul>` tags will result in an error.

***

## text\_​alignment

A setting of type `text_alignment` outputs a `SegmentedControl` field with icons. In addition to the [standard attributes](#standard-attributes) of an input setting, `text_alignment` type settings support the following attribute:

| Attribute | Description | Required |
| - | - | - |
| Default | The initially selected value. Can be one of `left`, `right`, `center`. The default value is `left`. | No |

The following default values can't be changed to a different value:

| Value | Icon presentation |
| - | - |
| Left | ![](https://shopify.dev/assets/assets/images/themes/settings/specialized/text-alignment-left-AHfF-UoS.png) |
| Right | ![](https://shopify.dev/assets/assets/images/themes/settings/specialized/text-alignment-right-BKQxxcoT.png) |
| Center | ![](https://shopify.dev/assets/assets/images/themes/settings/specialized/text-alignment-center-DQNO6R-L.png) |

For example, the following setting generates the following output:

## Setting

```json
{
   "type": "text_alignment",
   "id": "alignment",
   "label": "Text alignment",
   "default": "center"
}
```

## Output

![text\_alignment
setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/text-alignment-DidZPfbN.png)

When you access the value of a `text_alignment` type setting, data is returned as a [string](https://shopify.dev/docs/api/liquid/basics/types#string).

**Note:**

If you don't specify the default attribute, then the `left` option is selected by default.

***

## url

A setting of type `url` outputs a URL entry field where you can manually enter external URLs and relative paths. It also has a picker that's automatically populated with the following available resources for the shop:

* Articles
* Blogs
* Collections
* Pages
* Products

You can use this setting type to capture a URL selection, such as the URL to use for a slideshow button link.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "url",
  "id": "button_link",
  "label": "Button link"
}
```

## Output

![url setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/url-Cf6Ul31I.png)

When accessing the value of a `url` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string) that contains the selected URL.
* [nil](https://shopify.dev/docs/api/liquid/basics/types#nil), if nothing has been entered.

**Note:**

Accepted values for the `default` attribute are `/collections` and `/collections/all`.

***

## video

A setting of type `video` outputs a video picker that's automatically populated with the available videos from the [Files](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/file-uploads) section of the Shopify admin. The merchant also has the option to upload new videos.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "video",
  "id": "video",
  "label": "A Shopify-hosted video"
}
```

## Output

![video setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/video-BCdU4jwk.png)

The `video` type setting also accepts metafields of type `file_reference` as a [dynamic source](https://shopify.dev/docs/storefronts/themes/architecture/settings/dynamic-sources).

When accessing the value of a `video` type setting, data is returned in one of the following formats:

* A [`video` object](https://shopify.dev/docs/api/liquid/objects#video).

* [nil](https://shopify.dev/docs/api/liquid/basics/types#nil), if:

  * no selection has been made,
  * the selection no longer exists, or
  * the selection is a `file_reference` metafield that points to a non-video file.

**Note:**

`video` settings don't support the `default` attribute.

***

## video\_​url

A setting of type `video_url` outputs a URL entry field. In addition to the [standard attributes](#standard-attributes) of an input setting, `video_url` type settings have the following attributes:

| Attribute | Description | Required |
| - | - | - |
| `accept` | Takes an array of accepted video providers. Valid values are `youtube`, `vimeo`, or both. | Yes |
| `placeholder` | A placeholder value for the input. | No |

This setting type can be used to capture a video URL from YouTube and/or Vimeo, such as the URL for a static video to show in the product description.

For example, the following setting generates the following output:

## Setting

```json
{
  "type": "video_url",
  "id": "product_description_video",
  "label": "Product description video",
  "accept": [
    "youtube",
    "vimeo"
  ]
}
```

## Output

![video\_url setting](https://shopify.dev/assets/assets/images/themes/settings/specialized/video_url-DL7LUFoz.png)

When accessing the value of a `video_url` type setting, data is returned in one of the following formats:

* A [string](https://shopify.dev/docs/api/liquid/basics/types#string) that contains the entered URL.
* [nil](https://shopify.dev/docs/api/liquid/basics/types#nil), if nothing has been entered.

Additionally, there's access to the `id` and `type` (YouTube or Vimeo) of the video.

For example, assuming you're using [this video](https://www.youtube.com/watch?v=_9VUPq3SxOc) with the above setting, the following Liquid generates the following output:

## Setting

```liquid
ID: {{ settings.product_description_video.id }}
Type: {{ settings.product_description_video.type }}
```

## Output

```text
ID: _9VUPq3SxOc
Type: youtube
```

***

## Create links

You can [add links](https://www.markdownguide.org/basic-syntax/#links) to the `info` settings attribute by enclosing the link text in brackets and then following it immediately with the URL in parentheses.

For example, the following setting generates the following output:

## Settings

```json
{
  "type": "checkbox",
  "id": "enable_payment_button",
  "label": "Show dynamic checkout button",
  "info": "Each customer will see their preferred payment method [Learn more](https://help.shopify.com/manual/online-store/dynamic-checkout)",
  "default": true
}
```

## Output

![link setting](https://shopify.dev/assets/assets/images/themes/create_links_input-BXi7gx1l.png)

***
