import { Plugin } from "vite";

import { resolveOptions } from "./options";
import type { Options } from "./types";
import shopifyConfig from "./config";
import shopifyHtml from "./html";
import shopifyLiquidNoRefresh from "./liquid-no-refresh";
import shopifyReactRefresh from "./react-refresh";
import shopifySSG from "./ssg";

const vitePluginShopify = (options: Options = {}): Plugin[] => {
  const resolvedOptions = resolveOptions(options);

  const plugins = [
    shopifyConfig(resolvedOptions),
    shopifyHtml(resolvedOptions),
    shopifyLiquidNoRefresh(),
    shopifyReactRefresh(),
    shopifySSG(resolvedOptions),
  ];

  return plugins;
};

export default vitePluginShopify;
