import { useLiquid } from "vite-plugin-react-shopify/runtime";

type AnimationType = "fade-in" | "slide-in";

export function useAnimation(type: AnimationType = "fade-in"): string | undefined {
  const [enabled] = useLiquid<boolean>("settings.animations_reveal_on_scroll", { type: "boolean" });
  if (!enabled) return undefined;
  return `scroll-trigger animate--${type}`;
}

export function useAnimationEnabled(): boolean {
  const [enabled] = useLiquid<boolean>("settings.animations_reveal_on_scroll", { type: "boolean" });
  return enabled;
}
