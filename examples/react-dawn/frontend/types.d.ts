import React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "slider-component": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      "deferred-media": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "data-media-id"?: string;
      };
    }
  }
}
