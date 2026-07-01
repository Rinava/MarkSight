"use client";

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
}

export function MarkdownPreview({ value }: MarkdownPreviewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          // Unwrap the <pre> for mermaid blocks; the diagram is its own block.
          pre({ node, children, ...props }) {
            if (isMermaidPre(node)) return <>{children}</>;
            return <pre {...props}>{children}</pre>;
          },
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className ?? "");

            if (match?.[1] === "mermaid") {
              return <MermaidDiagram code={String(children).replace(/\n$/, "")} />;
            }

            // In ReactMarkdown:
            // - Inline code: no className
            // - Code blocks: className like "language-js" or "language-undefined"
            const isCodeBlock =
              Boolean(className) || String(children).includes("\n");

            if (!isCodeBlock) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono border not-prose">
                  {children}
                </code>
              );
            }

            return (
              <SyntaxHighlighter
                PreTag="div"
                language={match ? match[1] : "text"}
                style={isDark ? oneDark : oneLight}
                customStyle={{
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  transition:
                    "background-color 0.3s ease, box-shadow 0.3s ease",
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
}
