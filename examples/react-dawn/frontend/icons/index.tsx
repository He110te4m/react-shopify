import type { IconName } from "./icons";

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  const vbox = viewBoxes[name];
  return (
    <svg className={className} viewBox={vbox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {pathMap[name]}
    </svg>
  );
}

const viewBoxes: Record<IconName, string> = {
  cart: "0 0 40 40",
  close: "0 0 18 17",
  search: "0 0 18 19",
  arrow: "0 0 14 10",
  hamburger: "0 0 20 16",
  play: "0 0 10 14",
  caret: "0 0 10 6",
  plus: "0 0 10 10",
  minus: "0 0 10 1",
  checkmark: "0 0 12 10",
  remove: "0 0 13 13",
  account: "0 0 18 19",
  error: "0 0 13 13",
  success: "0 0 13 13",
  zoom: "0 0 10 10",
  pause: "0 0 10 14",
  share: "0 0 20 20",
  copy: "0 0 20 20",
};

import { jsx } from "react/jsx-runtime";
type JSXNode = ReturnType<typeof jsx>;

const pathMap: Record<IconName, JSXNode> = {
  cart: jsx("path", { fill: "currentColor", fillRule: "evenodd", d: "M20.5 6.5a4.75 4.75 0 0 0-4.75 4.75v.56h-3.16l-.77 11.6a5 5 0 0 0 4.99 5.34h7.38a5 5 0 0 0 4.99-5.33l-.77-11.6h-3.16v-.57A4.75 4.75 0 0 0 20.5 6.5m3.75 5.31v-.56a3.75 3.75 0 1 0-7.5 0v.56zm-7.5 1h7.5v.56a3.75 3.75 0 1 1-7.5 0zm-1 0v.56a4.75 4.75 0 1 0 9.5 0v-.56h2.22l.71 10.67a4 4 0 0 1-3.99 4.27h-7.38a4 4 0 0 1-4-4.27l.72-10.67z" }),
  close: jsx("path", { fill: "currentColor", d: "M.865 15.978a.5.5 0 0 0 .707.707l7.433-7.431 7.579 7.282a.501.501 0 0 0 .846-.37.5.5 0 0 0-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 1 0-.707-.708L8.991 7.853 1.413.573a.5.5 0 1 0-.693.72l7.563 7.268z" }),
  search: jsx("path", { fill: "currentColor", fillRule: "evenodd", d: "M11.03 11.68A5.784 5.784 0 1 1 2.85 3.5a5.784 5.784 0 0 1 8.18 8.18m.26 1.12a6.78 6.78 0 1 1 .72-.7l5.4 5.4a.5.5 0 1 1-.71.7z", clipRule: "evenodd" }),
  arrow: jsx("path", { d: "M8.537.808a.5.5 0 0 1 .817-.162l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 1 1-.708-.708L11.793 5.5H1a.5.5 0 0 1 0-1h10.793L8.646 1.354a.5.5 0 0 1-.109-.546", fill: "currentColor" }),
  hamburger: jsx("path", { d: "M2 0a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V1a1 1 0 0 0-1-1zm0 6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1zm0 6a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z", fill: "currentColor" }),
  play: jsx("path", { d: "M10 0 0 14h10z", fill: "currentColor" }),
  caret: jsx("path", { d: "m5 0 5 5-5 5z", fill: "currentColor" }),
  plus: jsx("path", { d: "M6 4.5a.5.5 0 0 0-1 0V9H.5a.5.5 0 0 0 0 1H5v4.5a.5.5 0 0 0 1 0V10h4.5a.5.5 0 0 0 0-1H6z", fill: "currentColor" }),
  minus: jsx("path", { d: "M9.5 4a.5.5 0 0 0 0 1h-9a.5.5 0 0 0 0 1h9z", fill: "currentColor" }),
  checkmark: jsx("path", { d: "M9.293 0 4 5.293 2.707 4l-.707.707L4 6.707 10.293.4z", fill: "currentColor" }),
  remove: jsx("path", { d: "M11.8 13a.5.5 0 0 0 0-.7L8.5 8l3.3-3.3a.5.5 0 0 0-.7-.7L7.8 7.3 4.5 4a.5.5 0 0 0-.7.7L7.1 8 3.8 11.3a.5.5 0 0 0 0 .7.5.5 0 0 0 .7 0l3.3-3.3 3.3 3.3a.5.5 0 0 0 .7 0", fill: "currentColor" }),
  account: jsx("path", { d: "M17 8.5a7.5 7.5 0 0 1-3.247 6.14l-.006.003c-.224.124-.345.312-.345.426v.781c0 .42-.395.65-.841.65h-3.122c-.443 0-.939-.229-.939-.547v-.164c-.002-1.207-1.115-1.181-1.12-1.008-.002.76-.753 1.172-1.4 1.172H2.913c-.68 0-1.413-.413-1.413-1.175v-.854c-.115-.13-.27-.14-.329-.07a7.5 7.5 0 1 1 15.83 0zM9.62 13.82a1.262 1.262 0 0 0 1.67 0c.3-.248.752-.373 1.191-.352h.165c.765 0 .995-.548.995-.867V11.55c0-.39.296-.667.396-.367.36 1.09.815 2.228 1.268 3.371A6.469 6.469 0 0 0 18 8.5 6.5 6.5 0 0 0 5 8.5a6.47 6.47 0 0 0 2.693 6.053c.452-.857.908-1.995 1.268-3.371.1-.3.396-.023.396.367v1.05c0 .225.23.868.995.868h.165c.439-.022.891.103 1.191.352zM2.5 8.5a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0", fill: "currentColor", fillRule: "evenodd" }),
  error: jsx("path", { d: "M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11m3.052-3.699a.525.525 0 0 1-.743.743L6.501 7.236 4.193 9.543a.525.525 0 1 1-.743-.743l2.308-2.307-2.307-2.307a.526.526 0 1 1 .743-.743L6.5 5.75 8.807 3.443a.525.525 0 0 1 .743.743L7.243 6.493z", fill: "currentColor" }),
  success: jsx("path", { d: "M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11m2.696-5.956a.712.712 0 1 0-1.007-1.007L5.777 7.449l-.466-.467a.712.712 0 0 0-1.007 1.008l.97.969a.712.712 0 0 0 1.007 0z", fill: "currentColor" }),
  zoom: jsx("path", { d: "M10 9.23 7.082 6.313a4.133 4.133 0 1 0-.77.77L9.23 10zm-7.053-4.73a2.867 2.867 0 1 1 5.734 0 2.867 2.867 0 0 1-5.734 0", fill: "currentColor" }),
  pause: jsx("path", { d: "M2 0H0v14h2zm8 0H8v14h2z", fill: "currentColor" }),
  share: jsx("path", { d: "M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.448.868l-6.718-3.12a2.5 2.5 0 1 1 0-3.24l6.718-3.12A2.5 2.5 0 0 1 11 2.5", fill: "currentColor" }),
  copy: jsx("path", { d: "M10 1a1 1 0 0 1 1 1v2h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1V2a1 1 0 0 1 1-1zm1 4H5v7h6zM7 4h2V2H7z", fill: "currentColor" }),
};
