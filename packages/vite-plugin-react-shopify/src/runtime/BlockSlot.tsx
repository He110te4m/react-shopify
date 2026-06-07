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
 * The pre-capture step in the client `entry-template` swaps the real
 * Liquid-rendered child blocks out before hydration so React doesn't
 * try to reconcile them, then restores them after commit.
 */
import { memo, createElement, useRef, useLayoutEffect } from "react";
import {
  TAG_BLOCK_SLOT,
  BLOCKS_CAPTURE_KEY,
  ATTR_ISLAND,
} from "../constants/attributes";
import { useShopifyContext } from "./ShopifyContext";

const ISLAND_PLACEHOLDER = "__SSG_ISLAND__";

export type BlockSlotProps = {
  className?: string;
  style?: React.CSSProperties;
};

function BlockSlotImpl({ className, style }: BlockSlotProps) {
  const ctx = useShopifyContext();
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

  // Client: render placeholder, then restore real DOM after commit.
  useLayoutEffect(() => {
    if (ref.current && (ref.current as any)._ssgHtml !== undefined) {
      const html: string = (ref.current as any)._ssgHtml;
      if (html && html !== ISLAND_PLACEHOLDER) {
        ref.current.innerHTML = html;
      }
      delete (ref.current as any)._ssgHtml;
    }
  });

  return createElement(TAG_BLOCK_SLOT, {
    ref,
    className,
    style,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: ISLAND_PLACEHOLDER },
  });
}

/**
 * Memo-ised BlockSlot.  Once rendered, never re-renders (same rationale as
 * `Island` — the content is managed by Shopify, not React).
 */
export const BlockSlot = memo(BlockSlotImpl, () => true);