import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Hello Snippet (React)",
  type: "snippet",
  params: ["greeting"],
} satisfies ShopifyMeta;

export default function HelloSnippet() {
  const [greeting] = useLiquid<string>("greeting");

  return <span style={{ fontWeight: "bold" }}>{greeting || "Hello, World!"}</span>;
}
