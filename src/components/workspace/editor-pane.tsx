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
      className={`flex min-w-0 flex-col bg-ms-surface-editor ${className}`}
    >
      <div className="flex flex-none items-center justify-between border-b border-ms-border-3 px-4 py-[9px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
          {label}
        </span>
        <span className="font-mono text-[11px] text-ms-muted-2">{fileName}</span>
      </div>

      {skillMode && (
        <div className="flex-none px-4 pt-3">
          <div className="mb-1.5 flex items-center gap-[7px]">
            <Lock className="h-3 w-3 text-ms-muted" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
              Frontmatter · auto-generated
            </span>
          </div>
          <pre className="ms-scroll m-0 overflow-x-auto rounded-[10px] border border-ms-panel-border bg-ms-panel px-3.5 py-3 font-mono text-[12px] leading-[1.6] whitespace-pre-wrap text-ms-ink-body">
            {frontmatter}
          </pre>
          <div className="mt-3.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
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
