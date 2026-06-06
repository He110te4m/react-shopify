import { useMemo, createElement } from "react";
import { useShopifyContext } from "./ShopifyContext";

// Register <shopify-island> custom element for hydration boundary.
// Only runs in browser environments where customElements is available.
{
  const g = globalThis as any;
  if (
    typeof g.customElements !== "undefined" &&
    !g.customElements.get("shopify-island")
  ) {
    g.customElements.define(
      "shopify-island",
      class extends g.HTMLElement {},
    );
  }
}

export type IslandProps = {
  expression: string;
  as?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/**
 * Unified hydration boundary for Liquid-owned DOM content.
 *
 * SSR: renders a custom element wrapping the Liquid expression.
 * CSR: renders only the custom element (empty) — React skips
 * hydration of the interior, preserving Liquid-rendered DOM.
 *
 * Covers:
 *   Scenario 1 — `{% content_for 'blocks' %}`
 *   Scenario 2 — `{{ image | image_tag: ... }}`, `{{ video | video_tag: ... }}`
 */
export function Island({
  expression,
  as: Tag = "shopify-island",
  className,
  style,
  children,
  ...rest
}: IslandProps) {
  const { isSSR } = useShopifyContext();

  const innerHTML = useMemo(
    () => (isSSR ? expression : undefined),
    [isSSR, expression],
  );

  if (isSSR) {
    return createElement(Tag, {
      className,
      style,
      dangerouslySetInnerHTML: { __html: innerHTML! },
      suppressHydrationWarning: true,
      ...rest,
    });
  }

  // CSR: empty element. React vdom has no children → no hydration
  // mismatch to patch. Liquid-rendered DOM inside the element stays.
  return createElement(Tag, { className, style, ...rest }, children);
}
