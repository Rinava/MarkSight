"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useTheme } from "next-themes";
import { SyntaxHighlighter, oneDark, oneLight } from "@/lib/syntax-highlighter";

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
          code({ className, children }) {
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
