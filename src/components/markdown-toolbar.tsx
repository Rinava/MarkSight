"use client";
import { escapeRegExp } from "@/lib/utils";
import { useEffect, useCallback, useMemo } from "react";
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

interface MarkdownPattern {
  pattern: RegExp;
  type: string;
  before: string;
  after: string;
}

export function MarkdownToolbar({
  onInsert,
  getCurrentContext,
  selectionVersion,
}: MarkdownToolbarProps) {
  const { trackToolbarInteraction, trackShortcut } = useAnalytics();
  const isMac = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      navigator.platform.toUpperCase().includes("MAC"),
    []
  );

  const modifierKey = isMac ? "⌘" : "Ctrl";
  const markdownPatterns = useMemo(
    () => [
      { pattern: /\*\*([^*]+)\*\*/g, type: "bold", before: "**", after: "**" },
      { pattern: /\*([^*]+)\*/g, type: "italic", before: "*", after: "*" },
      { pattern: /~~([^~]+)~~/g, type: "strikethrough", before: "~~", after: "~~" },
      { pattern: /`([^`]+)`/g, type: "code", before: "`", after: "`" },
    ],
    []
  );

  const getActiveFormatting = useCallback((): string[] => {
    if (!getCurrentContext) return [];

    const context = getCurrentContext();
    const { text, selection } = context;
    const cursorPos = selection.from;

    const activeFormats: string[] = [];

    // Check if cursor is inside any formatting
    for (const patternInfo of markdownPatterns) {
      const matches = [...text.matchAll(patternInfo.pattern)];
      for (const match of matches) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = match.index + match[0].length;
          if (cursorPos >= start && cursorPos <= end) {
            activeFormats.push(patternInfo.type);
          }
        }
      }
    }

    // Check for heading at current line
    const lines = text.split("\n");
    let currentLine = 0;
    let charCount = 0;

    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= cursorPos) {
        currentLine = i;
        break;
      }
      charCount += lines[i].length + 1; // +1 for newline
    }

    const lineText = lines[currentLine];
    const headingMatch = lineText.match(/^(#{1,6})\s/);
    if (headingMatch) {
      activeFormats.push(`heading${headingMatch[1].length}`);
    }

    return activeFormats;
  }, [getCurrentContext, markdownPatterns]);

  const findSurroundingMarkdown = useCallback(
    (text: string, position: number): MarkdownPattern | null => {
      for (const patternInfo of markdownPatterns) {
        const matches = [...text.matchAll(patternInfo.pattern)];
        for (const match of matches) {
          if (match.index !== undefined) {
            const start = match.index;
            const end = match.index + match[0].length;
            if (position >= start && position <= end) {
              return patternInfo;
            }
          }
        }
      }
      return null;
    },
    [markdownPatterns]
  );

  const canNest = (currentType: string, newType: string): boolean => {
    const nestingRules: Record<string, string[]> = {
      bold: ["italic", "strikethrough", "code"],
      italic: ["bold", "strikethrough", "code"],
      strikethrough: ["bold", "italic", "code"],
      code: [], // Code cannot nest other formatting
    };
    return nestingRules[currentType]?.includes(newType) ?? false;
  };

  const insertText = useCallback(
    (before: string, after: string = "", placeholder: string = "") => {
      if (getCurrentContext) {
        const context = getCurrentContext();
        const { selection } = context;
        const hasSelection = selection.from !== selection.to;

        if (hasSelection) {
          // Wrap selected text
          const selectedText = context.text.substring(selection.from, selection.to);
          const wrappedText = `${before}${selectedText}${after}`;
          const cursorOffset = before.length + selectedText.length + after.length;
          onInsert(wrappedText, cursorOffset, selection.from, selection.to);
          return;
        }
      }

      // Normal insertion with placeholder
      const text = placeholder ? `${before}${placeholder}${after}` : `${before}${after}`;
      const cursorOffset = placeholder ? before.length : before.length + after.length;
      onInsert(text, cursorOffset);
    },
    [getCurrentContext, onInsert]
  );

  const removeFormatting = useCallback(
    (text: string, selection: { from: number; to: number }, pattern: MarkdownPattern) => {
      const matches = [...text.matchAll(pattern.pattern)];
      for (const match of matches) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = match.index + match[0].length;
          if (selection.from >= start && selection.from <= end) {
            const innerText = match[1];
            const newCursorPos = selection.from - start - pattern.before.length;

            // Replace the entire matched text with just the inner content
            onInsert(innerText, newCursorPos + innerText.length, start, end);
            return;
          }
        }
      }
    },
    [onInsert]
  );

  const replaceFormatting = useCallback(
    (
      text: string,
      selection: { from: number; to: number },
      oldPattern: MarkdownPattern,
      newBefore: string,
      newAfter: string,
      placeholder: string
    ) => {
      const matches = [...text.matchAll(oldPattern.pattern)];
      for (const match of matches) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = match.index + match[0].length;
          if (selection.from >= start && selection.from <= end) {
            const innerText = match[1];
            const newText =
              placeholder && !innerText
                ? `${newBefore}${placeholder}${newAfter}`
                : `${newBefore}${innerText}${newAfter}`;
            const cursorOffset =
              newBefore.length + (placeholder && !innerText ? 0 : innerText.length);

            onInsert(newText, cursorOffset, start, end);
            return;
          }
        }
      }
    },
    [onInsert]
  );

  const smartInsert = useCallback(
    (before: string, after: string, placeholder: string, elementType: string) => {
      trackToolbarInteraction(elementType);
      if (!getCurrentContext) {
        insertText(before, after, placeholder);
        return;
      }

      const context = getCurrentContext();
      const { text, selection } = context;
      const hasSelection = selection.from !== selection.to;

      if (hasSelection) {
        // Handle text selection - check if selection is already formatted
        const selectedText = text.substring(selection.from, selection.to);

        // Check if the selected text exactly matches a markdown pattern
        const selectedPattern = markdownPatterns.find((pattern) => {
          const match = selectedText.match(
            new RegExp(`^${escapeRegExp(pattern.before)}(.+)${escapeRegExp(pattern.after)}$`)
          );
          return match && pattern.type === elementType;
        });

        if (selectedPattern) {
          // Remove formatting from selected text
          const innerMatch = selectedText.match(
            new RegExp(
              `^${escapeRegExp(selectedPattern.before)}(.+)${escapeRegExp(selectedPattern.after)}$`
            )
          );
          if (innerMatch) {
            const innerText = innerMatch[1];
            onInsert(innerText, innerText.length, selection.from, selection.to);
          }
        } else {
          // Wrap selected text with formatting
          const wrappedText = `${before}${selectedText}${after}`;
          const cursorOffset = before.length + selectedText.length + after.length;
          onInsert(wrappedText, cursorOffset, selection.from, selection.to);
        }
        return;
      }

      // Handle cursor position (no selection)
      const cursorPos = selection.from;
      const surroundingMarkdown = findSurroundingMarkdown(text, cursorPos);

      if (surroundingMarkdown) {
        if (surroundingMarkdown.type === elementType) {
          // Same type - remove the formatting
          removeFormatting(text, selection, surroundingMarkdown);
        } else if (canNest(surroundingMarkdown.type, elementType)) {
          // Different type that can be nested
          insertText(before, after, placeholder);
        } else {
          // Cannot nest - replace
          replaceFormatting(text, selection, surroundingMarkdown, before, after, placeholder);
        }
      } else {
        // No surrounding markdown - normal insert
        insertText(before, after, placeholder);
      }
    },
    [
      getCurrentContext,
      onInsert,
      insertText,
      findSurroundingMarkdown,
      markdownPatterns,
      removeFormatting,
      replaceFormatting,
      trackToolbarInteraction,
    ]
  );

  const insertLine = useCallback(
    (prefix: string, placeholder: string = "") => {
      trackToolbarInteraction("insert_line");
      const body = placeholder ? `${prefix}${placeholder}` : prefix;

      if (!getCurrentContext) {
        onInsert(`${body}\n`, prefix.length);
        return;
      }

      const { text, selection } = getCurrentContext();
      // Break onto a fresh line only when the caret isn't already at the start of one,
      // and only append a newline when text follows — avoids stray blank lines / splits.
      const atLineStart = selection.from === 0 || text[selection.from - 1] === "\n";
      const atLineEnd = selection.to >= text.length || text[selection.to] === "\n";
      const leading = atLineStart ? "" : "\n";
      const trailing = atLineEnd ? "" : "\n";
      onInsert(`${leading}${body}${trailing}`, leading.length + prefix.length);
    },
    [getCurrentContext, onInsert, trackToolbarInteraction]
  );

  const smartHeading = useCallback(
    (level: number) => {
      trackToolbarInteraction(`heading_${level}`);
      const prefix = "#".repeat(level) + " ";
      const placeholder = `Heading ${level}`;

      if (!getCurrentContext) {
        insertLine(prefix, placeholder);
        return;
      }

      const context = getCurrentContext();
      const { text, selection } = context;
      const hasSelection = selection.from !== selection.to;

      if (hasSelection) {
        const selectedText = text.substring(selection.from, selection.to);

        const lines = selectedText.split("\n");
        if (lines.length > 1) {
          const firstLine = lines[0];
          const restLines = lines.slice(1);

          const cleanFirstLine = firstLine.replace(/^#+\s*/, "");
          const newText = `${prefix}${cleanFirstLine}${restLines.length > 0 ? "\n" + restLines.join("\n") : ""}`;
          const cursorOffset = newText.length;

          onInsert(newText, cursorOffset, selection.from, selection.to);
        } else {
          // Single line selection: convert to heading
          const cleanText = selectedText.replace(/^#+\s*/, "");
          const headingText = `${prefix}${cleanText}`;
          const cursorOffset = headingText.length;

          onInsert(headingText, cursorOffset, selection.from, selection.to);
        }
        return;
      }

      const lines = text.split("\n");
      let currentLineIndex = 0;
      let lineStart = 0;

      // Find which line the cursor is on
      for (let i = 0; i < lines.length; i++) {
        const lineEnd = lineStart + lines[i].length;
        if (selection.from >= lineStart && selection.from <= lineEnd) {
          currentLineIndex = i;
          break;
        }
        lineStart = lineEnd + 1; // +1 for newline character
      }

      const currentLine = lines[currentLineIndex];
      const lineEnd = lineStart + currentLine.length;

      // Remove existing heading markers
      const cleanLine = currentLine.replace(/^#+\s*/, "");
      const newHeading = cleanLine ? `${prefix}${cleanLine}` : `${prefix}${placeholder}`;
      const cursorOffset = prefix.length + (cleanLine ? cleanLine.length : 0);

      onInsert(newHeading, cursorOffset, lineStart, lineEnd);
    },
    [getCurrentContext, onInsert, insertLine, trackToolbarInteraction]
  );

  const buttons: ToolbarButton[] = [
    {
      icon: Bold,
      label: "Bold",
      shortcut: `${modifierKey}B` ,
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
            trackShortcut(`${modifierKey}+Shift+${numericKey}`);
            smartHeading(numericKey);
          }
          return;
        }

        // character shortcuts
        switch (event.key.toLowerCase()) {
          case "b":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut(`${modifierKey}+B`);
            smartInsert("**", "**", "bold text", "bold");
            break;
          case "i":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut(`${modifierKey}+I`);
            smartInsert("*", "*", "italic text", "italic");
            break;
          case "u":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut(`${modifierKey}+U`);
            smartInsert("~~", "~~", "strikethrough text", "strikethrough");
            break;
          case "k":
            // ⌘⇧K belongs to the Skill Creator dialog
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut(`${modifierKey}+K`);
            insertText("[", "](url)", "link text");
            break;
          case "`":
            if (event.shiftKey) break;
            event.preventDefault();
            trackShortcut(`${modifierKey}+\``);
            smartInsert("`", "`", "code", "code");
            break;
          case "l":
            if (event.shiftKey) {
              event.preventDefault();
              trackShortcut(`${modifierKey}+Shift+L`);
              insertLine("- ", "List item");
            }
            break;
          case "o":
            if (event.shiftKey) {
              event.preventDefault();
              trackShortcut(`${modifierKey}+Shift+O`);
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
    [
      isMac,
      modifierKey,
      insertLine, 
      insertText, 
      smartHeading, 
      smartInsert, 
      trackShortcut,
    ]
  );

  // Recompute when the doc changes (getCurrentContext identity) or the caret moves
  // (selectionVersion) — CodeMirror selection lives outside React's render cycle, so
  // selectionVersion is a signal-only dep the linter can't see through getCurrentContext.
  const activeFormats = useMemo(
    () => getActiveFormatting(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getActiveFormatting, selectionVersion]
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
