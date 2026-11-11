"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, CircleCheck, RotateCcw, Sparkles, TriangleAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { GithubIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { FooterContributors } from "@/components/contributors";
import { MarkdownToolbar } from "@/components/markdown-toolbar";
import { MarkdownEditorRef } from "@/components/markdown-editor";
import { TooltipProvider, Tip } from "@/components/ui/base/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

/** Split-pane bounds: neither pane may shrink below 20% of the width. */
const MIN_EDITOR_PCT = 20;
const MAX_EDITOR_PCT = 80;
/** How far one arrow-key press moves the divider. */
const RESIZE_STEP_PCT = 2;
/** Quiet time after a keystroke before the preview re-renders. */
const PREVIEW_DEBOUNCE_MS = 60;
/**
 * Longest the preview may lag while the user keeps typing. Without this cap a
 * fast typist never leaves a gap longer than the debounce, and the preview
 * sits frozen until they stop.
 */
const PREVIEW_MAX_WAIT_MS = 150;
/** Average adult reading speed, used for the "min read" estimate. */
const WORDS_PER_MINUTE = 200;

function clampEditorPct(pct: number): number {
  return Math.min(MAX_EDITOR_PCT, Math.max(MIN_EDITOR_PCT, pct));
}

export function Workspace() {
  const [value, setValue] = useLocalStorage({
    key: "marksight-markdown-content",
    defaultValue: STARTER,
  });
  const debounced = useDebouncedValue(value, {
    delayMs: PREVIEW_DEBOUNCE_MS,
    maxWaitMs: PREVIEW_MAX_WAIT_MS,
  });

  const { setContent, registerDocumentReplacer } = useContent();
  const { meta, validation } = useSkillMeta();
  const { trackDocumentChange, trackClear, trackReset, trackEditorInteraction } = useAnalytics();

  const [skillMode, setSkillMode] = useState(false);
  const [view, setView] = useState<ViewMode>("split");
  const [ratio, setRatio] = useState(50);
  // Phones show one panel at a time, so in skill mode the inspector takes the
  // whole screen and this decides whether it's in front. Ignored on desktop,
  // where the inspector always sits beside the panes.
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

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
    [setValue]
  );

  // Let menus (import / template) replace the document through the same
  // undo-friendly path as normal edits.
  useEffect(() => {
    registerDocumentReplacer(handleValueChange);
    return () => registerDocumentReplacer(null);
  }, [registerDocumentReplacer, handleValueChange]);

  const executeClear = useCallback(() => {
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
    setClearDialogOpen(false);
  }, [value, setValue, trackClear]);

  // Only interrupt when there's something to lose; empty documents clear
  // silently.
  const handleClear = useCallback(() => {
    if (value.trim() !== "") {
      setClearDialogOpen(true);
    } else {
      executeClear();
    }
  }, [value, executeClear]);

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
    [trackEditorInteraction]
  );

  const getCurrentContext = useCallback(
    () =>
      editorRef.current?.getCurrentContext() ?? {
        text: value,
        selection: { from: 0, to: 0 },
      },
    [value]
  );

  const enterSkill = useCallback(() => {
    setSkillMode(true);
    setInspectorOpen(true);
  }, []);

  const exitSkill = useCallback(() => {
    setSkillMode(false);
    setInspectorOpen(false);
  }, []);

  const toggleSkill = skillMode ? exitSkill : enterSkill;

  // Detach any in-flight drag listeners if we unmount mid-drag (the mouseup
  // that normally removes them would never fire), and clear the body styles.
  useEffect(
    () => () => {
      resizeAbortRef.current?.abort();
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    []
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
      setRatio(clampEditorPct(pct));
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
  const readingTime = Math.max(1, Math.round(metrics.wordCount / WORDS_PER_MINUTE));
  const currentYear = new Date().getFullYear();
  const showEditor = view !== "preview";
  const showPreview = view !== "edit";
  const isSplit = view === "split";

  const skillName = meta.name || "skill-name";
  const editorStyle = isSplit ? { flex: `${ratio} 1 0%` } : undefined;
  const previewStyle = isSplit ? { flex: `${100 - ratio} 1 0%` } : undefined;

  return (
    <TooltipProvider>
      <div className="bg-ms-app text-ms-ink flex h-dvh flex-col overflow-hidden font-sans">
        <a
          href="#main-content"
          className="border-ms-border-hover bg-ms-surface text-ms-primary-ink focus:outline-ms-primary sr-only rounded-[9px] border px-4 py-2 text-[13px] font-semibold shadow-[var(--ms-shadow-primary)] focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:outline-2 focus:outline-offset-2"
        >
          Skip to main content
        </a>

        {/* ── Header ── */}
        <header className="border-ms-border bg-ms-surface flex h-[58px] flex-none items-center gap-2 border-b px-3 sm:gap-3.5 sm:px-[18px]">
          <Logo compact />
          <div className="flex-1" />

          {skillMode && (
            <div
              className={`ms-slide hidden items-center gap-2 rounded-full px-3 py-1.5 whitespace-nowrap md:flex ${
                validation.valid ? "bg-ms-tint text-ms-primary-ink" : "bg-ms-warn-bg text-ms-warn"
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

          <OpenSkillMenu onEnterSkill={enterSkill} />

          <button
            type="button"
            onClick={toggleSkill}
            aria-pressed={skillMode}
            className={`flex h-[34px] flex-none items-center gap-[7px] rounded-[9px] text-[13px] font-semibold whitespace-nowrap ${
              skillMode
                ? "border-ms-border-hover bg-ms-tint text-ms-primary-ink hover:border-ms-primary hover:bg-ms-tint-3 border px-[13px] transition-colors"
                : "bg-ms-primary px-[15px] text-white shadow-[var(--ms-shadow-primary)] transition-[filter] hover:brightness-[1.07]"
            }`}
          >
            <Sparkles className="h-[15px] w-[15px]" aria-hidden="true" />
            <span className="sm:hidden">Skill</span>
            <span className="hidden sm:inline">{skillMode ? "Skill mode" : "Create skill"}</span>
          </button>

          <div className="bg-ms-border hidden h-[22px] w-px sm:block" />

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="text-ms-label hover:text-ms-primary-ink hidden items-center gap-1.5 text-[13px] font-medium transition-colors sm:inline-flex"
          >
            <BookOpen className="h-[15px] w-[15px]" aria-hidden="true" />
            Guide
          </button>

          <Link
            href="/about"
            className="text-ms-label hover:text-ms-primary-ink hidden text-[13px] font-medium transition-colors sm:inline"
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
              className={`${ICON_BTN} max-sm:hidden`}
            >
              <GithubIcon className="h-[17px] w-[17px]" aria-hidden="true" />
            </a>
          </Tip>
        </header>

        {/* ── Toolbar ── */}
        <div className="border-ms-border bg-ms-surface-2 flex flex-none flex-wrap items-center gap-x-2.5 gap-y-2 border-b px-3 py-2 sm:px-3.5">
          {/* Formatting acts on the editor; hide it (and its shortcuts) in
              Preview-only view where the editor is unmounted. */}
          {showEditor ? (
            <MarkdownToolbar onInsert={toolbarInsert} getCurrentContext={getCurrentContext} />
          ) : (
            <div className="hidden flex-1 md:block" />
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
          {/* Phones: the formatting row sits above, this row spreads edge to edge. */}
          <div className="flex-1 md:hidden" />
          <div className="bg-ms-border hidden h-[22px] w-px flex-none md:block" />
          <ViewSwitch
            view={view}
            onChange={setView}
            showInspector={skillMode}
            inspectorOpen={inspectorOpen}
            onInspectorOpenChange={setInspectorOpen}
          />
          <ExportMenu skillMode={skillMode} content={debounced} filename="marksight-document" />
        </div>

        {/* ── Body ── */}
        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex min-h-0 flex-1 focus:outline-none"
        >
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
                aria-valuemin={MIN_EDITOR_PCT}
                aria-valuemax={MAX_EDITOR_PCT}
                tabIndex={0}
                onMouseDown={startResize}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    setRatio((r) => clampEditorPct(r - RESIZE_STEP_PCT));
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    setRatio((r) => clampEditorPct(r + RESIZE_STEP_PCT));
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    setRatio(20);
                  } else if (event.key === "End") {
                    event.preventDefault();
                    setRatio(80);
                  }
                }}
                className="border-ms-border bg-ms-tint-2 focus-visible:bg-ms-tint focus-visible:outline-ms-primary hidden w-[7px] flex-none cursor-col-resize items-center justify-center border-x outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 md:flex"
              >
                <div className="bg-ms-scroll-thumb h-[34px] w-[3px] rounded-[3px]" />
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
                // Side by side needs room: below md, "split" falls back to the
                // editor alone (the view switch offers Editor / Preview there).
                className={isSplit ? "max-md:hidden" : "flex-1"}
                style={previewStyle}
              />
            )}
          </div>

          {skillMode ? (
            <SkillInspector
              onExit={exitSkill}
              className={
                inspectorOpen ? "max-md:absolute max-md:inset-0 max-md:z-20" : "max-md:hidden"
              }
            />
          ) : (
            <OutlineRail content={debounced} onOpenGuide={() => setGuideOpen(true)} />
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="border-ms-border bg-ms-surface text-ms-muted-3 flex h-[42px] flex-none items-center gap-3.5 border-t px-4 text-[12px]">
          <div className="text-ms-primary-ink flex items-center gap-1.5 font-medium whitespace-nowrap">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Saved locally</span>
          </div>
          <div className="bg-ms-border hidden h-4 w-px sm:block" />
          <div className="hidden items-center gap-4 whitespace-nowrap sm:flex">
            <span>
              <strong className="text-ms-primary-strong font-bold">{metrics.wordCount}</strong>{" "}
              words
            </span>
            <span>
              <strong className="text-ms-primary-strong font-bold">{metrics.characterCount}</strong>{" "}
              characters
            </span>
            <span>
              <strong className="text-ms-primary-strong font-bold">{readingTime}</strong> min read
            </span>
          </div>

          <div className="flex-1" />

          {/* Phones: the header has no room for these, so they live here. */}
          <div className="flex items-center gap-3.5 whitespace-nowrap sm:hidden">
            <span>
              <strong className="text-ms-primary-strong font-bold">{metrics.wordCount}</strong>{" "}
              words
            </span>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="hover:text-ms-primary-ink font-medium transition-colors"
            >
              Guide
            </button>
            <Link href="/about" className="hover:text-ms-primary-ink font-medium transition-colors">
              About
            </Link>
          </div>

          {/* Attribution + community links, folded into the status bar. */}
          <div className="hidden items-center gap-3 whitespace-nowrap lg:flex">
            <span>
              Made with <span aria-hidden="true">🫶</span> by{" "}
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ms-primary-ink font-medium hover:underline"
              >
                laramateo.com
              </a>
            </span>
            <Link href="/about" className="hover:text-ms-primary-ink transition-colors">
              About
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ms-primary-ink transition-colors"
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
        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear the document?</DialogTitle>
              <DialogDescription>
                This removes all content from the editor. You can undo immediately after.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={executeClear}>
                Clear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
