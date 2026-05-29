import { useEffect, useState } from "react";
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquidValue, useLiquidValues } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  type: "snippet" as const,
  name: "Params Snippet Test",
  params: ["product_title", "product_price", "product_image", "product_badge"],
} satisfies ShopifyMeta;

export default function ParamsSnippetTest() {
  const [title] = useLiquidValue("product_title");
  const [price] = useLiquidValue("product_price");
  const p = useLiquidValues({
    image: "product_image",
    badge: "product_badge",
  });

  const [unusedParamsDetected, setUnusedParamsDetected] = useState<string[]>([]);

  useEffect(() => {
    const unused: string[] = [];
    if (p.image === undefined) unused.push("product_image=undefined (useEffect中访问，SSR未追踪)");
    else unused.push(`product_image=${p.image}`);
    if (p.badge === undefined) unused.push("product_badge=undefined (useEffect中访问，SSR未追踪)");
    else unused.push(`product_badge=${p.badge}`);
    setUnusedParamsDetected(unused);
  }, []);

  return (
    <div className="params-snippet-test">
      <h3>{title}</h3>
      <span className="snippet-price">{price}</span>

      <div className="snippet-debug" style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
        <div>SSR跟踪到的 params: product_title、product_price</div>
        <div>
          useEffect中检测未使用的params:
          {unusedParamsDetected.length === 0
            ? " (hydrate后显示)"
            : unusedParamsDetected.map((item) => (
                <span key={item} style={{ display: "block", marginLeft: "16px" }}>{item}</span>
              ))}
        </div>
      </div>
    </div>
  );
}
