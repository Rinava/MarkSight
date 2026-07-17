"use client";

import type { CSSProperties } from "react";
import { Sparkles } from "lucide-react";
import { MarkdownPreview } from "@/components/markdown-preview";

export interface PreviewPaneProps {
  skillMode: boolean;
  content: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  readingTime: number;
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function PreviewPane({
  skillMode,
  content,
  name,
  description,
  version,
  tags,
  readingTime,
  label,
  className = "",
  style,
}: PreviewPaneProps) {
  return (
    <section
      aria-label="Rendered preview"
      style={style}
      className={`bg-ms-surface flex min-w-0 flex-col ${className}`}
    >
      <div className="border-ms-border-3 flex flex-none items-center justify-between border-b px-4 py-[9px]">
        <span className="text-ms-muted text-[11px] font-semibold tracking-[0.05em] uppercase">
          {label}
        </span>
        <span className="text-ms-muted-2 text-[11px]">{readingTime} min read</span>
      </div>

      <div className="ms-scroll min-h-0 flex-1 overflow-y-auto px-[34px] py-[26px]">
        <div className="max-w-[720px]">
          {skillMode && (
            <div className="border-ms-panel-border bg-ms-panel mb-[22px] rounded-[13px] border px-[18px] py-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Sparkles className="text-ms-primary-ink h-[15px] w-[15px]" aria-hidden="true" />
                <span className="text-ms-primary-strong font-mono text-[15px] font-semibold">
                  {name || "untitled-skill"}
                </span>
                <span className="bg-ms-chip text-ms-label rounded-md px-[7px] py-0.5 text-[11px] font-medium">
                  v{version}
                </span>
              </div>
              <p className="text-ms-label m-0 text-[13.5px] leading-[1.55]">
                {description || "No description yet — add one in the inspector."}
              </p>
              {tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-ms-tint-3 text-ms-label rounded-md px-2 py-0.5 text-[11px] font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <MarkdownPreview value={content} />
        </div>
      </div>
    </section>
  );
}
