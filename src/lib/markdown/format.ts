import { escapeRegExp } from "@/lib/utils";

/**
 * The toolbar's formatting engine: pure string logic, no React and no editor.
 *
 * Every function takes the current document text and selection and returns an
 * {@link FormatEdit} describing what to write, or `null` when there is nothing
 * to do. The toolbar applies the edit to CodeMirror.
 */

export interface TextSelection {
  from: number;
  to: number;
}

export interface EditorContext {
  text: string;
  selection: TextSelection;
}

export interface FormatEdit {
  /** Text to insert. */
  text: string;
  /** Caret position after the edit, relative to the start of the inserted text. */
  cursorOffset: number;
  /** Range to replace. Omitted means "replace the current selection". */
  from?: number;
  to?: number;
}

export interface MarkdownPattern {
  pattern: RegExp;
  type: string;
  before: string;
  after: string;
}

/** Inline formats the toolbar can toggle. Order matters: bold is checked before italic. */
export const MARKDOWN_PATTERNS: readonly MarkdownPattern[] = [
  { pattern: /\*\*([^*]+)\*\*/g, type: "bold", before: "**", after: "**" },
  { pattern: /\*([^*]+)\*/g, type: "italic", before: "*", after: "*" },
  { pattern: /~~([^~]+)~~/g, type: "strikethrough", before: "~~", after: "~~" },
  { pattern: /`([^`]+)`/g, type: "code", before: "`", after: "`" },
];

/** Which formats may be opened inside another. Code spans can't hold anything. */
const NESTING_RULES: Record<string, string[]> = {
  bold: ["italic", "strikethrough", "code"],
  italic: ["bold", "strikethrough", "code"],
  strikethrough: ["bold", "italic", "code"],
  code: [],
};

export function canNest(currentType: string, newType: string): boolean {
  return NESTING_RULES[currentType]?.includes(newType) ?? false;
}

interface PatternMatch {
  start: number;
  end: number;
  inner: string;
}

/** The first occurrence of `pattern` whose span contains `position` (inclusive). */
function findMatchAtPosition(
  text: string,
  position: number,
  pattern: MarkdownPattern
): PatternMatch | null {
  for (const match of text.matchAll(pattern.pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    if (position >= start && position <= end) return { start, end, inner: match[1] };
  }
  return null;
}

/** The inline format the caret sits inside, if any. */
export function findSurroundingMarkdown(text: string, position: number): MarkdownPattern | null {
  return (
    MARKDOWN_PATTERNS.find((pattern) => findMatchAtPosition(text, position, pattern) !== null) ??
    null
  );
}

/** Start offset and content of the line containing `position`. */
function lineAt(text: string, position: number): { start: number; line: string } {
  const lines = text.split("\n");
  let start = 0;
  for (const line of lines) {
    const end = start + line.length;
    if (position >= start && position <= end) return { start, line };
    start = end + 1; // +1 for the newline
  }
  return { start: 0, line: lines[0] ?? "" };
}

/** Format types active at the caret: inline formats plus `heading1`..`heading6`. */
export function getActiveFormatting(text: string, cursorPos: number): string[] {
  const active: string[] = [];

  for (const pattern of MARKDOWN_PATTERNS) {
    for (const match of text.matchAll(pattern.pattern)) {
      if (cursorPos >= match.index && cursorPos <= match.index + match[0].length) {
        active.push(pattern.type);
      }
    }
  }

  const heading = lineAt(text, cursorPos).line.match(/^(#{1,6})\s/);
  if (heading) active.push(`heading${heading[1].length}`);

  return active;
}

/** Wrap the selection in `before`/`after`, or insert them around a placeholder. */
export function wrapOrInsert(
  context: EditorContext | null,
  before: string,
  after: string = "",
  placeholder: string = ""
): FormatEdit {
  if (context && context.selection.from !== context.selection.to) {
    const { from, to } = context.selection;
    const text = `${before}${context.text.substring(from, to)}${after}`;
    return { text, cursorOffset: text.length, from, to };
  }

  return {
    text: `${before}${placeholder}${after}`,
    // With a placeholder the caret lands at its start so typing replaces it.
    cursorOffset: placeholder ? before.length : before.length + after.length,
  };
}

/** Unwrap the `pattern` span around the caret, keeping the caret on the same character. */
export function removeFormatting(
  text: string,
  selection: TextSelection,
  pattern: MarkdownPattern
): FormatEdit | null {
  const match = findMatchAtPosition(text, selection.from, pattern);
  if (!match) return null;

  // Keep the caret on the same character. If it was sitting in the markers,
  // snap it to the nearest end of the unwrapped text.
  const caretInInner = selection.from - match.start - pattern.before.length;
  return {
    text: match.inner,
    cursorOffset: Math.min(Math.max(caretInInner, 0), match.inner.length),
    from: match.start,
    to: match.end,
  };
}

/** Swap the `oldPattern` span around the caret for a different pair of markers. */
export function replaceFormatting(
  text: string,
  selection: TextSelection,
  oldPattern: MarkdownPattern,
  newBefore: string,
  newAfter: string,
  placeholder: string
): FormatEdit | null {
  const match = findMatchAtPosition(text, selection.from, oldPattern);
  if (!match) return null;

  const usePlaceholder = Boolean(placeholder) && !match.inner;
  return {
    text: `${newBefore}${usePlaceholder ? placeholder : match.inner}${newAfter}`,
    cursorOffset: newBefore.length + (usePlaceholder ? 0 : match.inner.length),
    from: match.start,
    to: match.end,
  };
}

/**
 * Toggle an inline format (bold, italic, strikethrough, code).
 *
 * - Selection that is exactly a formatted span of this type: unwrap it.
 * - Any other selection: wrap it.
 * - Caret inside a span of the same type: unwrap it.
 * - Caret inside a span that can hold this type: insert nested.
 * - Caret inside a span that can't (code): replace the span's markers.
 * - Otherwise: insert the markers around a placeholder.
 */
export function smartInsert(
  context: EditorContext | null,
  before: string,
  after: string,
  placeholder: string,
  elementType: string
): FormatEdit | null {
  if (!context) return wrapOrInsert(null, before, after, placeholder);

  const { text, selection } = context;

  if (selection.from !== selection.to) {
    const selected = text.substring(selection.from, selection.to);
    const own = MARKDOWN_PATTERNS.find((pattern) => pattern.type === elementType);
    const wrapped = own
      ? selected.match(new RegExp(`^${escapeRegExp(own.before)}(.+)${escapeRegExp(own.after)}$`))
      : null;

    if (wrapped) {
      return {
        text: wrapped[1],
        cursorOffset: wrapped[1].length,
        from: selection.from,
        to: selection.to,
      };
    }
    return wrapOrInsert(context, before, after, placeholder);
  }

  const surrounding = findSurroundingMarkdown(text, selection.from);
  if (!surrounding) return wrapOrInsert(context, before, after, placeholder);
  if (surrounding.type === elementType) return removeFormatting(text, selection, surrounding);
  if (canNest(surrounding.type, elementType)) {
    return wrapOrInsert(context, before, after, placeholder);
  }
  return replaceFormatting(text, selection, surrounding, before, after, placeholder);
}

/**
 * Insert a block-level line (list item, quote, rule). Breaks onto a fresh line
 * only when the caret isn't already at the start of one, and only adds a
 * trailing newline when text follows, so no stray blank lines appear.
 */
export function insertLine(
  context: EditorContext | null,
  prefix: string,
  placeholder: string = ""
): FormatEdit {
  const body = `${prefix}${placeholder}`;
  if (!context) return { text: `${body}\n`, cursorOffset: prefix.length };

  const { text, selection } = context;
  const atLineStart = selection.from === 0 || text[selection.from - 1] === "\n";
  const atLineEnd = selection.to >= text.length || text[selection.to] === "\n";
  const leading = atLineStart ? "" : "\n";
  const trailing = atLineEnd ? "" : "\n";
  return {
    text: `${leading}${body}${trailing}`,
    cursorOffset: leading.length + prefix.length,
  };
}

const HEADING_MARKERS = /^#+\s*/;

/**
 * Turn the selection or the caret's line into a heading of `level`, replacing
 * any heading markers already there. A multi-line selection only converts its
 * first line.
 */
export function smartHeading(context: EditorContext | null, level: number): FormatEdit {
  const prefix = `${"#".repeat(level)} `;
  const placeholder = `Heading ${level}`;

  if (!context) return insertLine(null, prefix, placeholder);

  const { text, selection } = context;

  if (selection.from !== selection.to) {
    const [firstLine, ...rest] = text.substring(selection.from, selection.to).split("\n");
    const heading = [`${prefix}${firstLine.replace(HEADING_MARKERS, "")}`, ...rest].join("\n");
    return { text: heading, cursorOffset: heading.length, from: selection.from, to: selection.to };
  }

  const { start, line } = lineAt(text, selection.from);
  const clean = line.replace(HEADING_MARKERS, "");
  return {
    text: `${prefix}${clean || placeholder}`,
    cursorOffset: prefix.length + clean.length,
    from: start,
    to: start + line.length,
  };
}
