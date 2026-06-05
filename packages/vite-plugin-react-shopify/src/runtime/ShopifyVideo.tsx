import { useMemo } from "react";
import { useLiquidContext, trackExpr, esc } from "./utils";

export interface ShopifyVideoProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "dangerouslySetInnerHTML"> {
  media: string;

  // ── video_tag filter params ──────────────────────────────────────────

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

interface VideoSource {
  format: string;
  mime_type: string;
  url: string;
}

interface VideoData {
  sources?: VideoSource[];
  preview_image?: { src: string };
  alt?: string | null;
  media_type?: string;
}

function buildClientVideo(video: VideoData, opts: ShopifyVideoProps): string {
  const parts: string[] = [];

  if (opts.autoplay) parts.push("autoplay");
  if (opts.loop) parts.push("loop");
  if (opts.muted) parts.push("muted");
  if (opts.controls) parts.push("controls");

  // Match video_tag defaults: playsinline + preload=metadata
  let videoAttrs = 'playsinline="playsinline" preload="metadata"';
  if (parts.length) videoAttrs += " " + parts.join(" ");

  const srcs = (video.sources ?? [])
    .map((s) => `<source src="${esc(s.url)}" type="${esc(s.mime_type)}">`)
    .join("");

  // video_tag auto-generates a fallback <img> from the poster
  const poster = video.preview_image?.src;
  if (poster) {
    videoAttrs += ` poster="${esc(poster)}"`;
  }

  return `<video ${videoAttrs}>${srcs}</video>`;
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
  const { isSsr, get } = useLiquidContext();

  const videoTagParams = useMemo(
    () => buildVideoTagParams({ imageSize, autoplay, loop, muted, controls }),
    [imageSize, autoplay, loop, muted, controls],
  );

  const innerHtml = useMemo(() => {
    if (isSsr) {
      trackExpr(media);
      const tagPart = videoTagParams
        ? ` | video_tag: ${videoTagParams}`
        : " | video_tag";
      return `{{ ${media}${tagPart} }}`;
    }

    const raw: any = get(media);
    if (!raw) return "";

    if (typeof raw === "object" && raw !== null) {
      return buildClientVideo(raw as VideoData, {
        media, autoplay, loop, muted, controls,
      });
    }

    return `<video src="${esc(String(raw))}"></video>`;
  }, [isSsr, media, videoTagParams, get, autoplay, loop, muted, controls]);

  if (!innerHtml) return null;

  return (
    <span
      className={className}
      style={{ display: "contents", ...style }}
      dangerouslySetInnerHTML={{ __html: innerHtml }}
      suppressHydrationWarning
      {...rest}
    />
  );
}
