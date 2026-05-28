import { useEffect, useState } from "react";
import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useShopifyParams } from "vite-plugin-react-shopify/runtime/settings";

export const shopifyMeta = {
  type: "snippet" as const,
  name: "Params Snippet Test",
  params: ["product_title", "product_price", "product_image", "product_badge"],
} satisfies ShopifyMeta;

export default function ParamsSnippetTest() {
  const p = useShopifyParams<{
    product_title?: string;
    product_price?: string;
    product_image?: string;
    product_badge?: string;
  }>();

  const [unusedParamsDetected, setUnusedParamsDetected] = useState<string[]>([]);

  useEffect(() => {
    const unused: string[] = [];
    const paramsObj = p as Record<string, any>;

    for (const key of ["product_image", "product_badge"]) {
      const val = paramsObj[key];
      const label = val === undefined ? "undefined" : JSON.stringify(val);
      unused.push(`${key}=${label}`);
    }

    setUnusedParamsDetected(unused);
  }, []);

  const title = p.product_title || "Untitled";
  const price = p.product_price || "0";

  return (
    <div className="params-snippet-test">
      <h3>{title}</h3>
      <span className="snippet-price">{price}</span>

      <div className="snippet-debug" style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
        <div>SSR追踪到的 params: title、price</div>
        <div>
          useEffect中检测未使用的params:
          {unusedParamsDetected.length === 0
            ? " (hydrate后显示)"
            : unusedParamsDetected.map((item) => (
                <span key={item} style={{ display: "block", marginLeft: "16px" }}>
                  {item}
                </span>
              ))}
        </div>
      </div>
    </div>
  );
}
