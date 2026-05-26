export function Liquid({ code }: { code: string }): any {
  return {
    $$typeof: Symbol.for("react.element"),
    type: "react-liquid",
    props: { dangerouslySetInnerHTML: { __html: code } },
    key: null,
    ref: null,
  };
}
