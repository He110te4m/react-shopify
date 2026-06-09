import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { clientOnly, useLiquid } from "vite-plugin-react-shopify/runtime";
import type { BrowserOnlyReviewsProps } from "../components/BrowserOnlyReviews.client";

const BrowserOnlyReviews = clientOnly<BrowserOnlyReviewsProps>(
  () => import("../components/BrowserOnlyReviews.client"),
  {
    fallback: ({ productTitle }) => (
      <aside style={{ border: "1px dashed #999", padding: "16px", borderRadius: "12px" }}>
        <strong>Reviews widget placeholder</strong>
        <p>{`SSG-safe fallback for: ${productTitle}`}</p>
      </aside>
    ),
  },
);

export const shopifyMeta = {
  name: "Client Only Third Party",
  settings: [
    { type: "text", id: "title", label: "Title", default: "Client-only third party demo" },
  ],
  presets: [{ name: "Client Only Third Party", category: "Demo" }],
} satisfies ShopifyMeta;

export default function ClientOnlyThirdParty() {
  const [title] = useLiquid<string>("section.settings.title");

  return (
    <section style={{ padding: "32px", display: "grid", gap: "16px" }}>
      <div>
        <h2>{title}</h2>
        <p>
          This section uses a browser-only component whose module touches window at
          top level. SSG should render only the fallback and hydrate the real widget
          in the browser.
        </p>
      </div>
      <BrowserOnlyReviews productTitle={title} />
    </section>
  );
}
