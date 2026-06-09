import vitePluginShopify from "vite-plugin-react-shopify";

const isDebug = process.env.BUILD_DEBUG === "1";

export default {
  plugins: [
    vitePluginShopify({
      themeRoot: ".",
      sourceCodeDir: "frontend",
      buildDir: "assets",
      chunkPrefix: "react-shopify-example-",
      debug: isDebug,
      ssg: {
        directories: ["sections", "blocks", "templates", "snippets"],
      },
    }),
  ],
};
