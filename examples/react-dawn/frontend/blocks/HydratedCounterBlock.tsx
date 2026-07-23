import { useState } from "react";
import type { ShopifyEntryConfig, ShopifyMeta } from "vite-plugin-react-shopify";
import { ClientOnly, createTextSetting, defineSettings } from "vite-plugin-react-shopify/runtime";

const counterSettings = defineSettings("block", {
  label: createTextSetting({ label: "Counter label", default: "Hydrated counter" }),
});

export const shopifyEntry = { runtime: "hydrate" } satisfies ShopifyEntryConfig;

export default function HydratedCounterBlock() {
  const { label } = counterSettings.useProps();
  const [count, setCount] = useState(0);

  return (
    <div className="banner__block">
      <button
        className="button button--secondary"
        type="button"
        onClick={() => setCount(count + 1)}
      >
        {label}: {count}
      </button>
      <ClientOnly fallback={<small> Client subtree is waiting for mount.</small>}>
        <small> Client subtree mounted.</small>
      </ClientOnly>
    </div>
  );
}

export const shopifyMeta = {
  name: "Hydrated counter",
  settings: counterSettings.schema,
} satisfies ShopifyMeta;
