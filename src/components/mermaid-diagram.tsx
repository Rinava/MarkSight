"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { renderMermaid } from "@/lib/mermaid";

export interface MermaidDiagramProps {
  code: string;
}

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
        className="not-prose border-destructive/50 bg-destructive/10 text-destructive my-4 rounded-md border p-3 text-sm"
      >
        <p className="font-medium">Failed to render Mermaid diagram</p>
        <pre className="mt-2 overflow-x-auto font-mono text-xs whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  if (svg === null) {
    return (
      <div
        className="not-prose bg-muted my-4 h-24 animate-pulse rounded-md"
        aria-label="Rendering diagram"
        aria-busy="true"
      />
    );
  }

  return (
    <div
      className="not-prose my-4 flex justify-center overflow-x-auto"
      // Sanitized by mermaid (securityLevel: "strict") before injection.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
