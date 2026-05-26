import vitePluginShopify from "vite-plugin-react-shopify";

export default {
  plugins: [
    vitePluginShopify({
      themeRoot: ".",
      sourceCodeDir: "frontend",
      ssg: {
        enabled: true,
        directories: ["sections", "blocks", "templates"],
      },
    }),
  ],
  build: {
    emptyOutDir: false,
  },
};
