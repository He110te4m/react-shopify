import path from "node:path";
import { Plugin, UserConfig } from "vite";
import { logger } from "./logger";
import type { ResolvedOptions } from "./options";

const log = logger("config");

export default function shopifyConfig(options: ResolvedOptions): Plugin {

  return {
    name: "vite-plugin-shopify:config",
    config(config: UserConfig): UserConfig {
      const sourceDirAbs = path.resolve(options.themeRoot, options.sourceCodeDir);

      const generated: UserConfig = {
        base: config.base ?? "./",
        publicDir: config.publicDir ?? false,
        build: {
          outDir: config.build?.outDir ?? path.join(options.themeRoot, options.buildDir),
          assetsDir: config.build?.assetsDir ?? "",
          emptyOutDir: config.build?.emptyOutDir ?? false,
          manifest: config.build?.manifest ?? true,
          minify: config.build?.minify ?? (options.debug ? false : undefined),
          sourcemap: config.build?.sourcemap ?? (options.debug ? true : undefined),
          rollupOptions: {
            ...config.build?.rollupOptions,
            external: [
              ...(Array.isArray(config.build?.rollupOptions?.external)
                ? (config.build.rollupOptions.external as string[])
                : []),
              "react",
              "react-dom/client",
            ],
            output: {
              ...config.build?.rollupOptions?.output,
              entryFileNames: "[name]-[hash].js",
              chunkFileNames: "[name]-[hash].js",
              assetFileNames: "[name]-[hash][extname]",
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
