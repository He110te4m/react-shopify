---
title: ImgWidthAndHeight
description: Checks whether the width and height attributes are set on img tags.
source_url:
  html: >-
    https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks/img-width-and-height
  md: >-
    https://shopify.dev/docs/storefronts/themes/tools/theme-check/checks/img-width-and-height.md
---

# ImgWidthAndHeight

Enforces setting the `width` and `height` attributes on `img` tags, avoiding [cumulative layout shift](https://web.dev/cls/) (CLS).

When width and height attributes aren't set, then the browser doesn't know aspect ratio of the image before it is downloaded. Unless another technique is used to allocate space, the browser considers the image's height to be `0px` until the image is loaded.

This causes the following issues:

* [Layout shift as images start appearing one after the other](https://codepen.io/charlespwd/pen/YzpxPEp?editors=1100). Images push text down the page.

* [Lazy loading breaks](https://codepen.io/charlespwd/pen/abZmqXJ?editors=0111). If all images have a height of `0`, then every image is inside the viewport and is loaded.

  Both of these issues negatively affect the mobile search ranking of stores that are using your theme.

***

## Examples

The following examples contain code snippets that either fail or pass this check.

### ✗ Fail

```liquid
<img alt="cat" src="cat.jpg" />
<img alt="cat" src="cat.jpg" width="100px" height="100px" />
<img alt="{{ image.alt }}" src="{{ image.src }}" />
```

### ✓ Pass

**Note:**

You also need to set the CSS `width` of the `img` for the image to be responsive.

```liquid
<img alt="cat" src="cat.jpg" width="100" height="200" />
<img
  alt="{{ image.alt }}"
  src="{{ image.src }}"
  width="{{ image.width }}"
  height="{{ image.height }}"
/>
```

***

## Options

The following example contains the default configuration for this check:

```yaml
ImgWidthAndHeight:
  enabled: true
  severity: error
```

| Parameter | Description |
| - | - |
| `enabled` | Whether the check is enabled. |
| `severity` | The [severity](https://shopify.dev/themes/tools/theme-check/configuration#check-severity) of the check. |

***

## Disabling this check

It's not recommended to disable this check. However, you can disable the check if you use alternative methods, such as aspect ratio boxes, to avoid content-layout shift without setting the `width` and `height` attributes.

***
