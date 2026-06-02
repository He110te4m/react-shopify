/**
 * @file Vite configuration plugin for Shopify theme development.
 *
 * Merges sensible defaults for build output, module resolution, dev server,
 * CSS modules, and manual chunk splitting (react / react-dom) into the Vite
 * config. Detects watch mode via CLI flags or `SHOPIFY_DEV_WATCH` env var
 * to toggle sourcemaps and minification.
 */

import path from "node:path";
import { Plugin, UserConfig } from "vite";
import { logger } from "./logger";
import type { ResolvedOptions } from "./options";

const log = logger("config");

/** Detect if Vite is running in watch/dev mode. */
function isWatchMode(): boolean {
  return process.argv.includes("--watch") || process.env.SHOPIFY_DEV_WATCH === "1";
}

/**
 * Vite plugin that provides default build, resolve, server, and CSS config
 * for React Shopify theme projects.
 */
export default function shopifyConfig(options: ResolvedOptions): Plugin {
  return {
    name: "vite-plugin-shopify:config",
    config(config: UserConfig): UserConfig {
      const sourceDirAbs = path.resolve(options.themeRoot, options.sourceCodeDir);
      const watch = isWatchMode();

      log.debug("watch=%s", watch);

      const generated: UserConfig = {
        base: config.base ?? "./",
        publicDir: config.publicDir ?? false,
        build: {
          outDir: config.build?.outDir ?? path.join(options.themeRoot, options.buildDir),
          assetsDir: config.build?.assetsDir ?? "",
          emptyOutDir: config.build?.emptyOutDir ?? true,
          manifest: config.build?.manifest ?? true,
          minify: config.build?.minify ?? (watch || options.debug ? false : undefined),
          sourcemap: config.build?.sourcemap ?? (watch || options.debug ? "inline" : undefined),
          rolldownOptions: {
            ...(config.build?.rolldownOptions ?? config.build?.rollupOptions),
            external: Array.isArray((config.build?.rolldownOptions ?? config.build?.rollupOptions)?.external)
              ? ((config.build?.rolldownOptions ?? config.build?.rollupOptions)!.external as string[])
              : [],
            output: {
              ...(config.build?.rolldownOptions ?? config.build?.rollupOptions)?.output,
              entryFileNames: "[name]-[hash].js",
              chunkFileNames(chunkInfo: any) {
                if (["react", "react-dom"].includes(chunkInfo.name)) {
                  return `${chunkInfo.name}.js`;
                }
                return "[name]-[hash].js";
              },
              assetFileNames: "[name]-[hash][extname]",
              manualChunks(id) {
                if (id.includes("/node_modules/react-dom/")) {
                  return "react-dom";
                }
                if (id.includes("/node_modules/react/") || id.includes("/node_modules/scheduler/")) {
                  return "react";
                }
              },
            },
          },
        },
        resolve: {
          alias: Array.isArray(config.resolve?.alias)
            ? [
                ...config.resolve.alias,
                { find: "~", replacement: sourceDirAbs },
                { find: "@", replacement: sourceDirAbs },
              ]
            : {
                "~": sourceDirAbs,
                "@": sourceDirAbs,
                ...(config.resolve?.alias as Record<string, string>),
              },
        },
        server: {
          host: config.server?.host ?? "localhost",
          https: config.server?.https,
          port: config.server?.port ?? 5173,
          cors: config.server?.cors ?? {
            origin: [
              /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
              /\.myshopify\.com$/,
            ],
          },
        },
        css: {
          modules: config.css?.modules,
        },
      };

      log.debug("generated config: %O", generated);
      return generated;
    },
  };
}
