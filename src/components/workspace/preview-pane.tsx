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
      className={`flex min-w-0 flex-col bg-ms-surface ${className}`}
    >
      <div className="flex flex-none items-center justify-between border-b border-ms-border-3 px-4 py-[9px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
          {label}
        </span>
        <span className="text-[11px] text-ms-muted-2">{readingTime} min read</span>
      </div>

      <div className="ms-scroll min-h-0 flex-1 overflow-y-auto px-[34px] py-[26px]">
        <div className="max-w-[720px]">
          {skillMode && (
            <div className="mb-[22px] rounded-[13px] border border-ms-panel-border bg-ms-panel px-[18px] py-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Sparkles
                  className="h-[15px] w-[15px] text-ms-primary-ink"
                  aria-hidden="true"
                />
                <span className="font-mono text-[15px] font-semibold text-ms-primary-strong">
                  {name || "untitled-skill"}
                </span>
                <span className="rounded-md bg-ms-chip px-[7px] py-0.5 text-[11px] font-medium text-ms-label">
                  v{version}
                </span>
              </div>
              <p className="m-0 text-[13.5px] leading-[1.55] text-ms-label">
                {description ||
                  "No description yet — add one in the inspector."}
              </p>
              {tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-ms-tint-3 px-2 py-0.5 text-[11px] font-medium text-ms-label"
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
