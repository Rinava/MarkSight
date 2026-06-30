"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { renderMermaid } from "@/lib/mermaid";

export interface MermaidDiagramProps {
  code: string;
}

/**
 * Renders a ```mermaid fenced block as an inline SVG diagram in the live
 * preview. The `mermaid` package is dynamically imported via `renderMermaid`,
 * so it stays out of the initial client bundle. Diagrams re-render on theme
 * change to stay in sync with the preview's light/dark Prism styles.
 */
export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    renderMermaid(code, isDark)
      .then((rendered) => {
        if (cancelled) return;
        setSvg(rendered);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSvg(null);
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [code, isDark]);

  if (error) {
    return (
      <div
        role="alert"
        className="not-prose my-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <p className="font-medium">Failed to render Mermaid diagram</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
          {error}
        </pre>
      </div>
    );
  }

  if (svg === null) {
    return (
      <div
        className="not-prose my-4 h-24 animate-pulse rounded-md bg-muted"
        aria-label="Rendering diagram"
        aria-busy="true"
      />
    );
  }

  return (
    <div
      className="not-prose my-4 flex justify-center overflow-x-auto"
      // SVG is produced by mermaid with securityLevel: "strict" (sanitized).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
