import { describe, expect, it } from "vitest";
import {
  canNest,
  findSurroundingMarkdown,
  getActiveFormatting,
  insertLine,
  removeFormatting,
  replaceFormatting,
  smartHeading,
  smartInsert,
  wrapOrInsert,
  MARKDOWN_PATTERNS,
  type EditorContext,
  type FormatEdit,
} from "../format";

/** Build a context from a string where `|` marks the caret or both selection ends. */
function ctx(marked: string): EditorContext {
  const from = marked.indexOf("|");
  const second = marked.indexOf("|", from + 1);
  const text = marked.replaceAll("|", "");
  return { text, selection: { from, to: second === -1 ? from : second - 1 } };
}

/** Apply an edit the way the editor does and show the caret as `|`. */
function applied(context: EditorContext, edit: FormatEdit | null): string {
  if (!edit) throw new Error("expected an edit");
  const from = edit.from ?? context.selection.from;
  const to = edit.to ?? context.selection.to;
  const next = context.text.slice(0, from) + edit.text + context.text.slice(to);
  const caret = from + edit.cursorOffset;
  return `${next.slice(0, caret)}|${next.slice(caret)}`;
}

const bold = MARKDOWN_PATTERNS.find((p) => p.type === "bold")!;
const code = MARKDOWN_PATTERNS.find((p) => p.type === "code")!;

describe("getActiveFormatting", () => {
  it("reports the inline format around the caret", () => {
    const { text, selection } = ctx("a **bo|ld** b");
    expect(getActiveFormatting(text, selection.from)).toContain("bold");
  });

  it("reports nothing in plain text", () => {
    const { text, selection } = ctx("plain | text **bold**");
    expect(getActiveFormatting(text, selection.from)).toEqual([]);
  });

  it("reports the heading level of the caret's line only", () => {
    const { text, selection } = ctx("# One\n\n### Thr|ee\n\nbody");
    expect(getActiveFormatting(text, selection.from)).toEqual(["heading3"]);
  });

  it("combines inline and heading formats", () => {
    const { text, selection } = ctx("## A `co|de` title");
    expect(getActiveFormatting(text, selection.from)).toEqual(["code", "heading2"]);
  });
});

describe("findSurroundingMarkdown / canNest", () => {
  it("finds the span the caret is in", () => {
    const { text, selection } = ctx("x ~~go|ne~~ y");
    expect(findSurroundingMarkdown(text, selection.from)?.type).toBe("strikethrough");
    expect(findSurroundingMarkdown("no formatting", 3)).toBeNull();
  });

  it("lets emphasis nest but keeps code spans flat", () => {
    expect(canNest("bold", "italic")).toBe(true);
    expect(canNest("italic", "code")).toBe(true);
    expect(canNest("code", "bold")).toBe(false);
    expect(canNest("unknown", "bold")).toBe(false);
  });
});

describe("wrapOrInsert", () => {
  it("wraps the selection and puts the caret after it", () => {
    const context = ctx("say |hello| now");
    expect(applied(context, wrapOrInsert(context, "[", "](url)", "link text"))).toBe(
      "say [hello](url)| now"
    );
  });

  it("inserts a placeholder with the caret at its start", () => {
    const context = ctx("say |");
    expect(applied(context, wrapOrInsert(context, "[", "](url)", "link text"))).toBe(
      "say [|link text](url)"
    );
  });

  it("puts the caret after the markers when there's no placeholder", () => {
    const context = ctx("a|b");
    expect(applied(context, wrapOrInsert(context, "<", ">"))).toBe("a<>|b");
  });
});

describe("smartInsert", () => {
  it("inserts markers around a placeholder in plain text", () => {
    const context = ctx("hello |");
    expect(applied(context, smartInsert(context, "**", "**", "bold text", "bold"))).toBe(
      "hello **|bold text**"
    );
  });

  it("wraps a plain selection", () => {
    const context = ctx("make |this| bold");
    expect(applied(context, smartInsert(context, "**", "**", "bold text", "bold"))).toBe(
      "make **this**| bold"
    );
  });

  it("unwraps a selection that is exactly a span of the same type", () => {
    const context = ctx("make |**this**| plain");
    expect(applied(context, smartInsert(context, "**", "**", "bold text", "bold"))).toBe(
      "make this| plain"
    );
  });

  it("wraps again when the selected span is a different type", () => {
    const context = ctx("|*this*|");
    expect(applied(context, smartInsert(context, "~~", "~~", "x", "strikethrough"))).toBe(
      "~~*this*~~|"
    );
  });

  it("toggles off when the caret sits inside the same format", () => {
    const context = ctx("a **bo|ld** b");
    expect(applied(context, smartInsert(context, "**", "**", "bold text", "bold"))).toBe(
      "a bo|ld b"
    );
  });

  it("keeps the caret inside the document when toggling off at the span's edges", () => {
    const atEnd = ctx("**bold**|");
    expect(applied(atEnd, smartInsert(atEnd, "**", "**", "bold text", "bold"))).toBe("bold|");
    const atStart = ctx("|**bold**");
    expect(applied(atStart, smartInsert(atStart, "**", "**", "bold text", "bold"))).toBe("|bold");
  });

  it("nests inside a format that allows it", () => {
    const context = ctx("a ~~go|ne~~ b");
    expect(applied(context, smartInsert(context, "`", "`", "code", "code"))).toBe(
      "a ~~go`|code`ne~~ b"
    );
  });

  it("replaces the markers when the caret is in a code span", () => {
    const context = ctx("a `co|de` b");
    expect(applied(context, smartInsert(context, "~~", "~~", "x", "strikethrough"))).toBe(
      "a ~~code|~~ b"
    );
  });

  it("works without an editor context", () => {
    expect(smartInsert(null, "*", "*", "italic text", "italic")).toEqual({
      text: "*italic text*",
      cursorOffset: 1,
    });
  });
});

describe("removeFormatting / replaceFormatting", () => {
  it("returns null when the caret isn't inside the pattern", () => {
    const { text, selection } = ctx("pl|ain **bold**");
    expect(removeFormatting(text, selection, bold)).toBeNull();
    expect(replaceFormatting(text, selection, code, "*", "*", "x")).toBeNull();
  });

  it("replaces the whole span, markers included", () => {
    const context = ctx("`a|b`");
    const edit = replaceFormatting(context.text, context.selection, code, "**", "**", "x");
    expect(edit).toMatchObject({ text: "**ab**", from: 0, to: 4 });
  });
});

describe("insertLine", () => {
  it("inserts in place on an empty line", () => {
    const context = ctx("intro\n|");
    expect(applied(context, insertLine(context, "- ", "List item"))).toBe("intro\n- |List item");
  });

  it("breaks onto a new line when the caret is mid-line", () => {
    const context = ctx("intro|");
    expect(applied(context, insertLine(context, "- ", "List item"))).toBe("intro\n- |List item");
  });

  it("adds a trailing newline only when text follows", () => {
    const context = ctx("be|fore");
    expect(applied(context, insertLine(context, "---"))).toBe("be\n---|\nfore");
  });

  it("works at the very start of the document", () => {
    const context = ctx("|");
    expect(applied(context, insertLine(context, "> ", "Quote"))).toBe("> |Quote");
  });

  it("appends a newline when there's no editor context", () => {
    expect(insertLine(null, "- ", "List item")).toEqual({ text: "- List item\n", cursorOffset: 2 });
  });
});

describe("smartHeading", () => {
  it("turns the caret's line into a heading", () => {
    const context = ctx("first\nsec|ond\nthird");
    expect(applied(context, smartHeading(context, 2))).toBe("first\n## second|\nthird");
  });

  it("swaps an existing heading level instead of stacking markers", () => {
    const context = ctx("# Tit|le");
    expect(applied(context, smartHeading(context, 3))).toBe("### Title|");
  });

  it("uses a placeholder on an empty line", () => {
    const context = ctx("a\n|\nb");
    expect(applied(context, smartHeading(context, 1))).toBe("a\n# |Heading 1\nb");
  });

  it("converts a single-line selection", () => {
    const context = ctx("x |## old| y");
    expect(applied(context, smartHeading(context, 1))).toBe("x # old| y");
  });

  it("only converts the first line of a multi-line selection", () => {
    const context = ctx("|one\ntwo|");
    expect(applied(context, smartHeading(context, 2))).toBe("## one\ntwo|");
  });
});
