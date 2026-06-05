import { useContext, useMemo } from "react";
import { LiquidDataContext } from "./provider";

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
  /**
   * Crop position for the {@code image_url} filter.
   * Only meaningful when **both** {@link width} and {@link height} are set.
   */
  crop?: ImageCrop;

  // ── image_tag filter params ──────────────────────────────────────────

  /** Alt text ({@code image_tag} {@code alt} param). */
  alt?: string;
  /**
   * {@code image_tag} {@code loading} param ({@code "lazy"} | {@code "eager"}).
   *
   * When **not explicitly set**, inferred from {@code section.index}:
   * - {@code section.index < 4} → {@code "eager"}
   * - otherwise → {@code "lazy"}
   */
  loading?: ImageLoading;
  /**
   * {@code image_tag} {@code fetchpriority} param ({@code "high"} | {@code "low"} | {@code "auto"}).
   *
   * When **not explicitly set**, inferred from {@code section.index}:
   * - {@code section.index < 4} → {@code "high"}
   * - {@code 4 ≤ section.index < 8} → {@code "medium"}
   * - otherwise → {@code "low"}
   */
  fetchPriority?: ImageFetchPriority;
  /** {@code image_tag} {@code decoding} param ({@code "async"} | {@code "sync"} | {@code "auto"}). */
  decoding?: ImageDecoding;
  /**
   * {@code image_tag} {@code preload} param.
   *
   * When **not explicitly set**, inferred from {@code section.index}:
   * - {@code section.index < 4} → {@code true}
   * - otherwise → {@code false}
   *
   * When {@code true}, Shopify sends a {@code Link} HTTP header for preloading.
   * Does **not** affect the HTML {@code <img>} tag itself.
   */
  preload?: boolean;

  /** {@code image_tag} {@code width} — HTML {@code width} attribute on the {@code <img>} tag. */
  tagWidth?: number;
  /** {@code image_tag} {@code height} — HTML {@code height} attribute on the {@code <img>} tag. */
  tagHeight?: number;
  /** {@code image_tag} {@code sizes} — HTML {@code sizes} attribute. */
  sizes?: string;
  /** {@code image_tag} {@code widths} — custom {@code srcset} widths (e.g. {@code "200, 300, 400"}). */
  widths?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

/**
 * Build the {@code image_tag} filter param string.
 * {@code loading}, {@code fetchPriority}, and {@code preload} accept
 * Liquid variable **names** (e.g. {@code "_simg_load_0"}) when auto-loading
 * is active — they are output bare (no quotes) so Liquid substitutes the
 * variable value at render time.
 */
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
  const parts: string[] = [];
  if (opts.alt !== undefined) parts.push(`alt: '${opts.alt.replace(/'/g, "\\'")}'`);
  if (opts.loading) {
    // User literal: quoted  /  Liquid variable: bare (starts with _img_)
    parts.push(
      opts.loading.startsWith("_img_")
        ? `loading: ${opts.loading}`
        : `loading: '${opts.loading}'`,
    );
  }
  if (opts.fetchPriority) {
    parts.push(
      opts.fetchPriority.startsWith("_img_")
        ? `fetchpriority: ${opts.fetchPriority}`
        : `fetchpriority: '${opts.fetchPriority}'`,
    );
  }
  if (opts.decoding) parts.push(`decoding: '${opts.decoding}'`);
  if (opts.preload) {
    // true (user literal)  /  Liquid variable name
    parts.push(
      opts.preload === "true"
        ? "preload: true"
        : opts.preload.startsWith("_img_")
          ? `preload: ${opts.preload}`
          : `preload: true`,
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

/**
 * Per-section cached auto-load Liquid variable names.
 *
 * The SSG renderer creates a **new** {@code __shopify_ssg_liquid_track} Set
 * for each entry it renders.  We use the Set reference as a signal that
 * we've crossed into a new section / block / snippet — only then do we
 * emit a fresh {@code {% assign %}} block and bump the counter.
 *
 * All {@link ShopifyImage} instances within the **same** section share the
 * same Liquid variables because {@code section.index} is identical for them.
 */
let _lastTracker: Set<string> | null = null;
let _autoVarId = 0;
let _cachedAutoVars: {
  loadVar: string;
  fetchVar: string;
  preVar: string;
} | null = null;

function getAutoLoadVars(): {
  loadVar: string;
  fetchVar: string;
  preVar: string;
} | null {
  const isSSR = typeof (globalThis as any).document === "undefined";
  if (!isSSR) return null;

  const tracker = (globalThis as any).__shopify_ssg_liquid_track as
    | Set<string>
    | undefined;

  // New section boundary — generate fresh variables
  if (tracker && tracker !== _lastTracker) {
    _lastTracker = tracker;

    const id = _autoVarId++;
    const lv = `_img_ld_${id}`;
    const fv = `_img_fp_${id}`;
    const pv = `_img_pl_${id}`;

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

    const blocks = (globalThis as any).__shopify_ssg_liquid_blocks as
      | string[]
      | undefined;
    if (blocks) blocks.push(code);

    if (tracker) tracker.add("section.index");

    _cachedAutoVars = { loadVar: lv, fetchVar: fv, preVar: pv };
  }

  return _cachedAutoVars;
}

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Renders a Shopify-hosted image using the Liquid
 * {@code image_url | image_tag} pipeline.
 *
 * When {@code loading}, {@code fetchPriority}, or {@code preload} are not
 * explicitly set, defaults are inferred from {@code section.index}
 * (eager/high for first 4 sections, medium for next 4, lazy/low beyond that).
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
  const data = useContext(LiquidDataContext) as Record<string, any>;
  const isSSR = typeof (globalThis as any).document === "undefined";

  // ── auto-loading: emit Liquid variables + resolve client-side defaults ──
  const needAuto =
    loading === undefined ||
    fetchPriority === undefined ||
    preload === undefined;

  const autoVars = useMemo(
    () => (needAuto ? getAutoLoadVars() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Client-side defaults based on section.index from the JSON bridge
  function resolveClientLoading(): ImageLoading | undefined {
    if (loading !== undefined) return loading;
    if (isSSR) return undefined;
    const idx = Number(data?.["section.index"]);
    if (Number.isNaN(idx)) return "lazy";
    return idx < EAGER_THRESHOLD ? "eager" : "lazy";
  }

  function resolveClientFetchPriority(): ImageFetchPriority | undefined {
    if (fetchPriority !== undefined) return fetchPriority;
    if (isSSR) return undefined;
    const idx = Number(data?.["section.index"]);
    if (Number.isNaN(idx)) return "low";
    if (idx < EAGER_THRESHOLD) return "high";
    if (idx < MEDIUM_THRESHOLD) return "medium";
    return "low";
  }

  // ── build filter param strings ───────────────────────────────────────
  const imageUrlParams = useMemo(
    () => buildImageUrlParams({ width, height, crop }),
    [width, height, crop],
  );

  const imageTagParams = useMemo(() => {
    // Use auto Liquid variables ONLY for params the user didn't explicitly set
    const effectiveLoad = loading ?? autoVars?.loadVar;
    const effectiveFetch = fetchPriority ?? autoVars?.fetchVar;
    const effectivePre =
      preload !== undefined
        ? preload
          ? "true"
          : undefined
        : autoVars?.preVar;

    return buildImageTagParams({
      alt,
      loading: effectiveLoad,
      fetchPriority: effectiveFetch,
      decoding,
      preload: effectivePre,
      tagWidth,
      tagHeight,
      sizes,
      widths,
    });
  }, [alt, loading, fetchPriority, decoding, preload, autoVars, tagWidth, tagHeight, sizes, widths]);

  // ── compute inner HTML ───────────────────────────────────────────────
  const innerHtml = useMemo(() => {
    if (isSSR) {
      const tracker = (globalThis as any).__shopify_ssg_liquid_track as
        | Set<string>
        | undefined;
      if (tracker) tracker.add(image);

      const urlPart = imageUrlParams
        ? ` | image_url: ${imageUrlParams}`
        : "";

      const tagPart = imageTagParams
        ? ` | image_tag: ${imageTagParams}`
        : "";

      return `{{ ${image}${urlPart}${tagPart} }}`;
    }

    const src = Object.prototype.hasOwnProperty.call(data, image)
      ? data[image]
      : undefined;
    if (!src) return "";

    const effectiveLoad = resolveClientLoading();
    const effectiveFetch = resolveClientFetchPriority();

    const attrs: string[] = [`src="${esc(String(src))}"`];
    if (alt) attrs.push(`alt="${esc(alt)}"`);
    if (tagWidth != null) attrs.push(`width="${tagWidth}"`);
    if (tagHeight != null) attrs.push(`height="${tagHeight}"`);
    if (effectiveLoad) attrs.push(`loading="${effectiveLoad}"`);
    if (effectiveFetch) attrs.push(`fetchpriority="${effectiveFetch}"`);
    if (decoding) attrs.push(`decoding="${decoding}"`);
    if (sizes) attrs.push(`sizes="${esc(sizes)}"`);
    return `<img ${attrs.join(" ")}>`;
  }, [
    isSSR,
    image,
    imageUrlParams,
    imageTagParams,
    data,
    alt,
    tagWidth,
    tagHeight,
    loading,
    fetchPriority,
    decoding,
    sizes,
  ]);

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
