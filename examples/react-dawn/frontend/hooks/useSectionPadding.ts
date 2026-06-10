import { useLiquid } from "vite-plugin-react-shopify/runtime";

export function useSectionPadding(): {
  style: React.CSSProperties;
} {
  const [ptDesktop] = useLiquid<string>("section.settings.padding_top");
  const [pbDesktop] = useLiquid<string>("section.settings.padding_bottom");
  const [ptMobile] = useLiquid<string>("section.settings.padding_top | times: 0.75 | round: 0");
  const [pbMobile] = useLiquid<string>("section.settings.padding_bottom | times: 0.75 | round: 0");

  return {
    style: {
      "--pt-desktop": `${ptDesktop}px`,
      "--pt-mobile": `${ptMobile}px`,
      "--pb-desktop": `${pbDesktop}px`,
      "--pb-mobile": `${pbMobile}px`,
    } as React.CSSProperties,
  };
}
