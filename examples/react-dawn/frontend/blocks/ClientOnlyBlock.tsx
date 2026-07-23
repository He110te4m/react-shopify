import { useState } from "react";
import type { ShopifyEntryConfig, ShopifyMeta } from "vite-plugin-react-shopify";
import { ClientOnly, createTextSetting, defineSettings } from "vite-plugin-react-shopify/runtime";

const clientSettings = defineSettings("block", {
  message: createTextSetting({ label: "Message", default: "Client-only interaction" }),
});

export const shopifyEntry = { runtime: "client" } satisfies ShopifyEntryConfig;

export default function ClientOnlyBlock() {
  const { message } = clientSettings.useProps();
  const [expanded, setExpanded] = useState(false);

  return (
    <ClientOnly fallback={<div className="banner__block">Loading client-only block…</div>}>
      {() => (
        <div className="banner__block">
          <button className="button" type="button" onClick={() => setExpanded(!expanded)}>
            {message}
          </button>
          {expanded ? <p>This subtree was mounted entirely in the browser.</p> : null}
        </div>
      )}
    </ClientOnly>
  );
}

export const shopifyMeta = {
  name: "Client-only example",
  settings: clientSettings.schema,
} satisfies ShopifyMeta;
