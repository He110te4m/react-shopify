import { useMemo } from "react";
import { Island } from "./Island";
import { useShopifyContext } from "./ShopifyContext";

export type ImageLoading = "lazy" | "eager";
export type ImageFetchPriority = "high" | "low" | "medium" | "auto";
export type ImageDecoding = "async" | "sync" | "auto";
export type ImageCrop = "top" | "center" | "bottom" | "left" | "right";

export interface ShopifyImageProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "dangerouslySetInnerHTML"> {
  /** Liquid expression (e.g. {@code "section.settings.hero_image"}). */
  image: string;

  // ── image_url filter params ──────────────────────────────────────────

  /** CDN resize width passed to the {@code image_url} filter. */
  width?: number;
  /** CDN resize height passed to the {@code image_url} filter. */
  height?: number;
  /** Crop position for the {@code image_url} filter. */
  crop?: ImageCrop;

  // ── image_tag filter params ──────────────────────────────────────────

  /** Alt text ({@code image_tag} {@code alt} param). */
  alt?: string;
  /**
   * {@code image_tag} {@code loading} param.
   * When **not set**, inferred from {@code section.index}
   * ({@code < 4} → eager, otherwise lazy).
   */
  loading?: ImageLoading;
  /**
   * {@code image_tag} {@code fetchpriority} param.
   * When **not set**, inferred from {@code section.index}
   * ({@code < 4} → high, {@code 4-7} → medium, {@code ≥ 8} → low).
   */
  fetchPriority?: ImageFetchPriority;
  /** {@code image_tag} {@code decoding} param. */
  decoding?: ImageDecoding;
  /**
   * {@code image_tag} {@code preload} param.
   * When **not set**, inferred from {@code section.index}
   * ({@code < 4} → true).
   */
  preload?: boolean;

  /** {@code image_tag} {@code width} — HTML {@code width} attribute. */
  tagWidth?: number;
  /** {@code image_tag} {@code height} — HTML {@code height} attribute. */
  tagHeight?: number;
  /** {@code image_tag} {@code sizes} — HTML {@code sizes} attribute. */
  sizes?: string;
  /** {@code image_tag} {@code widths} — custom {@code srcset} widths. */
  widths?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildImageUrlParams(opts: {
  width?: number;
  height?: number;
  crop?: string;
}): string {
  const parts: string[] = [];
  if (opts.width != null) parts.push(`width: ${opts.width}`);
  if (opts.height != null) parts.push(`height: ${opts.height}`);
  if (opts.crop) parts.push(`crop: '${opts.crop}'`);
  return parts.join(", ");
}

function buildImageTagParams(opts: {
  alt?: string;
  loading?: string;
  fetchPriority?: string;
  decoding?: string;
  preload?: string;
  tagWidth?: number;
  tagHeight?: number;
  sizes?: string;
  widths?: string;
}): string {
  const L = (v: string) =>
    v.startsWith("img_") ? v : `'${v}'`;

  const parts: string[] = [];
  if (opts.alt !== undefined) parts.push(`alt: '${opts.alt.replace(/'/g, "\\'")}'`);
  if (opts.loading) parts.push(`loading: ${L(opts.loading)}`);
  if (opts.fetchPriority) parts.push(`fetchpriority: ${L(opts.fetchPriority)}`);
  if (opts.decoding) parts.push(`decoding: '${opts.decoding}'`);
  if (opts.preload) {
    parts.push(
      opts.preload === "true" ? "preload: true"
      : opts.preload.startsWith("img_") ? `preload: ${opts.preload}`
      : "preload: true",
    );
  }
  if (opts.tagWidth != null) parts.push(`width: ${opts.tagWidth}`);
  if (opts.tagHeight != null) parts.push(`height: ${opts.tagHeight}`);
  if (opts.sizes) parts.push(`sizes: '${opts.sizes.replace(/'/g, "\\'")}'`);
  if (opts.widths) parts.push(`widths: '${opts.widths}'`);
  return parts.join(", ");
}

// ── Auto-loading helpers ───────────────────────────────────────────────────

const EAGER_THRESHOLD = 4;
const MEDIUM_THRESHOLD = 8;

let _autoVarId = 0;
let _cachedAutoVars: { loadVar: string; fetchVar: string; preVar: string } | null = null;

function getAutoLoadVars(inject: (code: string) => void, track: (path: string) => void): typeof _cachedAutoVars | null {
  const id = _autoVarId++;
  const lv = `img_ld_${id}`;
  const fv = `img_fp_${id}`;
  const pv = `img_pl_${id}`;

  const code = `{%- liquid
  assign ${lv} = 'lazy'
  assign ${fv} = 'low'
  assign ${pv} = false
  if section.index < ${EAGER_THRESHOLD}
    assign ${lv} = 'eager'
    assign ${fv} = 'high'
    assign ${pv} = true
  elsif section.index < ${MEDIUM_THRESHOLD}
    assign ${fv} = 'medium'
  endif
-%}`;

  inject(code);
  track("section.index");
  _cachedAutoVars = { loadVar: lv, fetchVar: fv, preVar: pv };
  return _cachedAutoVars;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Renders a Shopify-hosted image using the Liquid
 * {@code image_url | image_tag} pipeline.
 *
 * Uses the unified <Island> primitive — on SSR the Liquid expression is
 * rendered inside a custom element so Shopify processes it. On CSR the
 * element is empty, preserving the Liquid-rendered DOM (with optimized
 * srcset/sizes) intact.
 */
export function ShopifyImage({
  image,
  width,
  height,
  crop,
  alt = "",
  loading,
  fetchPriority,
  decoding,
  preload,
  tagWidth,
  tagHeight,
  sizes,
  widths,
  className,
  style,
  ...rest
}: ShopifyImageProps) {
  const { isSSR, inject, track } = useShopifyContext();

  // ── auto-loading ─────────────────────────────────────────────────────
  const needAuto =
    isSSR &&
    (loading === undefined ||
     fetchPriority === undefined ||
     preload === undefined);

  const autoVars = useMemo(
    () => (needAuto ? getAutoLoadVars(inject, track) : null),
    [needAuto],
  );

  // ── build Liquid params ──────────────────────────────────────────────
  const imageUrlParams = useMemo(
    () => buildImageUrlParams({ width, height, crop }),
    [width, height, crop],
  );

  const imageTagParams = useMemo(() => {
    const effLoad = loading ?? autoVars?.loadVar;
    const effFetch = fetchPriority ?? autoVars?.fetchVar;
    const effPre =
      preload !== undefined
        ? preload ? "true" : undefined
        : autoVars?.preVar;

    return buildImageTagParams({
      alt, loading: effLoad, fetchPriority: effFetch,
      decoding, preload: effPre,
      tagWidth, tagHeight, sizes, widths,
    });
  }, [alt, loading, fetchPriority, decoding, preload, autoVars, tagWidth, tagHeight, sizes, widths]);

  // ── build expression ─────────────────────────────────────────────────
  const expression = useMemo(() => {
    if (!isSSR) return "";
    track(image);
    const urlPart = imageUrlParams ? ` | image_url: ${imageUrlParams}` : "";
    const tagPart = imageTagParams ? ` | image_tag: ${imageTagParams}` : "";
    return `{{ ${image}${urlPart}${tagPart} }}`;
  }, [isSSR, image, imageUrlParams, imageTagParams, track]);

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
