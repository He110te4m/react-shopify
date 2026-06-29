import vitePluginShopify from "vite-plugin-react-shopify";

export default {
  build: {
    cssTarget: "chrome90",
  },
  plugins: [
    vitePluginShopify({
      themeRoot: ".",
      sourceCodeDir: "frontend",
      buildDir: "assets",
      ssg: {
        directories: ["sections", "blocks", "templates", "snippets"],
      },
    }),
  ],
};
