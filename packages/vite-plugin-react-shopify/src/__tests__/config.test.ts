import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import shopifyConfig from "../core/config";
import { resolveOptions } from "../core/options";

const tmpRoots: string[] = [];

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("shopifyConfig", () => {
  it("prefixes generated chunks and disables full outDir clearing by default", () => {
    const options = resolveOptions({ chunkPrefix: "rs-" });
    const plugin = shopifyConfig(options) as any;
    const config = plugin.config({}) as any;
    const output = config.build.rolldownOptions.output;

    expect(config.build.emptyOutDir).toBe(false);
    expect(output.entryFileNames).toBe("rs-[name]-[hash].js");
    expect(output.chunkFileNames({ name: "counter" })).toBe("rs-[name]-[hash].js");
    expect(output.chunkFileNames({ name: "react" })).toBe("rs-react.js");
    expect(output.assetFileNames).toBe("rs-[name]-[hash][extname]");
  });

  it("removes old manifest assets and same-prefix orphan chunks only", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-config-"));
    tmpRoots.push(root);

    const outDir = path.join(root, "assets");
    fs.mkdirSync(path.join(outDir, ".vite"), { recursive: true });
    fs.writeFileSync(path.join(outDir, "old-entry.js"), "");
    fs.writeFileSync(path.join(outDir, "old-entry.js.map"), "");
    fs.writeFileSync(path.join(outDir, "old-style.css"), "");
    fs.writeFileSync(path.join(outDir, "rs-orphan.js"), "");
    fs.writeFileSync(path.join(outDir, "other.js"), "");
    fs.writeFileSync(path.join(outDir, "image.png"), "");
    fs.writeFileSync(path.join(outDir, ".vite", "manifest.json"), JSON.stringify({
      "shopify:entry:old": {
        file: "old-entry.js",
        css: ["old-style.css"],
      },
    }));

    const options = resolveOptions({ themeRoot: root, buildDir: "assets", chunkPrefix: "rs-" });
    const plugin = shopifyConfig(options) as any;

    plugin.configResolved({ build: { outDir } });
    plugin.buildStart();

    expect(fs.existsSync(path.join(outDir, "old-entry.js"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "old-entry.js.map"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "old-style.css"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "rs-orphan.js"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "other.js"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "image.png"))).toBe(true);
  });
});

describe("resolveOptions", () => {
  it("uses chunkPrefix for default import map asset names", () => {
    const options = resolveOptions({ chunkPrefix: "rs-" });

    expect(options.importMap.react).toBe("{{ 'rs-react.js' | asset_url }}");
    expect(options.importMap.reactDomClient).toBe("{{ 'rs-react-dom.js' | asset_url }}");
  });
});
