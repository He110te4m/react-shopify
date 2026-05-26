import { createElement } from "react";

export function Liquid({ code }: { code: string }) {
  return createElement("react-liquid", {
    dangerouslySetInnerHTML: { __html: code },
  });
}
