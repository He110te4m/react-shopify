import type { SSGEntry } from "../types/ssg";
import {
  ATTR_HYDRATE,
  ATTR_COMPONENT,
  ATTR_LIQUID_BRIDGE,
  ATTR_ISLAND,
} from "../constants/attributes";
import { debugLines } from "./runtime-debug";

export interface EntryOptions {
  debug?: boolean;
}

export function generateEntryModule(
  entry: SSGEntry,
  componentRel: string,
  opts: EntryOptions = {},
): string {
  const { id: entryId, kebabName } = entry;
  const { debug = false } = opts;

  const dbg = debugLines(debug);

  const lines: string[] = [
    `import { createElement } from 'react'`,
    `import Component from '~/${componentRel}'`,
    `import { createRoot, hydrateRoot } from 'react-dom/client'`,
    `import { LiquidDataProvider } from 'vite-plugin-react-shopify/runtime'`,
    ``,
    `const SELECTOR = '[${ATTR_COMPONENT}="${entryId}"]'`,
    `const IS_BLOCK = ${entry.targetType === "block"}`,
    `const IS_CLIENT_ONLY = ${entry.runtime === "client"}`,
    `const ISLAND_DATA_KEY = '__ssg_islands'`,
    `const ISLAND_COUNTER_KEY = '__ssg_island_counter'`,
    `const roots = new Map()`,
    ``,
    `function readLiquidData(el) {`,
    `  const script = el.querySelector(':scope > script[${ATTR_LIQUID_BRIDGE}]')`,
    `  if (!script) return {}`,
    `  try { return JSON.parse(script.textContent || '{}') } catch { return {} }`,
    `}`,
    ``,
    `function captureIslands(el) {`,
    `  const nodes = el.querySelectorAll('[${ATTR_ISLAND}]')`,
    `  const alsoSelf = el.matches && el.matches('[${ATTR_ISLAND}]')`,
    `  const all = alsoSelf ? [el, ...nodes] : Array.from(nodes)`,
    `  const html = {}`,
    `  for (const node of all) {`,
    `    if (node.closest('[${ATTR_HYDRATE}]') !== el) continue`,
    `    const key = node.getAttribute('${ATTR_ISLAND}')`,
    `    if (!key || html[key] !== undefined) continue`,
    `    html[key] = node.innerHTML`,
    `  }`,
    `  return html`,
    `}`,
    ``,
    `function canHydrate(el) {`,
    `  if (!IS_BLOCK) return true`,
    `  const slot = el.closest('shopify-block-slot')`,
    `  if (!slot) return true`,
    `  const parentRoot = slot.closest('[${ATTR_HYDRATE}]')`,
    `  if (!parentRoot) return true`,
    `  return slot.getAttribute('data-ssg-blocks-ready') === 'true'`,
    `}`,
    ``,
    `function hydrate(el) {`,
    `  const h = el.querySelector(':scope > [${ATTR_HYDRATE}]') || (el.matches('[${ATTR_HYDRATE}]') ? el : null)`,
    `  if (!h || roots.has(h) || !canHydrate(el)) return`,
    ...dbg(`  console.debug('[SSG:${kebabName}] hydrate start')`),
    `  const liquidData = readLiquidData(el)`,
    ...dbg(`  console.debug('[SSG:${kebabName}] liquidData', liquidData)`),
    `  liquidData[ISLAND_DATA_KEY] = captureIslands(h)`,
    `  liquidData[ISLAND_COUNTER_KEY] = { count: 0 }`,
    `  const tree = createElement(LiquidDataProvider, { value: liquidData }, createElement(Component))`,
    `  if (IS_CLIENT_ONLY) {`,
    `    h.replaceChildren()`,
    `    const root = createRoot(h)`,
    `    root.render(tree)`,
    `    roots.set(h, root)`,
    `  } else {`,
    `    roots.set(h, hydrateRoot(h, tree))`,
    `  }`,
    ...dbg(`  console.debug('[SSG:${kebabName}] hydrate done')`),
    `}`,
    ``,
    `function unmount(el) {`,
    `  const h = el.querySelector(':scope > [${ATTR_HYDRATE}]') || (el.matches('[${ATTR_HYDRATE}]') ? el : null)`,
    `  if (h && roots.has(h)) { roots.get(h).unmount(); roots.delete(h) }`,
    `}`,
    ``,
    `function scan(target) {`,
    `  const found = target.matches?.(SELECTOR) ? [target] : target.querySelectorAll(SELECTOR)`,
    ...dbg(`  console.debug('[SSG:${kebabName}] scan found', found.length, 'elements')`),
    `  found.forEach(hydrate)`,
    `}`,
    ``,
    `function sweep(target) {`,
    `  if (target.matches?.(SELECTOR)) unmount(target)`,
    `  target.querySelectorAll(SELECTOR).forEach(unmount)`,
    `}`,
  ];

  lines.push(
    ``,
    `scan(document)`,
    ``,
    `document.addEventListener('ssg:blocks:ready', (e) => {`,
    ...dbg(`  console.debug('[SSG:${kebabName}] blocks-ready event', e.target)`),
    `  scan(e.target)`,
    `})`,
    ``,
    `document.addEventListener('shopify:section:load', (e) => {`,
    `  scan(e.target)`,
    `})`,
    ``,
    `document.addEventListener('shopify:section:unload', (e) => {`,
    `  sweep(e.target)`,
    `})`,
  );

  return lines.join("\n");
}
