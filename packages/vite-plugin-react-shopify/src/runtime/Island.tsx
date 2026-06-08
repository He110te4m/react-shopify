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
 * `entry-template.ts`) records each island element's real innerHTML without
 * mutating the DOM. Island renders that captured HTML back through
 * `dangerouslySetInnerHTML`, so React hydration sees an exact match and
 * leaves the Liquid-owned DOM in place.
 *
 * Finally, `React.memo(() => true)` prevents any future re-render, freezing
 * the Liquid content for the lifetime of the component.
 */
import {
  useContext,
  useRef,
  createElement,
  memo,
} from "react";
import { useShopifyContext } from "./ShopifyContext";
import {
  LiquidDataContext,
  LIQUID_ISLAND_COUNTER_KEY,
  LIQUID_ISLAND_DATA_KEY,
} from "./provider";
import {
  GW_ISLAND_COUNTER,
  ATTR_ISLAND,
  TAG_ISLAND,
} from "../constants/attributes";

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
  const liquidData = useContext(LiquidDataContext);
  const keyRef = useRef<string | null>(null);

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
  // The entry module captures the Liquid-rendered HTML before hydration.
  // We render that same HTML on the first client pass so React hydrates the
  // existing DOM without clearing it to a placeholder first.
  if (keyRef.current === null) {
    const counter = liquidData[LIQUID_ISLAND_COUNTER_KEY] ?? { count: 0 };
    liquidData[LIQUID_ISLAND_COUNTER_KEY] = counter;
    keyRef.current = `i${counter.count++}`;
  }
  const key = keyRef.current;
  const html = liquidData[LIQUID_ISLAND_DATA_KEY]?.[key] ?? "";

  return createElement(Tag, {
    ...rest,
    className,
    style,
    [ATTR_ISLAND]: key,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: html },
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
