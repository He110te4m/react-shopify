import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "runtime/Liquid": "src/runtime/Liquid.tsx",
    "runtime/Liquid.client": "src/runtime/Liquid.client.tsx",
    "runtime/settings": "src/runtime/settings.tsx",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  shims: true,
  splitting: false,
  external: ["react", "react-dom", "react-dom/server"],
});
