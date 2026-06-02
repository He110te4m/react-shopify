/**
 * @file Logger utility wrapping the `debug` library with namespaced channels.
 *
 * Produces loggers under the `vite-plugin-shopify` namespace. Debug output
 * must be explicitly enabled via {@link enableDebug}, which sets the `DEBUG`
 * environment variable. Info/warn/error always print to stdout/stderr.
 */

import createDebugger from "debug";

const NAMESPACE = "vite-plugin-shopify";

let _debugEnabled = false;

/** Enable verbose debug output for all plugin namespaces. */
export function enableDebug() {
  if (_debugEnabled) return;
  _debugEnabled = true;
  const existing = process.env.DEBUG;
  createDebugger.enable(existing ? `${existing},${NAMESPACE}:*` : `${NAMESPACE}:*`);
}

/**
 * Create a namespaced logger instance.
 *
 * @param ns Sub-namespace appended to `vite-plugin-shopify:`.
 * @returns An object with `debug`, `info`, `warn`, and `error` methods.
 */
export function logger(ns: string) {
  const dbg = createDebugger(`${NAMESPACE}:${ns}`);

  return {
    debug: (formatter: any, ...args: any[]) => {
      if (_debugEnabled) dbg(formatter, ...args);
    },
    info: (msg: string, ...args: any[]) => console.log(`[${NAMESPACE}] ${msg}`, ...args),
    warn: (msg: string, ...args: any[]) => console.warn(`[${NAMESPACE}] ${msg}`, ...args),
    error: (msg: string, ...args: any[]) => console.error(`[${NAMESPACE}] ${msg}`, ...args),
  };
}
