import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid, useLiquidCode } from "vite-plugin-react-shopify/runtime";
import "../styles/shared.css";

export const shopifyMeta = {
  name: "404 (React)",
  tag: "section",
  class: "section",
} satisfies ShopifyMeta;

export default function Main404() {
  useLiquidCode(`{%- style -%}
  .template-404 .title + * {
    margin-top: 1rem;
  }

  @media screen and (min-width: 750px) {
    .template-404 .title + * {
      margin-top: 2rem;
    }
  }
{%- endstyle -%}`);
  const [subtext] = useLiquid<string>("'templates.404.subtext' | t");
  const [title] = useLiquid<string>("'templates.404.title' | t");
  const [continueShopping] = useLiquid<string>("'general.continue_shopping' | t");
  const [allProductsUrl] = useLiquid<string>("routes.all_products_collection_url");

  return (
    <div className="template-404 page-width page-margin center">
      <p>{subtext}</p>
      <h1 className="title">{title}</h1>
      <a href={allProductsUrl} className="button">
        {continueShopping}
      </a>
    </div>
  );
}
