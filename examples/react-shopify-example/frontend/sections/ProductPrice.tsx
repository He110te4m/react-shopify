import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquidValue, useLiquidBlock } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Product Price (React + Liquid Block)",
  settings: [
    {
      type: "text",
      id: "price_input",
      label: "Price (in cents, e.g. 19900 for $199.00)",
      default: "19900",
    },
    {
      type: "text",
      id: "compare_price_input",
      label: "Compare Price (in cents, empty = no discount)",
    },
  ],
  presets: [
    { name: "Product Price (Default)", category: "Demo" },
  ],
} satisfies ShopifyMeta;

export default function ProductPrice() {
  useLiquidBlock(`{%- liquid
    assign price_cents = section.settings.price_input | plus: 0
    assign compare_cents = section.settings.compare_price_input | plus: 0
    assign discount = compare_cents | minus: price_cents
    assign formatted_price = price_cents | money
    assign formatted_compare = compare_cents | money
    assign formatted_discount = discount | money_without_trailing_zeros
  -%}
  {{ price_cents }}
  {{ compare_cents }}
  {{ formatted_price }}
  {{ formatted_compare }}
  {{ formatted_discount }}`);

  const [priceCents] = useLiquidValue("price_cents", "number");
  const [compareCents] = useLiquidValue("compare_cents", "number");
  const [formattedPrice] = useLiquidValue("formatted_price");
  const [formattedCompare] = useLiquidValue("formatted_compare");
  const [formattedDiscount] = useLiquidValue("formatted_discount");

  const hasDiscount = compareCents > priceCents && priceCents > 0;

  return (
    <div className="product-price-section">
      <div className="price-display">
        <span className="sale-price">{formattedPrice}</span>

        {hasDiscount && (
          <>
            <del className="original-price">{formattedCompare}</del>
            <span className="discount-badge">-{formattedDiscount}</span>
          </>
        )}
      </div>

      <p className="debug-info">
        Raw cents: {priceCents}
        {hasDiscount && ` (compare: ${compareCents})`}
      </p>
    </div>
  );
}
