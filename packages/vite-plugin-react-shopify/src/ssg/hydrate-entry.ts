import fs from "node:fs";
import path from "node:path";
import { normalizePath } from "vite";
import type { ResolvedOptions } from "../options";
import type { SSGEntry } from "../types";

export function generateHydrateEntry(entry: SSGEntry, options: ResolvedOptions): void {
  const type = entry.meta.type ?? entry.targetType;
  const sourceCodeAbs = path.resolve(options.themeRoot, options.sourceCodeDir);
  const componentRelPath = normalizePath(path.relative(sourceCodeAbs, entry.filePath));

  const content = `import { hydrateRoot } from 'react-dom/client'
import Component from '~/${componentRelPath}'

const roots = document.querySelectorAll('[data-section-id]')
roots.forEach(section => {
  const hydrateEls = section.querySelectorAll('[data-ssg-hydrate]')
  hydrateEls.forEach(el => {
    hydrateRoot(el, <Component />)
  })
})
`;

  const hydrateDir = path.resolve(
    options.themeRoot,
    options.sourceCodeDir,
    "entrypoints",
    "_ssg-hydrate",
  );
  if (!fs.existsSync(hydrateDir)) {
    fs.mkdirSync(hydrateDir, { recursive: true });
  }

  const fileName = `${entry.kebabName}.tsx`;
  fs.writeFileSync(path.resolve(hydrateDir, fileName), content);
}
