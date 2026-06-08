/**
 * @file `<ShopifyVideo>` — specialized Island for Shopify-hosted videos.
 *
 * Computes a Liquid `{{ media | video_tag: ... }}` expression on the SSG
 * render pass and delegates to `<Island>` for the hydration boundary.
 * On the client, Island's pre-capture mechanism preserves the real
 * `<video>` that Shopify rendered (sources, poster, tracks intact).
 */
import { useMemo } from "react";
import { Island } from "./Island";
import { useShopifyContext } from "./ShopifyContext";

export interface ShopifyVideoProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "dangerouslySetInnerHTML"> {
  media: string;

  imageSize?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

function buildVideoTagParams(o: {
  imageSize?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}): string {
  const parts: string[] = [];
  if (o.imageSize) parts.push(`image_size: '${o.imageSize}'`);
  if (o.autoplay) parts.push("autoplay: true");
  if (o.loop) parts.push("loop: true");
  if (o.muted) parts.push("muted: true");
  if (o.controls) parts.push("controls: true");
  return parts.join(", ");
}

export function ShopifyVideo({
  media,
  imageSize,
  autoplay,
  loop,
  muted,
  controls,
  className,
  style,
  ...rest
}: ShopifyVideoProps) {
  const ctx = useShopifyContext();

  const expression = useMemo(() => {
    if (ctx.phase !== "ssg") return "";
    ctx.track(media);
    const params = buildVideoTagParams({ imageSize, autoplay, loop, muted, controls });
    const tagPart = params ? ` | video_tag: ${params}` : " | video_tag";
    return `{{ ${media}${tagPart} }}`;
  }, [ctx.phase, media, imageSize, autoplay, loop, muted, controls]);

  return (
    <Island
      as="span"
      expression={expression}
      className={className}
      style={{ display: "contents", ...style }}
      {...rest}
    />
  );
}