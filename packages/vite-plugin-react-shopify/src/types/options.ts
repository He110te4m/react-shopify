export interface Options {
  themeRoot?: string;
  sourceCodeDir?: string;
  snippetFile?: string;
  buildDir?: string;
  debug?: boolean;
  ssg?: SSGOptions;
  importMap?: ImportMapOptions;
}

export interface SSGOptions {
  directories?: string[];
  prefix?: {
    template?: string;
    section?: string;
    block?: string;
    snippet?: string;
  };
  outputName?: string;
  cssPrefix?: string;
}

export interface ImportMapOptions {
  react?: string;
  reactDomClient?: string;
}
