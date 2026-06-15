/**
 * @file `<ShopifyImage>` — specialized Island for Shopify CDN images.
 *
 * Computes a Liquid `{{ image | image_url: ... | image_tag: ... }}`
 * expression on the SSG render pass and delegates to `<Island>` for the
 * hydration boundary.  On the client side, the Island's pre-capture
 * mechanism preserves the real `<img>` (with optimized srcset/sizes)
 * that Shopify rendered.
 */
import { useMemo } from "react";
import { GW_BLOCKS } from "../constants/attributes";
import { Island } from "./Island";
import { assignLiquidValue, type LiquidValue, type LiquidValueInput } from "./LiquidValue";
import { useShopifyContext } from "./ShopifyContext";

export type ImageLoading = "lazy" | "eager";
export type ImageFetchPriority = "high" | "low" | "medium" | "auto";
export type ImageDecoding = "async" | "sync" | "auto";
export type ImageCrop = "top" | "center" | "bottom" | "left" | "right";

export interface ShopifyImageProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "dangerouslySetInnerHTML"> {
  /** Liquid expression (e.g. {@code "section.settings.hero_image"}). */
  image: string;

  /** CDN resize width passed to the {@code image_url} filter. */
  width?: number;
  /** CDN resize height passed to the {@code image_url} filter. */
  height?: number;
  /** Crop position for the {@code image_url} filter. */
  crop?: ImageCrop;

  /** Alt text. */
  alt?: string;
  /** `image_tag` `loading`. Defaults inferred from `section.index` when unset. */
  loading?: LiquidValueInput<ImageLoading>;
  /** `image_tag` `fetchpriority`. Defaults inferred from `section.index`. */
  fetchPriority?: LiquidValueInput<ImageFetchPriority>;
  /** `image_tag` `decoding`. */
  decoding?: ImageDecoding;
  /** `image_tag` `preload`. Defaults inferred from `section.index`. */
  preload?: boolean;
  autoLoading?: boolean;

  imageClass?: LiquidValueInput;
  tagWidth?: LiquidValueInput<number | string>;
  tagHeight?: LiquidValueInput<number | string>;
  sizes?: LiquidValueInput;
  widths?: LiquidValueInput;
}

function buildImageUrlParams(o: { width?: number; height?: number; crop?: string }): string {
  const parts: string[] = [];
  if (o.width != null) parts.push(`width: ${o.width}`);
  if (o.height != null) parts.push(`height: ${o.height}`);
  if (o.crop) parts.push(`crop: '${o.crop}'`);
  return parts.join(", ");
}

function getLargestWidth(widths?: string): number | undefined {
  if (!widths) return undefined;
  const parsed = widths
    .split(",")
    .map((w) => Number.parseInt(w.trim(), 10))
    .filter((w) => Number.isFinite(w) && w > 0);
  return parsed.length ? Math.max(...parsed) : undefined;
}

function isLiquidValue(value: unknown): value is LiquidValue {
  return typeof value === "object" && value != null && "kind" in value;
}

function isLiquidVar(v: string): boolean {
  return /^[a-zA-Z_]\w*(\.[a-zA-Z_]\w*)*$/.test(v) || v.startsWith("shopify_img_");
}

function liquidOrString(v: string): string {
  return isLiquidVar(v) ? v : `'${v.replace(/'/g, "\\'")}'`;
}

function liquidParam(
  value: LiquidValueInput<number | string> | undefined,
  name: string,
  assignments: string[],
): string | undefined {
  if (value == null) return undefined;
  if (isLiquidValue(value)) {
    const varName = `shopify_img_${name}_${assignments.length}`;
    assignments.push(...assignLiquidValue(varName, value));
    return varName;
  }
  if (typeof value === "number") return String(value);
  return liquidOrString(value);
}

function buildImageTagParams(o: {
  alt?: string;
  imageClass?: LiquidValueInput;
  loading?: LiquidValueInput;
  fetchPriority?: LiquidValueInput;
  decoding?: string;
  preload?: string;
  tagWidth?: LiquidValueInput<number | string>;
  tagHeight?: LiquidValueInput<number | string>;
  sizes?: LiquidValueInput;
  widths?: LiquidValueInput;
  assignments: string[];
}): string {
  const parts: string[] = [];
  if (o.alt !== undefined) parts.push(`alt: '${o.alt.replace(/'/g, "\\'")}'`);
  const imageClass = liquidParam(o.imageClass, "class", o.assignments);
  const loading = liquidParam(o.loading, "loading", o.assignments);
  const fetchPriority = liquidParam(o.fetchPriority, "fetchpriority", o.assignments);
  const tagWidth = liquidParam(o.tagWidth, "width", o.assignments);
  const tagHeight = liquidParam(o.tagHeight, "height", o.assignments);
  const sizes = liquidParam(o.sizes, "sizes", o.assignments);
  const widths = liquidParam(o.widths, "widths", o.assignments);
  if (imageClass) parts.push(`class: ${imageClass}`);
  if (loading) parts.push(`loading: ${loading}`);
  if (fetchPriority) parts.push(`fetchpriority: ${fetchPriority}`);
  if (o.decoding) parts.push(`decoding: '${o.decoding}'`);
  if (o.preload) {
    parts.push(
      o.preload === "true"
        ? "preload: true"
        : isLiquidVar(o.preload)
        ? `preload: ${o.preload}`
        : "preload: true",
    );
  }
  if (tagWidth) parts.push(`width: ${tagWidth}`);
  if (tagHeight) parts.push(`height: ${tagHeight}`);
  if (sizes) parts.push(`sizes: ${sizes}`);
  if (widths) parts.push(`widths: ${widths}`);
  return parts.join(", ");
}

const EAGER_THRESHOLD = 4;
const MEDIUM_THRESHOLD = 8;
const AUTO_LOAD_STATE_KEY = "__shopify_ssg_image_auto_load_state";
const AUTO_LOAD_VARS = {
  loadVar: "shopify_img_ld",
  fetchVar: "shopify_img_fp",
  preVar: "shopify_img_pl",
} as const;

function getAutoLoadVars(
  inject: (code: string) => void,
  track: (path: string) => void,
): { loadVar: string; fetchVar: string; preVar: string } {
  const g = globalThis as any;
  const blocks = g[GW_BLOCKS];
  const existing = g[AUTO_LOAD_STATE_KEY] as { blocks: unknown; injected: boolean } | undefined;
  const state: { blocks: unknown; injected: boolean } =
    existing && existing.blocks === blocks ? existing : { blocks, injected: false };
  g[AUTO_LOAD_STATE_KEY] = state;

  const { loadVar: lv, fetchVar: fv, preVar: pv } = AUTO_LOAD_VARS;
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
  if (!state.injected) {
    inject(code);
    state.injected = true;
  }
  track("section.index");
  return AUTO_LOAD_VARS;
}

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
  autoLoading = true,
  imageClass,
  tagWidth,
  tagHeight,
  sizes,
  widths,
  className,
  style,
  ...rest
}: ShopifyImageProps) {
  const ctx = useShopifyContext();

  // Compute the Liquid expression. On the client this is unused — Island's
  // pre-capture restores the real <img> from the DOM — but we still need
  // a non-empty expression so Island renders consistently across phases.
  const expression = useMemo(() => {
    if (ctx.phase !== "ssg") return "";
    ctx.track(image);
    const needAuto =
      autoLoading &&
      (loading === undefined || fetchPriority === undefined || preload === undefined);
    const autoVars = needAuto ? getAutoLoadVars(ctx.inject, ctx.track) : null;
    const effLoad = loading ?? autoVars?.loadVar;
    const effFetch = fetchPriority ?? autoVars?.fetchVar;
    const effPre =
      preload !== undefined ? (preload ? "true" : undefined) : autoVars?.preVar;

    const inferredWidth = typeof widths === "string" ? getLargestWidth(widths) : undefined;
    const assignments: string[] = [];
    const urlParams = buildImageUrlParams({ width: width ?? inferredWidth, height, crop });
    const tagParams = buildImageTagParams({
      alt,
      imageClass,
      loading: effLoad,
      fetchPriority: effFetch,
      decoding,
      preload: effPre,
      tagWidth,
      tagHeight,
      sizes,
      widths,
      assignments,
    });
    const urlPart = urlParams ? ` | image_url: ${urlParams}` : "";
    const tagPart = tagParams ? ` | image_tag: ${tagParams}` : "";
    const setup = assignments.length ? `{%- liquid\n  ${assignments.join("\n  ")}\n-%}` : "";
    return `{% if ${image} != blank %}${setup}{{ ${image}${urlPart}${tagPart} }}{% endif %}`;
  }, [
    ctx.phase,
    image,
    width,
    height,
    crop,
    alt,
    loading,
    fetchPriority,
    decoding,
    preload,
    autoLoading,
    imageClass,
    tagWidth,
    tagHeight,
    sizes,
    widths,
  ]);

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
