import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { logger } from "../core/logger";
import { autoFixAdjacentText } from "../hydration-fix";

const log = logger("ssg:bundler");

export interface BundleResult {
  tmpFile: string;
}

export async function bundleEntry(
  entry: { filePath: string; kebabName: string },
  projectRoot: string,
  sourceDir: string,
): Promise<BundleResult | null> {
  const projectRequire = createRequire(path.join(projectRoot, "package.json"));

  let esbuild: any;
  try {
    esbuild = projectRequire("esbuild");
  } catch {
    log.warn("esbuild not found, skipping SSR for %s", entry.kebabName);
    return null;
  }

  const sourceCode = fs.readFileSync(entry.filePath, "utf-8");

  const { result: fixedSource, fixCount } = autoFixAdjacentText(sourceCode, entry.filePath);
  const finalSource = fixCount > 0 ? fixedSource : sourceCode;

  const ts = Date.now();
  const tmpDir = path.join(sourceDir, ".ssg-tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `.ssg-entry-${ts}.mjs`);

  log.debug("bundling %s via esbuild", entry.kebabName);
  const startBundled = Date.now();

  await esbuild.build({
    stdin: {
      contents: finalSource,
      resolveDir: path.dirname(entry.filePath),
      loader: path.extname(entry.filePath).slice(1) as "tsx" | "jsx",
    },
    outfile: tmpFile,
    bundle: true,
    format: "esm",
    jsx: "automatic",
    platform: "node",
    external: [
      "react",
      "react-dom",
      "react-dom/*",
      "vite-plugin-react-shopify",
      "vite-plugin-react-shopify/*",
    ],
    write: true,
    allowOverwrite: true,
    plugins: [
      {
        name: "ssg-hydration-fix",
        setup(build: any) {
          build.onLoad({ filter: /\.(tsx|jsx)$/ }, (args: any) => {
            try {
              const source = fs.readFileSync(args.path, "utf-8");
              const { result, fixCount } = autoFixAdjacentText(source, args.path);
              if (fixCount > 0) {
                return { contents: result, loader: args.path.endsWith(".tsx") ? "tsx" : "jsx" };
              }
            } catch (e) {
              log.debug("SSG hydration-fix failed for %s: %s", args.path, e);
            }
            return undefined;
          });
        },
      },
      {
        name: "ssg-strip-css",
        setup(build: any) {
          build.onResolve({ filter: /\.module\.css$/ }, (args: any) => ({
            namespace: "ssg-css-module",
            path: args.path,
          }));
          build.onResolve({ filter: /\.css$/ }, (args: any) => ({
            namespace: "ssg-css-plain",
            path: args.path,
          }));
          build.onLoad({ filter: /.*/, namespace: "ssg-css-module" }, () => ({
            contents: "export default new Proxy({},{get:(_,k)=>k});",
            loader: "js",
          }));
          build.onLoad({ filter: /.*/, namespace: "ssg-css-plain" }, () => ({
            contents: "",
            loader: "js",
          }));
        },
      },
    ],
  });

  log.debug("esbuild bundle took %dms", Date.now() - startBundled);
  return { tmpFile };
}
