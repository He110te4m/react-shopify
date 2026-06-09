import { useLiquid } from "vite-plugin-react-shopify/runtime";

export function useSectionPadding(): {
  pt: number;
  pb: number;
  style: React.CSSProperties;
} {
  const [pt] = useLiquid<number>("section.settings.padding_top", { type: "number" });
  const [pb] = useLiquid<number>("section.settings.padding_bottom", { type: "number" });

  return {
    pt,
    pb,
    style: {
      "--pt-desktop": `${pt}px`,
      "--pt-mobile": `${Math.round(pt * 0.75)}px`,
      "--pb-desktop": `${pb}px`,
      "--pb-mobile": `${Math.round(pb * 0.75)}px`,
    } as React.CSSProperties,
  };
}
