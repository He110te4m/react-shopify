---
title: 'Liquid filters: image_tag'
description: >-
  Generates an HTML `<img>` tag for a given
  [`image_url`](/docs/api/liquid/filters/image_url).
source_url:
  html: 'https://shopify.dev/docs/api/liquid/filters/image_tag'
  md: 'https://shopify.dev/docs/api/liquid/filters/image_tag.md'
api_name: liquid
---

# image\_​tag

```oobleck
string | image_tag
```

returns [string](https://shopify.dev/docs/api/liquid/basics#string)

Generates an HTML `<img>` tag for a given [`image_url`](https://shopify.dev/docs/api/liquid/filters/image_url).

By default, `width` and `height` attributes are added to the `<img>` tag based on the dimensions and aspect ratio from the image URL. However, you can override these attributes with the [width](https://shopify.dev/docs/api/liquid/filters/image_tag#image_tag-width) and [height](https://shopify.dev/docs/api/liquid/filters/image_tag#image_tag-height) parameters. If only one parameter is provided, then only that attribute is added.

##### Code

```liquid
{{ product | image_url: width: 200 | image_tag }}
```

##### Output

```html
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200 200w" width="200" height="133">
```

## Rendered output

### Lazy loading

If you don't apply the `preload` attribute to `image_tag`, then `loading` is automatically set to `lazy` for images in sections further down the page. You shouldn't lazy load images above the fold. If the default value doesn't work for your theme, then consider writing your own logic using the `section.index` and `section.location` properties. For more information, refer to the [`section` object](https://shopify.dev/docs/api/liquid/objects/section).

### `image_tag` and focal points

This filter automatically applies a focal point to the image using the `object-position` CSS style, if focal point coordinates are available. You can also access an image's focal point coordinates directly through the [`focal_point`](https://shopify.dev/docs/api/liquid/objects/focal_point) object. [Learn how to set a focal point](https://help.shopify.com/manual/online-store/images/theme-images#set-a-focal-point-on-a-theme-image).

##### Code

```liquid
{{ images['potions-header.png'] | image_url: width: 300 | image_tag }}
```

##### Output

```html
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/potions-header.png?v=1650325393&amp;width=300" alt="" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/potions-header.png?v=1650325393&amp;width=300 300w" width="300" height="173" style="object-position:1.9231% 9.7917%;">
```

## Rendered output

### width

```oobleck
image_url | image_tag: width: number
```

Specify the `width` attribute of the `<img>` tag. You can set the parameter to `nil` to prevent the attribute from being added.

##### Code

```liquid
<!-- With a width -->
{{ product | image_url: width: 400 | image_tag: width: 300 }}

<!-- With the width set to nil -->
{{ product | image_url: width: 400 | image_tag: width: nil }}
```

##### Output

```html
<!-- With a width -->
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=400" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=300 300w, //polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=352 352w" width="300">

<!-- With the width set to nil -->
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=400" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=352 352w">
```

## Rendered output

### height

```oobleck
image_url | image_tag: height: number
```

Specify the `height` attribute of the `<img>` tag. You can set the parameter to `nil` to prevent the attribute from being added.

##### Code

```liquid
<!-- With a height -->
{{ product | image_url: width: 400 | image_tag: height: 300 }}

<!-- With the height set to nil -->
{{ product | image_url: width: 400 | image_tag: height: nil }}
```

##### Output

```html
<!-- With a height -->
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=400" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=352 352w" height="300">

<!-- With the height set to nil -->
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=400" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=352 352w">
```

## Rendered output

### sizes

```oobleck
image_url | image_tag: sizes: string
```

Specify source sizes with the [HTML `sizes` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-sizes).

##### Code

```liquid
{{ product | image_url: width: 200 | image_tag: sizes: '(min-width:1600px) 960px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)' }}
```

##### Output

```html
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200 200w" width="200" height="133" sizes="(min-width:1600px) 960px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)">
```

## Rendered output

### widths

```oobleck
image_url | image_tag: widths: string
```

By default, Shopify generates a `srcset` with a smart set of default widths up to the maximum defined in the image URL. However, you can create your own set of widths.

##### Code

```liquid
{{ product | image_url: width: 600 | image_tag: widths: '200, 300, 400' }}
```

##### Output

```html
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=600" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200 200w, //polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=300 300w, //polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=400 400w" width="600" height="400">
```

## Rendered output

### srcset

```oobleck
image_url | image_tag: srcset: string
```

By default, Shopify generates a `srcset`. However, you can create your own `srcset`. The `srcset` parameter takes precedence over the [`width` parameter](https://shopify.dev/docs/api/liquid/filters/image_tag#image_tag-width). You shouldn't to use the `srcset` parameter unless you want to remove the attribute by setting the parameter to `nil`.

##### Code

```liquid
{{ product | image_url: width: 200 | image_tag: srcset: nil }}
```

##### Output

```html
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200" alt="Health potion" width="200" height="133">
```

## Rendered output

### preload

```oobleck
image_url | image_tag: preload: boolean
```

Specify whether the image should be preloaded.

When `preload` is set to `true`, a resource hint is sent as a [Link HTTP header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link) with a `rel` value of [`preload`](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/preload). The Link header also includes `imagesrcset` and `imagesizes` that match the `srcset` and `sizes` attribute of the tag, where present:

```liquid
Link: <IMAGE_URL>; rel=preload; as=image
Link: <IMAGE_URL>; rel=preload; as=image; imagesrcset=ADDITIONAL_IMAGE_URL 352w; imagesizes=40vw
```

This option doesn't affect the HTML img tag directly.

You should use the preload parameter sparingly. For example, consider preloading only above-the-fold images. To learn more about resource hints in Shopify themes, refer to [Performance best practices for Shopify themes](https://shopify.dev/themes/best-practices/performance#preload-key-resources-defer-or-avoid-loading-others).

### alt

```oobleck
image_url | image_tag: alt: string
```

By default, the `alt` attribute of the `<img>` tag is set to the [media alt text](https://help.shopify.com/manual/products/product-media/add-alt-text), or the resource title for article, collection, line item, product, and variant images. However, you can override this default, or set the value if there's no default.

##### Code

```liquid
{{ product | image_url: width: 200 | image_tag: alt: "My image's alt text" }}
```

##### Output

```html
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200" alt="My image&#39;s alt text" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200 200w" width="200" height="133">
```

## Rendered output

### HTML attributes

```oobleck
image_url | image_tag: attribute: string
```

You can specify [HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attributes) by adding a parameter that matches the attribute name, and the desired value.

##### Code

```liquid
{{ product | image_url: width: 200 | image_tag: class: 'custom-class', loading: 'lazy' }}
```

##### Output

```html
<img src="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200" alt="Health potion" srcset="//polinas-potent-potions.myshopify.com/cdn/shop/files/science-beakers-blue-light-new.jpg?v=1683744744&amp;width=200 200w" width="200" height="133" loading="lazy" class="custom-class">
```

## Rendered output
