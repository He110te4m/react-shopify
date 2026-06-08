import type { SSGEntry } from "../types/ssg";
import { ATTR_HYDRATE, ATTR_COMPONENT, ATTR_LIQUID_BRIDGE, ATTR_ISLAND } from "../constants/attributes";
import { debugLines } from "./runtime-debug";

export type EntryMode = "scan" | "listen";

export interface EntryOptions {
  mode?: EntryMode;
  debug?: boolean;
}

export function generateEntryModule(
  entry: SSGEntry,
  componentRel: string,
  opts: EntryOptions = {},
): string {
  const { kebabName } = entry;
  const { mode = "scan", debug = false } = opts;

  const dbg = debugLines(debug);

  const lines: string[] = [
    `import { createElement } from 'react'`,
    `import Component from '~/${componentRel}'`,
    `import { hydrateRoot } from 'react-dom/client'`,
    `import { LiquidDataProvider } from 'vite-plugin-react-shopify/runtime'`,
    ``,
    `const SELECTOR = '[${ATTR_COMPONENT}="${kebabName}"]'`,
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
    `function hydrate(el) {`,
    `  const h = el.querySelector(':scope > [${ATTR_HYDRATE}]') || (el.matches('[${ATTR_HYDRATE}]') ? el : null)`,
    `  if (!h || roots.has(h)) return`,
    ...dbg(`  console.debug('[SSG:${kebabName}] hydrate start')`),
    `  const liquidData = readLiquidData(el)`,
    ...dbg(`  console.debug('[SSG:${kebabName}] liquidData', liquidData)`),
    `  liquidData[ISLAND_DATA_KEY] = captureIslands(h)`,
    `  liquidData[ISLAND_COUNTER_KEY] = { count: 0 }`,
    `  roots.set(h, hydrateRoot(h, createElement(LiquidDataProvider, { value: liquidData }, createElement(Component))))`,
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

  if (mode === "listen") {
    lines.push(
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
  } else {
    lines.push(
      ``,
      `scan(document)`,
      ``,
      `document.addEventListener('shopify:section:load', (e) => {`,
      `  scan(e.target)`,
      `})`,
      ``,
      `document.addEventListener('shopify:section:unload', (e) => {`,
      `  sweep(e.target)`,
      `})`,
    );
  }

  return lines.join("\n");
}
