import { createContext, useContext } from "react";

const SettingsContext = createContext<Record<string, any>>({});

export const SettingsProvider = SettingsContext.Provider;

export function useShopifySettings<T = Record<string, any>>(): T {
  const ctx = useContext(SettingsContext);
  if (Object.keys(ctx).length > 0) return ctx as T;

  if (typeof (globalThis as any).window === "undefined") {
    const target = (globalThis as any).__shopify_ssg_target || "section";
    if (target === "snippet") return {} as T;
    const prefix = target === "block" ? "block" : "section";
    return new Proxy(
      {},
      {
        get(_, key) {
          const s = String(key);
          const tracker = (globalThis as any).__shopify_ssg_track_settings as Set<string> | undefined;
          if (tracker?.add) tracker.add(s);
          return `{{ ${prefix}.settings.${s} }}`;
        },
      },
    ) as T;
  }

  return {} as T;
}

const ParamsContext = createContext<Record<string, any>>({});

export const ParamsProvider = ParamsContext.Provider;

export function useShopifyParams<T = Record<string, any>>(): T {
  const ctx = useContext(ParamsContext);
  if (Object.keys(ctx).length > 0) return ctx as T;

  if (typeof (globalThis as any).window === "undefined") {
    return new Proxy(
      {},
      {
        get(_, key) {
          const s = String(key);
          const tracker = (globalThis as any).__shopify_ssg_track_params as Set<string> | undefined;
          if (tracker?.add) tracker.add(s);
          return `{{ ${s} }}`;
        },
      },
    ) as T;
  }

  return {} as T;
}
