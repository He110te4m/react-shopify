/**
 * @file BlockSlot component — declares where child blocks insert in a Section.
 *
 * Usage:
 * ```tsx
 * function MySection() {
 *   return (
 *     <section>
 *       <h2>{{ section.settings.title }}</h2>
 *       <BlockSlot />   ← child blocks render here
 *       <footer>...</footer>
 *     </section>
 *   )
 * }
 * export const shopifyMeta = {
 *   blocks: [{ type: '@theme' }],
 *   max_blocks: 8,
 * }
 * ```
 *
 * Under the hood: emits `<shopify-block-slot data-ssg-i="__blocks__">…</…>`
 * which the SSG assembler treats specially — it does NOT add the
 * traditional `<ssg-slot>{% content_for 'blocks' %}</ssg-slot>` sibling,
 * because the React tree already declares the slot location.
 *
 * The pre-capture step in the client `entry-template` records the real
 * Liquid-rendered child blocks before hydration so React can render the
 * same static HTML and avoid reconciling the child block subtree.
 */
import { memo, createElement, useContext, useRef, useLayoutEffect } from "react";
import {
  TAG_BLOCK_SLOT,
  BLOCKS_CAPTURE_KEY,
  ATTR_ISLAND,
} from "../constants/attributes";
import { useShopifyContext } from "./ShopifyContext";
import { LiquidDataContext, LIQUID_ISLAND_DATA_KEY } from "./provider";

export type BlockSlotProps = {
  className?: string;
  style?: React.CSSProperties;
};

function BlockSlotImpl({ className, style }: BlockSlotProps) {
  const ctx = useShopifyContext();
  const liquidData = useContext(LiquidDataContext);
  const ref = useRef<any>(null);

  if (ctx.phase === "ssg") {
    return createElement(TAG_BLOCK_SLOT, {
      className,
      style,
      [ATTR_ISLAND]: BLOCKS_CAPTURE_KEY,
      suppressHydrationWarning: true,
      dangerouslySetInnerHTML: { __html: "{% content_for 'blocks' %}" },
    });
  }

  // Client: render the captured Liquid DOM directly, then notify child block
  // entries after React commits so they hydrate in the restored subtree.
  const html = liquidData[LIQUID_ISLAND_DATA_KEY]?.[BLOCKS_CAPTURE_KEY] ?? "";

  useLayoutEffect(() => {
    if (ref.current) {
      // Notify section-managed block entry modules that the block
      // DOM has committed.  Block entries listen for this event
      // (instead of auto-scanning at module-load time) so they only
      // hydrate *after* React's commit has finished.
      ref.current.dispatchEvent(
        new CustomEvent("ssg:blocks:ready", { bubbles: true }),
      );
    }
  });

  return createElement(TAG_BLOCK_SLOT, {
    ref,
    className,
    style,
    [ATTR_ISLAND]: BLOCKS_CAPTURE_KEY,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: html },
  });
}

/**
 * Memo-ised BlockSlot.  Once rendered, never re-renders (same rationale as
 * `Island` — the content is managed by Shopify, not React).
 */
export const BlockSlot = memo(BlockSlotImpl, () => true);
