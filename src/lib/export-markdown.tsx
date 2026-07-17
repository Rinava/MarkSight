"use client";

import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { SyntaxHighlighter, oneLight } from "@/lib/syntax-highlighter";
import { renderMermaid } from "@/lib/mermaid";

// Standard monospace stack — Geist (loaded via next/font in the app) is not
// available in the standalone export document, so use a portable fallback.
const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mermaidError(error: unknown): string {
  const message = escapeHtml(error instanceof Error ? error.message : String(error));
  return `<div class="mermaid-error"><strong>Failed to render Mermaid diagram</strong><pre>${message}</pre></div>`;
}

// Shared component map. `onMermaid` returns the inner HTML to inject for a
// mermaid block, or `null` during the collection pass.
function makeComponents(onMermaid: (code: string) => string | null): Components {
  return {
    // The `code` component renders every code block into its own container (a
    // highlighter <pre>, a mermaid diagram, or inline code), so the default
    // <pre> wrapper would only double-nest. Drop it.
    pre({ children }) {
      return <>{children}</>;
    },
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className ?? "");

      if (match?.[1] === "mermaid") {
        const inner = onMermaid(String(children).replace(/\n$/, ""));
        if (inner === null) return null;
        return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: inner }} />;
      }

      const isCodeBlock = Boolean(className) || String(children).includes("\n");

      if (!isCodeBlock) {
        return <code className="inline-code">{children}</code>;
      }

      // Same Prism highlighter and language set as the live preview, so the
      // export matches it. oneLight pairs with the export's light page.
      return (
        <SyntaxHighlighter
          PreTag="pre"
          language={match ? match[1] : "text"}
          style={oneLight}
          customStyle={{
            margin: "1rem 0",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "0.85em",
            breakInside: "avoid",
          }}
          codeTagProps={{ style: { fontFamily: MONO_STACK } }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    },
  };
}

/**
 * Render markdown to a self-contained HTML body for export.
 *
 * Uses the same `react-markdown` + Prism (`SyntaxHighlighter`) pipeline as the
 * live preview so code highlighting and GFM behavior match exactly, and inlines
 * mermaid diagrams as SVG so the document needs no runtime script.
 *
 * Two passes over an identical tree: the first collects mermaid sources in
 * document order, each is rendered to SVG (async), and the second substitutes
 * them back in. Identical traversal guarantees the order lines up.
 */
export async function renderExportBody(content: string): Promise<string> {
  const codes: string[] = [];
  renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={makeComponents((code) => {
        codes.push(code);
        return null;
      })}
    >
      {content}
    </ReactMarkdown>
  );

  // Render diagrams with the light theme to match the light export page.
  // Sequential because mermaid relies on shared global/DOM state.
  const diagrams: string[] = [];
  for (const code of codes) {
    try {
      diagrams.push(await renderMermaid(code, false));
    } catch (error) {
      diagrams.push(mermaidError(error));
    }
  }

  let index = 0;
  return renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents(() => diagrams[index++])}>
      {content}
    </ReactMarkdown>
  );
}
