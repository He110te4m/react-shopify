import { parseSync } from "oxc-parser";
import { walk } from "oxc-walker";

const INTERACTIVE_HOOKS = new Set(["useState","useReducer","useRef","useEffect","useLayoutEffect","useInsertionEffect","useCallback","useMemo"]);
const EVENT_HANDLER_RE = /^on[A-Z]/;

export function isStaticComponent(source: string, filePath: string): boolean {
  let hasInteraction = false;
  const parseResult = parseSync(filePath, source);
  walk(parseResult.program, { enter(node: any) {
    if (hasInteraction) return;
    if (node.type === "CallExpression" && node.callee?.type === "Identifier" && INTERACTIVE_HOOKS.has(node.callee.name)) { hasInteraction = true; }
    if (node.type === "JSXAttribute" && node.name?.type === "JSXIdentifier" && EVENT_HANDLER_RE.test(node.name.name)) { hasInteraction = true; }
  }});
  return !hasInteraction;
}
