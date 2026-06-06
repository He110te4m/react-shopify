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

function buildVideoTagParams(opts: {
  imageSize?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}): string {
  const parts: string[] = [];
  if (opts.imageSize) parts.push(`image_size: '${opts.imageSize}'`);
  if (opts.autoplay) parts.push("autoplay: true");
  if (opts.loop) parts.push("loop: true");
  if (opts.muted) parts.push("muted: true");
  if (opts.controls) parts.push("controls: true");
  return parts.join(", ");
}

/**
 * Renders a Shopify-hosted video using the Liquid
 * {@code video_tag} filter.
 *
 * Uses the unified <Island> primitive — on SSR the Liquid expression is
 * rendered inside a custom element. On CSR the element is empty,
 * preserving the Liquid-rendered <video> DOM intact.
 */
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
  const { isSSR, track } = useShopifyContext();

  const videoTagParams = useMemo(
    () => buildVideoTagParams({ imageSize, autoplay, loop, muted, controls }),
    [imageSize, autoplay, loop, muted, controls],
  );

  const expression = useMemo(() => {
    if (!isSSR) return "";
    track(media);
    const tagPart = videoTagParams
      ? ` | video_tag: ${videoTagParams}`
      : " | video_tag";
    return `{{ ${media}${tagPart} }}`;
  }, [isSSR, media, videoTagParams, track]);

  if (!expression && !isSSR) return null;

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
