export const ICONS = [
  "cart",
  "close",
  "search",
  "arrow",
  "hamburger",
  "play",
  "caret",
  "plus",
  "minus",
  "checkmark",
  "remove",
  "account",
  "error",
  "success",
  "zoom",
  "pause",
  "share",
  "copy",
] as const;

export type IconName = (typeof ICONS)[number];
