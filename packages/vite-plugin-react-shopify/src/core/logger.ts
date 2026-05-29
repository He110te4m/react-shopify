import createDebugger from "debug";

const NAMESPACE = "vite-plugin-shopify";

let _debugEnabled = false;

export function enableDebug() {
  if (_debugEnabled) return;
  _debugEnabled = true;
  const existing = process.env.DEBUG;
  createDebugger.enable(existing ? `${existing},${NAMESPACE}:*` : `${NAMESPACE}:*`);
}

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
