---
title: 'Liquid filters: video_tag'
description: Generates an HTML `<video>` tag for a given video.
source_url:
  html: 'https://shopify.dev/docs/api/liquid/filters/video_tag'
  md: 'https://shopify.dev/docs/api/liquid/filters/video_tag.md'
api_name: liquid
---

# video\_​tag

```oobleck
media | video_tag
```

returns [string](https://shopify.dev/docs/api/liquid/basics#string)

Generates an HTML `<video>` tag for a given video.

***

**Note:** When \<code>mp4\</code> videos are uploaded, Shopify generates an \<code>m3u8\</code> file as an additional \<a href="/docs/api/liquid/objects/video\_source">\<code>\<span class="PreventFireFoxApplyingGapToWBR">video\<wbr/>\_source\</span>\</code>\</a>. An \<code>m3u8\</code> file enables video players to leverage \<a href="https://developer.apple.com/streaming/">HTTP live streaming (HLS)\</a>, resulting in an optimized video experience based on the user\&#39;s internet connection. If loop is enabled, the HLS source is not used in order to allow progessive download to cache the video.\</p> \<p>If the \<code>m3u8\</code> source isn\&#39;t supported, then the player falls back to the \<code>mp4\</code> source.

***

##### Code

```liquid
{% for media in product.media %}
  {% if media.media_type == 'video' %}
    {{ media | video_tag }}
  {% endif %}
{% endfor %}
```

##### Data

```json
{
  "product": {
    "media": [
      {
        "media_type": "external_video"
      },
      {
        "media_type": "video"
      }
    ]
  }
}
```

##### Output

```html
<video playsinline="playsinline" preload="metadata" aria-label="Potion beats" poster="//polinas-potent-potions.myshopify.com/cdn/shop/products/4edc28a708b7405093a927cebe794f1a.thumbnail.0000000_small.jpg?v=1655255324"><source src="//polinas-potent-potions.myshopify.com/cdn/shop/videos/c/vp/4edc28a708b7405093a927cebe794f1a/4edc28a708b7405093a927cebe794f1a.HD-1080p-7.2Mbps.mp4?v=0" type="video/mp4"><img src="//polinas-potent-potions.myshopify.com/cdn/shop/products/4edc28a708b7405093a927cebe794f1a.thumbnail.0000000_small.jpg?v=1655255324"></video>
```

## Rendered output

### image\_size

```oobleck
media | video_tag: image_size: string
```

Specify the dimensions of the video's poster image in pixels.

##### Code

```liquid
{% for media in product.media %}
  {% if media.media_type == 'video' %}
    {{ media | video_tag: image_size: '400x' }}
  {% endif %}
{% endfor %}
```

##### Data

```json
{
  "product": {
    "media": [
      {
        "media_type": "external_video"
      },
      {
        "media_type": "video"
      }
    ]
  }
}
```

##### Output

```html
<video playsinline="playsinline" preload="metadata" aria-label="Potion beats" poster="//polinas-potent-potions.myshopify.com/cdn/shop/products/4edc28a708b7405093a927cebe794f1a.thumbnail.0000000_400x.jpg?v=1655255324"><source src="//polinas-potent-potions.myshopify.com/cdn/shop/videos/c/vp/4edc28a708b7405093a927cebe794f1a/4edc28a708b7405093a927cebe794f1a.HD-1080p-7.2Mbps.mp4?v=0" type="video/mp4"><img src="//polinas-potent-potions.myshopify.com/cdn/shop/products/4edc28a708b7405093a927cebe794f1a.thumbnail.0000000_400x.jpg?v=1655255324"></video>
```

## Rendered output

### Optional supported HTML5 attributes

```oobleck
media | video_tag: attribute: boolean
```

`video_tag` supports all [HTML5 video attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video#attributes). For example:

| Attribute | Value |
| - | - |
| `autoplay` | Whether to automatically play the video after it’s loaded. Accepted values:`true`,`false` |
| `loop` | Whether to loop the video. Accepted values:`true`,`false` |
| `muted` | Whether to mute the video’s audio. Accepted values:`true`,`false` |
| `controls` | Whether a user can control the video playback. Accepted values:`true`,`false` |

##### Code

```liquid
{% for media in product.media %}
  {% if media.media_type == 'video' %}
    {{ media | video_tag: autoplay: true, loop: true, muted: true, controls: true }}
  {% endif %}
{% endfor %}
```

##### Data

```json
{
  "product": {
    "media": [
      {
        "media_type": "external_video"
      },
      {
        "media_type": "video"
      }
    ]
  }
}
```

##### Output

```html
<video playsinline="playsinline" autoplay="autoplay" loop="loop" muted="muted" controls="controls" preload="metadata" aria-label="Potion beats" poster="//polinas-potent-potions.myshopify.com/cdn/shop/products/4edc28a708b7405093a927cebe794f1a.thumbnail.0000000_small.jpg?v=1655255324"><source src="//polinas-potent-potions.myshopify.com/cdn/shop/videos/c/vp/4edc28a708b7405093a927cebe794f1a/4edc28a708b7405093a927cebe794f1a.HD-1080p-7.2Mbps.mp4?v=0" type="video/mp4"><img src="//polinas-potent-potions.myshopify.com/cdn/shop/products/4edc28a708b7405093a927cebe794f1a.thumbnail.0000000_small.jpg?v=1655255324"></video>
```

## Rendered output
