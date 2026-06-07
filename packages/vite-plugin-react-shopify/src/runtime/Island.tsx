/**
 * @file Unified hydration boundary for Liquid-owned DOM content.
 *
 * Two-phase capture strategy:
 *
 * **SSR phase** (Node): Renders a custom element with
 * `dangerouslySetInnerHTML` containing the Liquid placeholder expression
 * (e.g. `{% raw %}{{ ... }}{% endraw %}`).  Also stores an auto-incremented
 * *island key* in the `data-ssg-i` attribute so the client-side hydrate
 * function can pre-capture the element's real innerHTML (what Liquid
 * generated on the production server) **before** React mounts.
 *
 * **Client phase** (browser): The pre-capture step (run by
 * `entry-template.ts`) swaps each island element's innerHTML to a known
 * sentinel string (`__SSG_ISLAND__`) and saves the original Liquid output
 * on a hidden expando.  Island renders
 * `dangerouslySetInnerHTML={{ __html: '__SSG_ISLAND__' }}` so React
 * hydration sees an exact match and leaves the DOM alone.  A
 * `useLayoutEffect` then restores the real innerHTML from the expando.
 *
 * Finally, `React.memo(() => true)` prevents any future re-render, freezing
 * the Liquid content for the lifetime of the component.
 */
import {
  useRef,
  useLayoutEffect,
  createElement,
  memo,
} from "react";
import { useShopifyContext } from "./ShopifyContext";
import {
  GW_ISLAND_COUNTER,
  ATTR_ISLAND,
  TAG_ISLAND,
} from "../constants/attributes";

/** Sentinel string that replaces real innerHTML before hydration. */
const ISLAND_PLACEHOLDER = "__SSG_ISLAND__";

export type IslandProps = {
  expression: string;
  as?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

function IslandImpl({
  expression,
  as: Tag = TAG_ISLAND,
  className,
  style,
  ...rest
}: IslandProps) {
  const ctx = useShopifyContext();
  const ref = useRef<any>(null);

  // ── SSR ───────────────────────────────────────────────────────────────
  if (ctx.phase === "ssg") {
    // Auto-assign a stable key from the global counter
    const counter: { count: number } =
      (globalThis as any)[GW_ISLAND_COUNTER] ?? { count: 0 };
    const key = `i${counter.count++}`;
    (globalThis as any)[GW_ISLAND_COUNTER] = counter;

    return createElement(Tag, {
      ...rest,
      className,
      style,
      [ATTR_ISLAND]: key,
      suppressHydrationWarning: true,
      dangerouslySetInnerHTML: { __html: expression },
    });
  }

  // ── Client (hydrating / mounted) ────────────────────────────────────
  // The pre-capture step in entry-template replaced the real innerHTML with
  // ISLAND_PLACEHOLDER and stored the original in `_ssgHtml`.  We render
  // the same placeholder so React hydration sees a match.
  // After commit, useLayoutEffect restores the real content.

  useLayoutEffect(() => {
    if (ref.current && (ref.current as any)._ssgHtml !== undefined) {
      const html: string = (ref.current as any)._ssgHtml;
      if (html && html !== ISLAND_PLACEHOLDER) {
        ref.current.innerHTML = html;
      }
      delete (ref.current as any)._ssgHtml;
    }
  });

  return createElement(Tag, {
    ...rest,
    ref,
    className,
    style,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: ISLAND_PLACEHOLDER },
  });
}

/**
 * **`React.memo(() => true)`** – permanent bail-out.
 *
 * Once the Liquid content is rendered / restored, no prop change should
 * ever cause a re-render of the island wrapper because the DOM inside is
 * managed by Liquid / Shopify, not by React.
 *
 * The comparison function always returns `true` (props are "equal") so
 * React skips re-rendering unconditionally.
 */
export const Island = memo(IslandImpl, () => true);