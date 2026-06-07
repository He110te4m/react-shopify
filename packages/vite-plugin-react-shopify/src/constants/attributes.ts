/**
 * Centralised constants for attribute names, selectors, element tags,
 * and globalThis registry keys used across the plugin.
 */
export const ATTR_HYDRATE = 'data-ssg-h' as const;
export const ATTR_COMPONENT = 'data-ssg-component' as const;
export const ATTR_LIQUID_BRIDGE = 'data-ssg-liquid' as const;
export const ATTR_ISLAND = 'data-ssg-i' as const;

export const SEL_HYDRATE = `[${ATTR_HYDRATE}]` as const;
export const SEL_ISLAND = `[${ATTR_ISLAND}]` as const;

export const TAG_ISLAND = 'shopify-island' as const;
export const TAG_BLOCK_SLOT = 'shopify-block-slot' as const;

export const BRIDGE_ID = 'ssg' as const;

export const BLOCKS_CAPTURE_KEY = '__blocks__' as const;

export const GW_TARGET = '__shopify_ssg_target' as const;
export const GW_TRACK = '__shopify_ssg_liquid_track' as const;
export const GW_BLOCKS = '__shopify_ssg_liquid_blocks' as const;
export const GW_FILTERS = '__shopify_ssg_liquid_filters' as const;
export const GW_TRACK_MAP = '__shopify_ssg_tracked' as const;
export const GW_ISLAND_COUNTER = '__shopify_ssg_island_counter' as const;

export const EVENT_SECTION_LOAD = 'shopify:section:load' as const;
export const EVENT_SECTION_UNLOAD = 'shopify:section:unload' as const;

export const VIRTUAL_ENTRY_PREFIX = 'shopify:entry:' as const;
export const VIRTUAL_RUNTIME = 'vite-plugin-shopify/runtime' as const;
export const VIRTUAL_RUNTIME_RESOLVED = '\0vite-plugin-shopify:runtime' as const;
