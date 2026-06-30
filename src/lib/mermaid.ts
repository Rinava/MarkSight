"use client";

import type { MermaidConfig } from "mermaid";

// The `mermaid` package is large (hundreds of KB). Import it lazily the first
// time a diagram is rendered so it never enters the initial client bundle —
// mirroring the deliberate bundle work in `src/lib/syntax-highlighter.ts`.
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

// Each rendered diagram needs a unique id; mermaid uses it for internal SVG
// element ids, and collisions corrupt diagrams when several share a page.
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
    // Match the preview's light/dark Prism styles (oneLight/oneDark).
    theme: isDark ? "dark" : "default",
    // Sanitize diagram labels so untrusted markdown cannot inject markup; also
    // keeps output compatible with the app's strict CSP.
    securityLevel: "strict",
  };
}

/**
 * Render a Mermaid definition to a standalone, self-contained SVG string.
 *
 * Shared by the live preview (`<MermaidDiagram>`) and the export pipeline so
 * both render diagrams identically. Throws if the definition is invalid — the
 * caller is responsible for surfacing the error.
 */
export async function renderMermaid(
  code: string,
  isDark: boolean
): Promise<string> {
  const mermaid = await loadMermaid();
  // Re-initialize per call: cheap, and guarantees the current theme is applied
  // even after a light/dark toggle.
  mermaid.initialize(configFor(isDark));

  renderCounter += 1;
  const id = `marksight-mermaid-${renderCounter}`;

  try {
    const { svg } = await mermaid.render(id, code);
    return svg;
  } finally {
    // mermaid appends a temporary measurement node to the document while
    // rendering and removes it on success; clean up any leftover after an error
    // so failed renders don't accumulate orphan nodes.
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}
