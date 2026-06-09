import { useEffect, useState } from "react";
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Params Snippet Test",
} satisfies ShopifyMeta;

export default function ParamsSnippetTest() {
  const [title] = useLiquid<string>("product_title");
  const [price] = useLiquid<string>("product_price");
  const [image] = useLiquid<string>("product_image");
  const [badge] = useLiquid<string>("product_badge");

  const [unusedParamsDetected, setUnusedParamsDetected] = useState<string[]>([]);

  useEffect(() => {
    const unused: string[] = [];
    if (image === undefined) unused.push("product_image=undefined (useEffect中访问，SSR未追踪)");
    else unused.push(`product_image=${image}`);
    if (badge === undefined) unused.push("product_badge=undefined (useEffect中访问，SSR未追踪)");
    else unused.push(`product_badge=${badge}`);
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
