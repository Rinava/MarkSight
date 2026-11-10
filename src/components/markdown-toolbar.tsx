"use client";
import { useEffect, useCallback, useMemo } from "react";
import {
  getActiveFormatting,
  insertLine as formatLine,
  smartHeading as formatHeading,
  smartInsert as formatInline,
  wrapOrInsert,
  type EditorContext,
  type FormatEdit,
} from "@/lib/markdown/format";
import { Tip } from "@/components/ui/base/tooltip";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Table,
  CheckSquare,
  Minus,
} from "lucide-react";

export interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset?: number, replaceFrom?: number, replaceTo?: number) => void;
  getCurrentContext?: () => { text: string; selection: { from: number; to: number } };
  /** Bumped by the editor on CodeMirror selection change to re-eval active formatting. */
  selectionVersion?: number;
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  shortcut?: string;
  formatType?: string;
}

export function MarkdownToolbar({
  onInsert,
  getCurrentContext,
  selectionVersion,
}: MarkdownToolbarProps) {
  const { trackToolbarInteraction, trackShortcut } = useAnalytics();
  // Modifier shown in tooltips: ⌘ on macOS, Ctrl elsewhere. Guard navigator for
  // the SSR prerender pass (this is a client component but still renders server-side).
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
  const modifierKey = isMac ? "⌘" : "Ctrl";
  const context = useCallback(
    (): EditorContext | null => getCurrentContext?.() ?? null,
    [getCurrentContext]
  );

  // The formatting rules live in lib/markdown/format.ts; these wrappers only
  // read the editor state, record analytics, and hand the edit back.
  const apply = useCallback(
    (edit: FormatEdit | null) => {
      if (edit) onInsert(edit.text, edit.cursorOffset, edit.from, edit.to);
    },
    [onInsert]
  );

  const insertText = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      apply(wrapOrInsert(context(), before, after, placeholder));
    },
    [apply, context]
  );

  const smartInsert = useCallback(
    (before: string, after: string, placeholder: string, elementType: string) => {
      trackToolbarInteraction(elementType);
      apply(formatInline(context(), before, after, placeholder, elementType));
    },
    [apply, context, trackToolbarInteraction]
  );

  const insertLine = useCallback(
    (prefix: string, placeholder: string = "") => {
      trackToolbarInteraction("insert_line");
      apply(formatLine(context(), prefix, placeholder));
    },
    [apply, context, trackToolbarInteraction]
  );

  const smartHeading = useCallback(
    (level: number) => {
      trackToolbarInteraction(`heading_${level}`);
      apply(formatHeading(context(), level));
    },
    [apply, context, trackToolbarInteraction]
  );

  const buttons: ToolbarButton[] = [
    {
      icon: Bold,
      label: "Bold",
      shortcut: `${modifierKey}B`,
      formatType: "bold",
      action: () => smartInsert("**", "**", "bold text", "bold"),
    },
    {
      icon: Italic,
      label: "Italic",
      shortcut: `${modifierKey}I`,
      formatType: "italic",
      action: () => smartInsert("*", "*", "italic text", "italic"),
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      shortcut: `${modifierKey}U`,
      formatType: "strikethrough",
      action: () => smartInsert("~~", "~~", "strikethrough text", "strikethrough"),
    },
    {
      icon: Heading1,
      label: "Heading 1",
      shortcut: `${modifierKey}⇧1`,
      formatType: "heading1",
      action: () => smartHeading(1),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      shortcut: `${modifierKey}⇧2`,
      formatType: "heading2",
      action: () => smartHeading(2),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      shortcut: `${modifierKey}⇧3`,
      formatType: "heading3",
      action: () => smartHeading(3),
    },
    {
      icon: List,
      label: "Unordered List",
      shortcut: `${modifierKey}⇧L`,
      action: () => insertLine("- ", "List item"),
    },
    {
      icon: ListOrdered,
      label: "Ordered List",
      shortcut: `${modifierKey}⇧O`,
      action: () => insertLine("1. ", "List item"),
    },
    {
      icon: CheckSquare,
      label: "Task List",
      action: () => insertLine("- [ ] ", "Task item"),
    },
    {
      icon: Quote,
      label: "Blockquote",
      action: () => insertLine("> ", "Quote"),
    },
    {
      icon: Code,
      label: "Inline Code",
      shortcut: `${modifierKey}\``,
      formatType: "code",
      action: () => smartInsert("`", "`", "code", "code"),
    },
    {
      icon: Code,
      label: "Code Block",
      action: () => insertText("\n```\n", "\n```\n", "language\ncode"),
    },
    {
      icon: Link,
      label: "Link",
      shortcut: `${modifierKey}K`,
      action: () => insertText("[", "](url)", "link text"),
    },
    {
      icon: Image,
      label: "Image",
      action: () => insertText("![", "](url)", "alt text"),
    },
    {
      icon: Table,
      label: "Table",
      action: () =>
        insertText("\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n"),
    },
    {
      icon: Minus,
      label: "Horizontal Rule",
      action: () => insertLine("---"),
    },
  ];

  // Groups mirror MarkSight.dc.html: format · headings · lists · blocks · media.
  // (The inline "Code block" action stays reachable via ``` but isn't in the row.)
  const groups: ToolbarButton[][] = [
    [buttons[0], buttons[1], buttons[2]], // bold, italic, strikethrough
    [buttons[3], buttons[4], buttons[5]], // h1, h2, h3
    [buttons[6], buttons[7], buttons[8]], // list, ordered list, task list
    [buttons[9], buttons[10], buttons[15]], // quote, inline code, divider
    [buttons[12], buttons[13], buttons[14]], // link, image, table
  ];

  const renderButtonGroup = (buttonGroup: ToolbarButton[], activeFormats: string[]) =>
    buttonGroup.map((button) => {
      const isActive = button.formatType ? activeFormats.includes(button.formatType) : false;

      return (
        <Tip
          key={button.label}
          label={
            <span>
              {button.label}
              {button.shortcut && <span className="ml-2 text-[#9db392]">{button.shortcut}</span>}
            </span>
          }
        >
          <button
            type="button"
            onClick={button.action}
            aria-label={button.label}
            aria-pressed={button.formatType ? isActive : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? "bg-ms-tint-3 text-ms-primary-strong"
                : "text-ms-toolbar-ink hover:bg-ms-tint-3 hover:text-ms-primary-strong"
            }`}
          >
            <button.icon className="h-4 w-4" />
          </button>
        </Tip>
      );
    });

  // Keyboard shortcuts
  useEffect(
    function setupKeyboardShortcuts() {
      function handleKeyDown(event: KeyboardEvent) {
        if (!document.activeElement?.closest(".cm-editor")) return;
        const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

        if (!isCtrlOrCmd) return;

        // physical-key shortcuts — headings on ⌘⇧1..3 (main row + numpad). Return so
        // other Shift+letter combos (e.g. ⌘⇧I/DevTools) aren't swallowed below.
        if (event.shiftKey && (event.code.startsWith("Digit") || event.code.startsWith("Numpad"))) {
          const numericKey = Number(event.code.slice(-1));
          if (numericKey >= 1 && numericKey <= 3) {
            event.preventDefault();
            trackShortcut(`Cmd+Shift+${numericKey}`);
            smartHeading(numericKey);
          }
          return;
        }

        // character shortcuts
        switch (event.key.toLowerCase()) {
          case "b":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut("Cmd+B");
            smartInsert("**", "**", "bold text", "bold");
            break;
          case "i":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut("Cmd+I");
            smartInsert("*", "*", "italic text", "italic");
            break;
          case "u":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut("Cmd+U");
            smartInsert("~~", "~~", "strikethrough text", "strikethrough");
            break;
          case "k":
            // ⌘⇧K belongs to the Skill Creator dialog
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut("Cmd+K");
            insertText("[", "](url)", "link text");
            break;
          case "`":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut("Cmd+`");
            smartInsert("`", "`", "code", "code");
            break;
          case "l":
            if (event.shiftKey) {
              event.preventDefault();
              trackShortcut("Cmd+Shift+L");
              insertLine("- ", "List item");
            }
            break;
          case "o":
            if (event.shiftKey) {
              event.preventDefault();
              trackShortcut("Cmd+Shift+O");
              insertLine("1. ", "List item");
            }
            break;
          default:
            break;
        }
      }

      document.addEventListener("keydown", handleKeyDown);
      return function cleanup() {
        document.removeEventListener("keydown", handleKeyDown);
      };
    },
    [isMac, insertLine, insertText, smartHeading, smartInsert, trackShortcut]
  );

  // Recompute when the doc changes (getCurrentContext identity) or the caret moves
  // (selectionVersion) — CodeMirror selection lives outside React's render cycle, so
  // selectionVersion is a signal-only dep the linter can't see through getCurrentContext.
  const activeFormats = useMemo(
    () => {
      const current = context();
      return current ? getActiveFormatting(current.text, current.selection.from) : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, selectionVersion]
  );

  return (
    <div
      role="toolbar"
      aria-label="Markdown formatting"
      className="flex flex-1 flex-wrap items-center gap-2"
    >
      {groups.map((group, index) => (
        <div key={index} className="border-ms-border flex items-center gap-0.5 border-r pr-2">
          {renderButtonGroup(group, activeFormats)}
        </div>
      ))}
    </div>
  );
}
