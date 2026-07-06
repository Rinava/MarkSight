"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CircleCheck,
  Github,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { FooterContributors } from "@/components/contributors";
import { MarkdownToolbar } from "@/components/markdown-toolbar";
import { MarkdownEditorRef } from "@/components/markdown-editor";
import { TooltipProvider, Tip } from "@/components/ui/base/tooltip";

import { EditorPane } from "./editor-pane";
import { PreviewPane } from "./preview-pane";
import { OutlineRail } from "./outline-rail";
import { SkillInspector } from "./skill-inspector";
import { ExportMenu } from "./export-menu";
import { OpenSkillMenu } from "./open-skill-menu";
import { ViewSwitch, type ViewMode } from "./view-switch";
import { MarkdownGuide } from "./markdown-guide";

import { useContent } from "@/contexts/content-context";
import { useSkillMeta } from "@/contexts/skill-meta-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { useLocalStorage } from "@/lib/use-local-storage";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { documentMetrics } from "@/lib/markdown/metrics";
import { buildSkillMd } from "@/lib/skill/build";

const GITHUB_URL = "https://github.com/Rinava/MarkSight";
const PORTFOLIO_URL = "https://laramateo.com";

const STARTER = `# Welcome to MarkSight

A calm, distraction-free **markdown workspace** — write on the left, watch it render live on the right.

## Getting started

- Use the **toolbar** to format text, or memorise the shortcuts
- Toggle **Editor / Split / Preview** from the view switch
- Turn any document into an agent **Skill** with one click

> Tip: everything stays local. Nothing leaves your browser.

## Turning this into a Skill

Press **Create skill** in the header. This document becomes the skill's
instructions — you just add a name, a description and any bundled files,
then export a ready-to-use \`SKILL.md\` folder.

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Diagrams

Fenced \`mermaid\` blocks render live — and export as inline SVG:

\`\`\`mermaid
graph LR
  A[Type Markdown] --> B[Live Preview]
  B --> C{Export?}
  C -->|HTML| D[Styled HTML]
  C -->|PDF| E[Print-ready PDF]
  C -->|Skill| F[SKILL.md]
\`\`\`

---

Happy writing.`;

const ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-[9px] border border-ms-border-2 bg-ms-surface text-ms-label transition-colors hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink";

const TOOLBAR_BTN =
  "flex h-[34px] flex-none items-center gap-1.5 rounded-[9px] border px-2.5 text-[12.5px] font-medium transition-colors";

function frontmatterBlock(md: string) {
  const match = md.match(/^---\n[\s\S]*?\n---/);
  return match ? match[0] : "";
}

export function Workspace() {
  const [value, setValue] = useLocalStorage({
    key: "marksight-markdown-content",
    defaultValue: STARTER,
  });
  const debounced = useDebouncedValue(value, { delayMs: 100 });

  const { setContent, registerDocumentReplacer } = useContent();
  const { meta, validation } = useSkillMeta();
  const { trackDocumentChange, trackClear, trackReset, trackEditorInteraction } =
    useAnalytics();

  const [skillMode, setSkillMode] = useState(false);
  const [view, setView] = useState<ViewMode>("split");
  const [ratio, setRatio] = useState(50);
  const [guideOpen, setGuideOpen] = useState(false);

  const editorRef = useRef<MarkdownEditorRef | null>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const resizeAbortRef = useRef<AbortController | null>(null);

  // Publish the (debounced) document to the shared content context.
  useEffect(() => {
    setContent(debounced);
    trackDocumentChange(debounced);
  }, [debounced, setContent, trackDocumentChange]);

  const handleValueChange = useCallback(
    (next: string) => {
      setValue(next);
    },
    [setValue],
  );

  // Let menus (import / template) replace the document through the same
  // undo-friendly path as normal edits.
  useEffect(() => {
    registerDocumentReplacer(handleValueChange);
    return () => registerDocumentReplacer(null);
  }, [registerDocumentReplacer, handleValueChange]);

  const handleClear = useCallback(() => {
    // Snapshot the pre-clear text so Undo restores it even if the user keeps
    // typing while the toast is still visible.
    const snapshot = value;
    setValue("");
    trackClear();
    toast.success("Document cleared", {
      description: "All content has been removed from the editor.",
      action: {
        label: "Undo",
        onClick: () => setValue(snapshot),
      },
    });
  }, [value, setValue, trackClear]);

  const handleReset = useCallback(() => {
    const snapshot = value;
    setValue(STARTER);
    trackReset();
    toast.success("Document reset to the welcome guide", {
      description: "Your previous content was replaced.",
      action: {
        label: "Undo",
        onClick: () => setValue(snapshot),
      },
    });
  }, [value, setValue, trackReset]);

  const toolbarInsert = useCallback(
    (text: string, cursorOffset?: number, replaceFrom?: number, replaceTo?: number) => {
      editorRef.current?.insertText(text, cursorOffset, replaceFrom, replaceTo);
      // Log only the interaction kind — never the inserted text (it embeds
      // the user's selected document content).
      trackEditorInteraction("toolbar_insert");
    },
    [trackEditorInteraction],
  );

  const getCurrentContext = useCallback(
    () =>
      editorRef.current?.getCurrentContext() ?? {
        text: value,
        selection: { from: 0, to: 0 },
      },
    [value],
  );

  const toggleSkill = useCallback(() => {
    setSkillMode((on) => !on);
  }, []);

  // Detach any in-flight drag listeners if we unmount mid-drag (the mouseup
  // that normally removes them would never fire), and clear the body styles.
  useEffect(
    () => () => {
      resizeAbortRef.current?.abort();
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    [],
  );

  const startResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    resizeAbortRef.current?.abort();
    const controller = new AbortController();
    resizeAbortRef.current = controller;
    const { signal } = controller;
    const move = (moveEvent: MouseEvent) => {
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const pct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setRatio(Math.min(80, Math.max(20, pct)));
    };
    const up = () => {
      controller.abort();
      resizeAbortRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move, { signal });
    window.addEventListener("mouseup", up, { signal });
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const metrics = useMemo(() => documentMetrics(value), [value]);
  const readingTime = Math.max(1, Math.round(metrics.wordCount / 200));
  const currentYear = new Date().getFullYear();
  const showEditor = view !== "preview";
  const showPreview = view !== "edit";
  const isSplit = view === "split";

  const skillName = meta.name || "skill-name";
  const editorStyle = isSplit ? { flex: `${ratio} 1 0%` } : undefined;
  const previewStyle = isSplit ? { flex: `${100 - ratio} 1 0%` } : undefined;

  return (
    <TooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-ms-app font-sans text-ms-ink">
        {/* ── Header ── */}
        <header className="flex h-[58px] flex-none items-center gap-3.5 border-b border-ms-border bg-ms-surface px-[18px]">
          <Logo />
          <div className="flex-1" />

          {skillMode && (
            <div
              className={`ms-slide flex items-center gap-2 rounded-full px-3 py-1.5 ${
                validation.valid
                  ? "bg-ms-tint text-ms-primary-ink"
                  : "bg-ms-warn-bg text-ms-warn"
              }`}
            >
              {validation.valid ? (
                <CircleCheck className="h-[15px] w-[15px]" aria-hidden="true" />
              ) : (
                <TriangleAlert className="h-[15px] w-[15px]" aria-hidden="true" />
              )}
              <span className="text-[12.5px] font-semibold">
                {validation.valid ? "Ready to package" : "Needs attention"}
              </span>
            </div>
          )}

          <OpenSkillMenu onEnterSkill={() => setSkillMode(true)} />

          <button
            type="button"
            onClick={toggleSkill}
            className={`flex h-[34px] items-center gap-[7px] rounded-[9px] text-[13px] font-semibold ${
              skillMode
                ? "border border-ms-border-hover bg-ms-tint px-[13px] text-ms-primary-ink transition-colors hover:border-ms-primary hover:bg-ms-tint-3"
                : "bg-ms-primary px-[15px] text-white shadow-[var(--ms-shadow-primary)] transition-[filter] hover:brightness-[1.07]"
            }`}
          >
            <Sparkles className="h-[15px] w-[15px]" aria-hidden="true" />
            <span>{skillMode ? "Skill mode" : "Create skill"}</span>
          </button>

          <div className="h-[22px] w-px bg-ms-border" />

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="hidden items-center gap-1.5 text-[13px] font-medium text-ms-label transition-colors hover:text-ms-primary-ink sm:inline-flex"
          >
            <BookOpen className="h-[15px] w-[15px]" aria-hidden="true" />
            Guide
          </button>

          <Link
            href="/about"
            className="hidden text-[13px] font-medium text-ms-label transition-colors hover:text-ms-primary-ink sm:inline"
          >
            About
          </Link>

          <ThemeToggle />

          <Tip label="View on GitHub">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on GitHub"
              className={ICON_BTN}
            >
              <Github className="h-[17px] w-[17px]" aria-hidden="true" />
            </a>
          </Tip>
        </header>

        {/* ── Toolbar ── */}
        <div className="flex flex-none flex-wrap items-center gap-2.5 border-b border-ms-border bg-ms-surface-2 px-3.5 py-2">
          {/* Formatting acts on the editor; hide it (and its shortcuts) in
              Preview-only view where the editor is unmounted. */}
          {showEditor ? (
            <MarkdownToolbar
              onInsert={toolbarInsert}
              getCurrentContext={getCurrentContext}
            />
          ) : (
            <div className="flex-1" />
          )}
          <div className="flex flex-none items-center gap-1.5">
            <Tip label="Reset to the welcome guide">
              <button
                type="button"
                onClick={handleReset}
                className={`${TOOLBAR_BTN} border-ms-border-2 text-ms-muted-3 hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink`}
              >
                <RotateCcw className="h-[15px] w-[15px]" aria-hidden="true" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </Tip>
            <Tip label="Clear the document">
              <button
                type="button"
                onClick={handleClear}
                className={`${TOOLBAR_BTN} border-ms-border-2 text-ms-danger hover:border-ms-danger-border hover:bg-ms-danger-bg`}
              >
                <Trash2 className="h-[15px] w-[15px]" aria-hidden="true" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </Tip>
          </div>
          <div className="h-[22px] w-px flex-none bg-ms-border" />
          <ViewSwitch view={view} onChange={setView} />
          <ExportMenu
            skillMode={skillMode}
            content={debounced}
            filename="marksight-document"
          />
        </div>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1">
          <div ref={splitRef} className="flex min-w-0 flex-1">
            {showEditor && (
              <EditorPane
                skillMode={skillMode}
                content={value}
                onChange={handleValueChange}
                editorRef={editorRef}
                frontmatter={frontmatterBlock(buildSkillMd(meta, ""))}
                fileName={skillMode ? `${skillName}/SKILL.md` : "welcome.md"}
                label={skillMode ? "SKILL.md" : "Markdown"}
                className={showEditor && !isSplit ? "flex-1" : ""}
                style={editorStyle}
              />
            )}

            {isSplit && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize editor and preview panes"
                aria-valuenow={Math.round(ratio)}
                aria-valuemin={20}
                aria-valuemax={80}
                tabIndex={0}
                onMouseDown={startResize}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    setRatio((r) => Math.max(20, r - 2));
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    setRatio((r) => Math.min(80, r + 2));
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    setRatio(20);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    setRatio(80);
                  }
                }}
                className="flex w-[7px] flex-none cursor-col-resize items-center justify-center border-x border-ms-border bg-ms-tint-2 outline-none focus-visible:bg-ms-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ms-primary"
              >
                <div className="h-[34px] w-[3px] rounded-[3px] bg-ms-scroll-thumb" />
              </div>
            )}

            {showPreview && (
              <PreviewPane
                skillMode={skillMode}
                content={debounced}
                name={meta.name}
                description={meta.description}
                version={meta.version ?? "1.0.0"}
                tags={meta.tags ?? []}
                readingTime={readingTime}
                label={skillMode ? "SKILL.md preview" : "Preview"}
                className={showPreview && !isSplit ? "flex-1" : ""}
                style={previewStyle}
              />
            )}
          </div>

          {skillMode ? (
            <SkillInspector onExit={() => setSkillMode(false)} />
          ) : (
            <OutlineRail
              content={debounced}
              onOpenGuide={() => setGuideOpen(true)}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <footer className="flex h-[42px] flex-none items-center gap-3.5 border-t border-ms-border bg-ms-surface px-4 text-[12px] text-ms-muted-3">
          <div className="flex items-center gap-1.5 font-medium whitespace-nowrap text-ms-primary-ink">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Saved locally</span>
          </div>
          <div className="hidden h-4 w-px bg-ms-border sm:block" />
          <div className="hidden items-center gap-4 whitespace-nowrap sm:flex">
            <span>
              <strong className="font-bold text-ms-primary-strong">
                {metrics.wordCount}
              </strong>{" "}
              words
            </span>
            <span>
              <strong className="font-bold text-ms-primary-strong">
                {metrics.characterCount}
              </strong>{" "}
              characters
            </span>
            <span>
              <strong className="font-bold text-ms-primary-strong">
                {readingTime}
              </strong>{" "}
              min read
            </span>
          </div>

          <div className="flex-1" />

          {/* Attribution + community links, folded into the status bar. */}
          <div className="hidden items-center gap-3 whitespace-nowrap lg:flex">
            <span>
              Made with <span aria-hidden="true">🫶</span> by{" "}
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ms-primary-ink hover:underline"
              >
                laramateo.com
              </a>
            </span>
            <Link
              href="/about"
              className="transition-colors hover:text-ms-primary-ink"
            >
              About
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ms-primary-ink"
            >
              GitHub
            </a>
            <FooterContributors />
            <span title={`© ${currentYear} laramateo.com. All rights reserved.`}>
              © {currentYear}
            </span>
          </div>
        </footer>

        <MarkdownGuide open={guideOpen} onOpenChange={setGuideOpen} />
      </div>
    </TooltipProvider>
  );
}
