import { createContext, useContext } from "react";

const SettingsContext = createContext<Record<string, any>>({});

export const SettingsProvider = SettingsContext.Provider;

export function useShopifySettings<T = Record<string, any>>(): T {
  const ctx = useContext(SettingsContext);
  if (Object.keys(ctx).length > 0) return ctx as T;

  if (typeof (globalThis as any).window === "undefined") {
    const target = (globalThis as any).__shopify_ssg_target || "section";
    const prefix = target === "block" ? "block" : "section";
    return new Proxy(
      {},
      {
        get(_, key) {
          return `{{ ${prefix}.settings.${String(key)} }}`;
        },
      },
    ) as T;
  }

  return {} as T;
}
