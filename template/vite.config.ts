import vitePluginShopify from "vite-plugin-react-shopify";

export default {
  plugins: [
    vitePluginShopify({
      themeRoot: ".",
      sourceCodeDir: "frontend",
      buildDir: "assets/build",
      ssg: {
        directories: ["sections", "blocks", "templates", "snippets"],
      },
    }),
  ],
};
