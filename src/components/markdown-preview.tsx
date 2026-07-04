"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { useTheme } from "next-themes";
import { SyntaxHighlighter, oneDark, oneLight } from "@/lib/syntax-highlighter";

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
          code({ className: codeClassName, children }) {
            const match = /language-(\w+)/.exec(codeClassName ?? "");

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
