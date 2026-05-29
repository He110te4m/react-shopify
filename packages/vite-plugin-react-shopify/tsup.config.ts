import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "runtime/index": "src/runtime/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  shims: true,
  splitting: false,
  external: ["react", "react-dom", "react-dom/server"],
});
