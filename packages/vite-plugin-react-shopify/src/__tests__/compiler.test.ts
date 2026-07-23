import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compileAllEntries } from "../ssg/compiler";
import type { ResolvedOptions } from "../core/options";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("compileAllEntries", () => {
  it("fails the whole build without replacing existing Liquid output", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-compile-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "frontend", "sections"), { recursive: true });
    fs.mkdirSync(path.join(root, "sections"), { recursive: true });
    fs.writeFileSync(path.join(root, "package.json"), '{"type":"module"}');
    fs.writeFileSync(
      path.join(root, "frontend", "sections", "Broken.tsx"),
      "export default function Broken(){ return <div /> }",
    );
    const target = path.join(root, "sections", "react-broken.liquid");
    fs.writeFileSync(target, "existing output");

    const options: ResolvedOptions = {
      themeRoot: root,
      sourceCodeDir: "frontend",
      snippetFile: "shopify-importmap.liquid",
      buildDir: "assets",
      chunkPrefix: "react-shopify-",
      debug: false,
      ssg: {
        directories: ["sections"],
        prefix: { template: "page.react-", section: "react-", block: "react-", snippet: "react-" },
        outputName: "",
        cssPrefix: "css-",
      },
      importMap: { react: "", reactDomClient: "" },
    };

    await expect(compileAllEntries(options, {})).rejects.toThrow("Failed to compile 1 of 1");
    expect(fs.readFileSync(target, "utf-8")).toBe("existing output");
  });

  it.each([
    [
      "auto runtime that infers interaction",
      `export default function Interactive({ label }: { label: string }) { return <button onClick={() => undefined}>{label}</button> }`,
      "auto runtime inferred client interaction",
    ],
    [
      "explicit hydrate runtime",
      `export const shopifyEntry = { runtime: "hydrate" } as const; export default function Interactive({ label }: { label: string }) { return <div>{label}</div> }`,
      'shopifyEntry.runtime "hydrate" is not supported',
    ],
    [
      "explicit client runtime",
      `export const shopifyEntry = { runtime: "client" } as const; export default function Interactive({ label }: { label: string }) { return <div>{label}</div> }`,
      'shopifyEntry.runtime "client" is not supported',
    ],
  ])("rejects snippet ownership for %s", async (_case, source, message) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-compile-"));
    roots.push(root);
    fs.mkdirSync(path.join(root, "frontend", "snippets"), { recursive: true });
    fs.writeFileSync(path.join(root, "frontend", "snippets", "Interactive.tsx"), source);

    const options: ResolvedOptions = {
      themeRoot: root,
      sourceCodeDir: "frontend",
      snippetFile: "shopify-importmap.liquid",
      buildDir: "assets",
      chunkPrefix: "react-shopify-",
      debug: false,
      ssg: {
        directories: ["snippets"],
        prefix: { template: "page.react-", section: "react-", block: "react-", snippet: "react-" },
        outputName: "",
        cssPrefix: "css-",
      },
      importMap: { react: "", reactDomClient: "" },
    };

    let error: unknown;
    try {
      await compileAllEntries(options, {});
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors[0]).toHaveProperty(
      "message",
      expect.stringContaining(message),
    );
  });
});
