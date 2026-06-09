import { createElement, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useShopifyContext } from "./ShopifyContext";

export type ClientOnlyProps = {
  fallback?: ReactNode;
  children: ReactNode | (() => ReactNode);
};

export type ClientOnlyFallback<P> = ReactNode | ((props: P) => ReactNode);

export type ClientOnlyOptions<P> = {
  fallback?: ClientOnlyFallback<P>;
  errorFallback?: ClientOnlyFallback<P & { error: unknown }>;
};

export type ClientOnlyModule<P> =
  | ComponentType<P>
  | { default: ComponentType<P> };

function renderMaybeFunction<P>(value: ClientOnlyFallback<P> | undefined, props: P): ReactNode {
  return typeof value === "function" ? (value as (props: P) => ReactNode)(props) : value;
}

function resolveComponent<P>(mod: ClientOnlyModule<P>): ComponentType<P> {
  return typeof mod === "function" ? mod : mod.default;
}

export function ClientOnly({ fallback = null, children }: ClientOnlyProps) {
  const ctx = useShopifyContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (ctx.phase === "ssg" || !mounted) return fallback;
  return typeof children === "function" ? children() : children;
}

export function clientOnly<P extends object = Record<string, never>>(
  loader: () => Promise<ClientOnlyModule<P>>,
  options: ClientOnlyOptions<P> = {},
): ComponentType<P> {
  return function ClientOnlyComponent(props: P) {
    const ctx = useShopifyContext();
    const [Component, setComponent] = useState<ComponentType<P> | null>(null);
    const [error, setError] = useState<unknown>(null);

    useEffect(() => {
      let cancelled = false;

      loader().then(
        (mod) => {
          if (!cancelled) setComponent(() => resolveComponent(mod));
        },
        (err) => {
          if (!cancelled) setError(err);
        },
      );

      return () => {
        cancelled = true;
      };
    }, []);

    if (error && options.errorFallback !== undefined) {
      return renderMaybeFunction(options.errorFallback, { ...props, error });
    }

    if (ctx.phase === "ssg" || !Component) {
      return renderMaybeFunction(options.fallback, props) ?? null;
    }

    return createElement(Component, props);
  };
}
