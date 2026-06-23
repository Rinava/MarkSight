"use client";

// Use PrismLight + explicit language registration instead of the full `Prism`
// build, which bundles ~277 languages (refractor) into the client. This keeps
// only the languages we actually highlight, dramatically reducing bundle size.
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markdownLang from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";

const languages: Record<string, Parameters<typeof SyntaxHighlighter.registerLanguage>[1]> = {
  bash,
  shell: bash,
  sh: bash,
  css,
  go,
  javascript,
  js: javascript,
  json,
  jsx,
  markdown: markdownLang,
  md: markdownLang,
  markup,
  html: markup,
  xml: markup,
  python,
  py: python,
  rust,
  rs: rust,
  sql,
  tsx,
  typescript,
  ts: typescript,
  yaml,
  yml: yaml,
};

for (const [name, syntax] of Object.entries(languages)) {
  SyntaxHighlighter.registerLanguage(name, syntax);
}

export { SyntaxHighlighter, oneDark, oneLight };
