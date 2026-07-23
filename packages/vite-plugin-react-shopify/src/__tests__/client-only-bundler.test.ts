import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundleEntry } from "../ssg/bundler";

const tmpRoots: string[] = [];
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("client-only SSG bundler isolation", () => {
  it("stubs .client modules out of the Node SSG bundle", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-client-only-"));
    tmpRoots.push(root);

    const sourceDir = path.join(root, "frontend");
    fs.mkdirSync(path.join(sourceDir, "sections"), { recursive: true });
    fs.mkdirSync(path.join(sourceDir, "components"), { recursive: true });

    const entryPath = path.join(sourceDir, "sections", "ClientOnlyTest.tsx");
    const clientPath = path.join(sourceDir, "components", "BrowserWidget.client.tsx");

    fs.writeFileSync(
      entryPath,
      `
import { clientOnly } from "vite-plugin-react-shopify/runtime";
const BrowserWidget = clientOnly(() => import("../components/BrowserWidget.client"), {
  fallback: <div>Loading browser widget</div>,
});
export default function ClientOnlyTest() {
  return <BrowserWidget />;
}
`,
    );

    fs.writeFileSync(
      clientPath,
      `
const href = window.location.href;
export default function BrowserWidget() {
  return <div>{href}</div>;
}
`,
    );

    const result = await bundleEntry(
      { filePath: entryPath, kebabName: "client-only-test" },
      packageRoot,
      sourceDir,
    );

    expect(result).not.toBeNull();
    const bundled = fs.readFileSync(result!.tmpFile, "utf-8");

    expect(bundled).toContain("ClientOnlySSGStub");
    expect(bundled).not.toContain("window.location.href");
  });

  it.each(["~/snippets/Button", "@/snippets/Button"])(
    "proxies aliased snippet imports from %s",
    async (specifier) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "shopify-snippet-alias-"));
      tmpRoots.push(root);

      const sourceDir = path.join(root, "frontend");
      const entryPath = path.join(sourceDir, "sections", "SnippetCaller.tsx");
      const snippetPath = path.join(sourceDir, "snippets", "Button.tsx");
      fs.mkdirSync(path.dirname(entryPath), { recursive: true });
      fs.mkdirSync(path.dirname(snippetPath), { recursive: true });
      fs.writeFileSync(
        entryPath,
        `import Button from ${JSON.stringify(specifier)}; export default function SnippetCaller() { return <Button label="Buy" /> }`,
      );
      fs.writeFileSync(
        snippetPath,
        `export default function Button({ label }: { label: string }) { return <button>{label}</button> }`,
      );

      const result = await bundleEntry(
        { filePath: entryPath, kebabName: "snippet-caller" },
        packageRoot,
        sourceDir,
        [{ filePath: snippetPath, name: "react-button", props: ["label"] }],
      );

      expect(result).not.toBeNull();
      const bundled = fs.readFileSync(result!.tmpFile, "utf-8");
      expect(bundled).toContain('createSnippetProxy("react-button", ["label"])');
      expect(bundled).not.toContain("function Button");
    },
  );
});
