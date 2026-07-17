"use client";

import type { CSSProperties, RefObject } from "react";
import { Lock } from "lucide-react";
import { MarkdownEditor, type MarkdownEditorRef } from "@/components/markdown-editor";

export interface EditorPaneProps {
  skillMode: boolean;
  content: string;
  onChange: (next: string) => void;
  editorRef: RefObject<MarkdownEditorRef | null>;
  /** Auto-generated SKILL.md frontmatter block (skill mode only). */
  frontmatter: string;
  fileName: string;
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function EditorPane({
  skillMode,
  content,
  onChange,
  editorRef,
  frontmatter,
  fileName,
  label,
  className = "",
  style,
}: EditorPaneProps) {
  return (
    <section
      aria-label="Markdown editor"
      style={style}
      className={`bg-ms-surface-editor flex min-w-0 flex-col ${className}`}
    >
      <div className="border-ms-border-3 flex flex-none items-center justify-between border-b px-4 py-[9px]">
        <span className="text-ms-muted text-[11px] font-semibold tracking-[0.05em] uppercase">
          {label}
        </span>
        <span className="text-ms-muted-2 font-mono text-[11px]">{fileName}</span>
      </div>

      {skillMode && (
        <div className="flex-none px-4 pt-3">
          <div className="mb-1.5 flex items-center gap-[7px]">
            <Lock className="text-ms-muted h-3 w-3" aria-hidden="true" />
            <span className="text-ms-muted text-[10px] font-semibold tracking-[0.05em] uppercase">
              Frontmatter · auto-generated
            </span>
          </div>
          <pre className="ms-scroll border-ms-panel-border bg-ms-panel text-ms-ink-body m-0 overflow-x-auto rounded-[10px] border px-3.5 py-3 font-mono text-[12px] leading-[1.6] whitespace-pre-wrap">
            {frontmatter}
          </pre>
          <div className="text-ms-muted mt-3.5 text-[10px] font-semibold tracking-[0.05em] uppercase">
            Instructions · your markdown
          </div>
        </div>
      )}

      <MarkdownEditor
        ref={editorRef}
        value={content}
        onChange={onChange}
        bare
        showToolbar={false}
      />
    </section>
  );
}
