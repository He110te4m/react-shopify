type BlockModifiers = Record<string, boolean | string | undefined>;

interface BlockOptions {
  mix?: string;
  [key: string]: boolean | string | undefined;
}

export function b(block: string, options?: BlockOptions): string {
  if (!options) return block;

  const classes: string[] = [block];

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === false) continue;
    if (key === "mix") {
      classes.push(value as string);
    } else if (value === true) {
      classes.push(`${block}--${key}`);
    }
  }

  return classes.join(" ");
}

type ClsxArg = string | undefined | false | null | Record<string, boolean | string | undefined | null>;

export function clsx(...args: ClsxArg[]): string {
  const parts: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === "string") {
      parts.push(arg);
    } else if (typeof arg === "object") {
      for (const [key, value] of Object.entries(arg)) {
        if (value) parts.push(key);
      }
    }
  }
  return parts.join(" ");
}
