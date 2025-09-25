"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

export interface MarkdownPreviewProps {
  value: string;
}

export function MarkdownPreview({ value }: MarkdownPreviewProps) {
  const content = useMemo(
    function map() {
      return value;
    },
    [value]
  );

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");

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
                style={oneDark}
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
          h1: ({ children }) => (
            <h1
              id={String(children).toLowerCase().replace(/\s+/g, "-")}
              className="scroll-mt-20"
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              id={String(children).toLowerCase().replace(/\s+/g, "-")}
              className="scroll-mt-20"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={String(children).toLowerCase().replace(/\s+/g, "-")}
              className="scroll-mt-20"
            >
              {children}
            </h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
