import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { scanEntries } from "../ssg/scanner";
import type { ResolvedOptions } from "../core/options";

const tmpRoots: string[] = [];

function makeOptions(root: string): ResolvedOptions {
  return {
    themeRoot: root,
    sourceCodeDir: "frontend",
    snippetFile: "shopify-importmap.liquid",
    buildDir: "assets",
    chunkPrefix: "react-shopify-",
    debug: false,
    ssg: {
      directories: ["sections", "blocks"],
      prefix: { template: "page.react-", section: "react-", block: "react-", snippet: "react-" },
      outputName: "",
      cssPrefix: "css-",
    },
    importMap: {
      react: "{{ 'react.js' | asset_url }}",
      reactDomClient: "{{ 'react-dom.js' | asset_url }}",
    },
  };
}

function writeFile(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("scanEntries", () => {
  it("tracks block types declared by StaticBlock usage", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-scan-"));
    tmpRoots.push(root);

    writeFile(root, "frontend/sections/StaticExample.tsx", `
      import { StaticBlock } from 'vite-plugin-react-shopify/runtime';
      export default function StaticExample() {
        return <StaticBlock type="react-hero-banner" id="hero-1" />;
      }
    `);
    writeFile(root, "frontend/blocks/HeroBanner.tsx", `
      export default function HeroBanner() { return <div />; }
    `);

    const section = scanEntries(makeOptions(root)).find((entry) => entry.kebabName === "static-example");
    expect(section).toBeDefined();
    expect((section!.meta as { _blockTypes?: string[] })._blockTypes).toEqual(["react-hero-banner"]);
  });

  it("reads explicit shopifyEntry runtime metadata", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-scan-"));
    tmpRoots.push(root);
    writeFile(root, "frontend/sections/StaticSection.tsx", `
      export const shopifyEntry = { runtime: "static" } as const;
      export default function StaticSection() { return <div />; }
    `);

    const section = scanEntries(makeOptions(root))[0];
    expect(section.runtime).toBe("static");
  });

  it("uses path-aware identities and extracts snippet props", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-scan-"));
    tmpRoots.push(root);
    const options = makeOptions(root);
    options.ssg.directories = ["sections", "blocks", "snippets"];

    writeFile(root, "frontend/sections/Card.tsx", "export default function Card() { return <div /> }");
    writeFile(root, "frontend/blocks/Card.tsx", "export default function Card() { return <div /> }");
    writeFile(
      root,
      "frontend/snippets/cards/Button.tsx",
      `export default function Button({ label, style = "primary" }: { label: string; style?: string }) { return <button>{label}</button> }`,
    );

    const entries = scanEntries(options);
    expect(entries.find((entry) => entry.targetType === "section")?.id).toBe("section-card");
    expect(entries.find((entry) => entry.targetType === "block")?.id).toBe("block-card");
    const snippet = entries.find((entry) => entry.targetType === "snippet");
    expect(snippet?.id).toBe("snippet-cards--button");
    expect(snippet?.kebabName).toBe("cards-button");
    expect(snippet?.snippetProps).toEqual(["label", "style"]);
  });
});
