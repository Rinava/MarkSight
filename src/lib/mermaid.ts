"use client";

import type { MermaidConfig } from "mermaid";

// Lazily import the large mermaid bundle on first render, off the initial chunk.
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let renderCounter = 0;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => mod.default);
  }
  return mermaidPromise;
}

function configFor(isDark: boolean): MermaidConfig {
  return {
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    // App defaults only; each diagram's frontmatter / %%{init}%% directives
    // override every non-security key. Strict keeps the injected SVG sanitized.
    securityLevel: "strict",
  };
}

export async function renderMermaid(code: string, isDark: boolean): Promise<string> {
  const mermaid = await loadMermaid();
  mermaid.initialize(configFor(isDark));

  renderCounter += 1;
  const id = `marksight-mermaid-${renderCounter}`;

  try {
    const { svg } = await mermaid.render(id, code);
    return svg;
  } finally {
    // A failed render can leave mermaid's temporary measurement node behind.
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}
