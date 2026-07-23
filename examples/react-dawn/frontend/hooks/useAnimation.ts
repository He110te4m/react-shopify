import { themeSetting, useLiquidClass, useShopifyValue } from "vite-plugin-react-shopify/runtime";

type AnimationType = "fade-in" | "slide-in";

export function useAnimation(type: AnimationType = "fade-in"): string | undefined {
  return useLiquidClass(
    themeSetting<boolean>("animations_reveal_on_scroll"),
    `scroll-trigger animate--${type}`,
  );
}

export function useAnimationEnabled(): boolean {
  return useShopifyValue(themeSetting<boolean>("animations_reveal_on_scroll"), {
    type: "boolean",
  });
}
