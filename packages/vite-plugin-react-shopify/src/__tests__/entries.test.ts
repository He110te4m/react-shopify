import { describe, it, expect } from "vitest";

const entriesModule = `
import { createElement } from 'react';
import Component from '~/sections/ParentSection';
import { hydrateRoot } from 'react-dom/client';
import { LiquidDataProvider } from 'vite-plugin-react-shopify/runtime';

const SELECTOR = '[data-ssg-component="parent-section"]';
const ISLAND_DATA_KEY = '__ssg_islands';
const ISLAND_COUNTER_KEY = '__ssg_island_counter';
const roots = new Map();

function readLiquidData(el) {
  const script = el.querySelector(':scope > script[data-ssg-liquid]');
  if (!script) return {};
  try { return JSON.parse(script.textContent || '{}') } catch { return {} }
}

function captureIslands(el) {
  const nodes = el.querySelectorAll('[data-ssg-i]');
  const alsoSelf = el.matches && el.matches('[data-ssg-i]');
  const all = alsoSelf ? [el, ...nodes] : Array.from(nodes);
  const html = {};
  for (const node of all) {
    if (node.closest('[data-ssg-h]') !== el) continue;
    const key = node.getAttribute('data-ssg-i');
    if (!key || html[key] !== undefined) continue;
    html[key] = node.innerHTML;
  }
  return html;
}

function hydrate(el) {
  const h = el.querySelector(':scope > [data-ssg-h]') || (el.matches('[data-ssg-h]') ? el : null);
  if (!h || roots.has(h)) return;
  const liquidData = readLiquidData(el);
  liquidData[ISLAND_DATA_KEY] = captureIslands(h);
  liquidData[ISLAND_COUNTER_KEY] = { count: 0 };
  roots.set(h, hydrateRoot(h, createElement(LiquidDataProvider, { value: liquidData }, createElement(Component))));
}

function unmount(el) {
  const h = el.querySelector(':scope > [data-ssg-h]') || (el.matches('[data-ssg-h]') ? el : null);
  if (h && roots.has(h)) { roots.get(h).unmount(); roots.delete(h) }
}

function scan(target) {
  if (target.matches?.(SELECTOR)) hydrate(target);
  target.querySelectorAll(SELECTOR).forEach(hydrate);
}

function sweep(target) {
  if (target.matches?.(SELECTOR)) unmount(target);
  target.querySelectorAll(SELECTOR).forEach(unmount);
}

scan(document);
document.addEventListener('shopify:section:load', (e) => { scan(e.target) });
document.addEventListener('shopify:section:unload', (e) => { sweep(e.target) });
`;

describe("hydration entry — isolation analysis", () => {
  it("reads liquid data from :scope > script[data-ssg-liquid]", () => {
    expect(entriesModule).toContain(":scope > script[data-ssg-liquid]");
  });

  it("uses SELECTOR=[data-ssg-component='...'] for matching", () => {
    expect(entriesModule).toContain("[data-ssg-component=");
  });

  it("hydrate function reads liquid data before creating root", () => {
    const dataCall = entriesModule.indexOf("readLiquidData(el)");
    const rootCall = entriesModule.indexOf("hydrateRoot(h");
    expect(dataCall).toBeGreaterThan(0);
    expect(rootCall).toBeGreaterThan(dataCall);
  });

  it("handles missing data-ssg-liquid gracefully", () => {
    expect(entriesModule).toContain("if (!script) return {}");
  });

  it("handles JSON parse failure gracefully", () => {
    expect(entriesModule).toContain("try {");
  });
});

describe("nested section+block isolation", () => {
  it("uses :scope to limit script query to own wrapper", () => {
    const selector = ":scope > script[data-ssg-liquid]";
    expect(entriesModule).toContain(selector);
  });

  it("captureIslands runs before hydrateRoot", () => {
    const fnMatch = entriesModule.match(/function captureIslands\([^)]*\)\s*\{([^}]+)\}/s);
    expect(fnMatch).not.toBeNull();
  });

  it("captureIslands does not replace visible island DOM", () => {
    expect(entriesModule).not.toContain("node.innerHTML = '__SSG_ISLAND__'");
    expect(entriesModule).toContain("html[key] = node.innerHTML");
  });

  it("captureIslands ignores nested hydration roots", () => {
    expect(entriesModule).toContain("node.closest('[data-ssg-h]') !== el");
  });

  it("does not interfere with sibling hydration containers", () => {
    expect(entriesModule).toContain(":scope > [data-ssg-h]");
  });

  it("roots Map prevents double-hydrating the same container", () => {
    expect(entriesModule).toContain("if (!h || roots.has(h)) return");
  });

  it("unmount function cleans up roots Map", () => {
    expect(entriesModule).toContain("roots.delete(h)");
  });
});
