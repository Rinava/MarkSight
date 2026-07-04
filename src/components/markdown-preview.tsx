"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useTheme } from "next-themes";
import { SyntaxHighlighter, oneDark, oneLight } from "@/lib/syntax-highlighter";
import { MermaidDiagram } from "@/components/mermaid-diagram";

function isMermaidPre(node: unknown): boolean {
  const child = (node as { children?: Array<Record<string, unknown>> })
    ?.children?.[0];
  if (!child || child.tagName !== "code") return false;
  const className = (child.properties as { className?: unknown })?.className;
  return Array.isArray(className) && className.includes("language-mermaid");
}

export interface MarkdownPreviewProps {
  value: string;
  className?: string;
}

/**
 * Memoized: the parent re-renders on every keystroke, but the (debounced)
 * `value` only changes ~10×/s — so react-markdown re-parses on prop changes,
 * not on every keystroke. Theme changes still re-render via context.
 */
export const MarkdownPreview = memo(function MarkdownPreview({
  value,
  className = "ms-prose",
}: MarkdownPreviewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          // Unwrap the <pre> for mermaid blocks; the diagram is its own block.
          pre({ node, children, ...props }) {
            if (isMermaidPre(node)) return <>{children}</>;
            return <pre {...props}>{children}</pre>;
          },
          code({ className: codeClassName, children }) {
            const match = /language-(\w+)/.exec(codeClassName ?? "");

            if (match?.[1] === "mermaid") {
              return <MermaidDiagram code={String(children).replace(/\n$/, "")} />;
            }

            // ReactMarkdown: inline code has no className; code blocks carry a
            // language- class or a trailing newline.
            const isCodeBlock =
              Boolean(codeClassName) || String(children).includes("\n");

            if (!isCodeBlock) {
              // Styled by `.ms-prose :not(pre) > code` in globals.css.
              return <code>{children}</code>;
            }

            return (
              <SyntaxHighlighter
                PreTag="div"
                language={match ? match[1] : "text"}
                style={isDark ? oneDark : oneLight}
                customStyle={{
                  background: "var(--ms-tint)",
                  border: "1px solid var(--ms-border-2)",
                  borderRadius: "9px",
                  padding: "0.9em 1.05em",
                  margin: "1em 0",
                  fontSize: "0.85em",
                  transition: "background-color 0.3s ease",
                }}
                codeTagProps={{
                  style: {
                    fontFamily:
                      "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  },
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
});
