import fs from "node:fs";
import { fileURLToPath } from "node:url";

export function getPluginVersion(): string {
  for (const relative of ["../../package.json", "../package.json"]) {
    try {
      const file = fileURLToPath(new URL(relative, import.meta.url));
      return JSON.parse(fs.readFileSync(file, "utf-8")).version ?? "unknown";
    } catch {
      // Source and bundled output have different depths.
    }
  }
  return "unknown";
}
