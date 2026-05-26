import vitePluginShopify from "vite-plugin-react-shopify";

export default {
  plugins: [
    vitePluginShopify({
      themeRoot: ".",
      sourceCodeDir: "frontend",
      ssg: {
        directories: ["sections", "blocks", "templates"],
      },
    }),
  ],
  build: {
    emptyOutDir: false,
  },
};
