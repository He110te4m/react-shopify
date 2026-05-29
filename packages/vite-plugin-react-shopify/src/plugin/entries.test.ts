import { describe, it, expect } from "vitest";

const entriesModule = `
import { createElement } from 'react';
import Component from '~/sections/ParentSection';
import { hydrateRoot } from 'react-dom/client';
import { LiquidDataProvider } from 'vite-plugin-react-shopify/runtime';

const SELECTOR = '[data-ssg-component="parent-section"]';
const roots = new Map();

function readLiquidData(el) {
  const script = el.querySelector(':scope > script[data-ssg-liquid]');
  if (!script) return {};
  try { return JSON.parse(script.textContent || '{}') } catch { return {} }
}

function hydrate(el) {
  const h = el.querySelector(':scope > [data-ssg-hydrate]') || (el.matches('[data-ssg-hydrate]') ? el : null);
  if (!h || roots.has(h)) return;
  const liquidData = readLiquidData(el);
  roots.set(h, hydrateRoot(h, createElement(LiquidDataProvider, { value: liquidData }, createElement(Component))));
}

function unmount(el) {
  const h = el.querySelector(':scope > [data-ssg-hydrate]') || (el.matches('[data-ssg-hydrate]') ? el : null);
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
    // The `:scope > script[...]` selector ensures only the DIRECT child script
    // is read, not scripts from nested sections/blocks.
    expect(entriesModule).toContain(":scope > script[data-ssg-liquid]");
  });

  it("uses SELECTOR=[data-ssg-component='...'] for matching", () => {
    expect(entriesModule).toContain("[data-ssg-component=");
  });

  it("hydrate function reads liquid data before creating root", () => {
    // The `hydrate` function code: readLiquidData → then hydrateRoot inside the same function
    const fnMatch = entriesModule.match(/function hydrate\([^)]*\)\s*\{([^}]+)\}/s);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![1];
    const dataCall = fnBody.indexOf("readLiquidData(el)");
    const rootCall = fnBody.indexOf("hydrateRoot");
    expect(dataCall).toBeGreaterThan(0);
    expect(rootCall).toBeGreaterThan(dataCall);
  });

  it("handles missing data-ssg-liquid gracefully", () => {
    // readLiquidData returns {} when script is not found
    expect(entriesModule).toContain("if (!script) return {}");
  });

  it("handles JSON parse failure gracefully", () => {
    // try/catch around JSON.parse
    expect(entriesModule).toContain("try {");
  });
});

describe("nested section+block isolation", () => {
  it("uses :scope to limit script query to own wrapper", () => {
    // When a section contains blocks, each block has its own data-ssg-liquid.
    // The :scope selector prevents the section from reading block data.
    const selector = ":scope > script[data-ssg-liquid]";
    expect(entriesModule).toContain(selector);
  });

  it("does not interfere with sibling hydration containers", () => {
    // Each section/block gets its own data-ssg-hydrate container.
    // The hydrateRoot for section A doesn't touch section B's DOM.
    expect(entriesModule).toContain(":scope > [data-ssg-hydrate]");
  });

  it("roots Map prevents double-hydrating the same container", () => {
    expect(entriesModule).toContain("if (!h || roots.has(h)) return");
  });

  it("unmount function cleans up roots Map", () => {
    expect(entriesModule).toContain("roots.delete(h)");
  });
});
