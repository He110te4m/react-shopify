import {
  createSettingExpression,
  multiply,
  round,
  useShopifyValue,
} from "vite-plugin-react-shopify/runtime";

const paddingTop = createSettingExpression<number>("section", "padding_top");
const paddingBottom = createSettingExpression<number>("section", "padding_bottom");

export function useSectionPadding(): {
  style: React.CSSProperties;
} {
  const ptDesktop = useShopifyValue(paddingTop, { type: "number" });
  const pbDesktop = useShopifyValue(paddingBottom, { type: "number" });
  const ptMobile = useShopifyValue(round(multiply(paddingTop, 0.75)), { type: "number" });
  const pbMobile = useShopifyValue(round(multiply(paddingBottom, 0.75)), { type: "number" });

  return {
    style: {
      "--pt-desktop": `${ptDesktop}px`,
      "--pt-mobile": `${ptMobile}px`,
      "--pb-desktop": `${pbDesktop}px`,
      "--pb-mobile": `${pbMobile}px`,
    } as React.CSSProperties,
  };
}
