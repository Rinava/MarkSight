import { describe, it, expect } from "vitest";
import { buildOutline } from "../outline";
import { documentMetrics } from "../metrics";
import { renderMarkdownToHtml } from "../to-html";

describe("buildOutline", () => {
  it("extracts headings with levels, slugs, and 1-based lines", () => {
    const md = "# Title\n\ntext\n\n## Section A\n\n### Sub";
    expect(buildOutline(md)).toEqual([
      { level: 1, text: "Title", id: "title", line: 1 },
      { level: 2, text: "Section A", id: "section-a", line: 5 },
      { level: 3, text: "Sub", id: "sub", line: 7 },
    ]);
  });

  it("numbers duplicate headings like rehype-slug", () => {
    const ids = buildOutline("# Same\n\n# Same").map((h) => h.id);
    expect(ids).toEqual(["same", "same-1"]);
  });

  it("skips headings inside code fences", () => {
    const md = "# Real\n\n```\n# not a heading\n```\n\n## Also real";
    expect(buildOutline(md).map((h) => h.text)).toEqual(["Real", "Also real"]);
  });

  it("recognizes setext H1 and H2 underlines", () => {
    const md = "Title\n=====\n\ntext\n\nSection\n-------";
    expect(buildOutline(md)).toEqual([
      { level: 1, text: "Title", id: "title", line: 1 },
      { level: 2, text: "Section", id: "section", line: 6 },
    ]);
  });

  it("keeps duplicate slug numbering in sync across setext and ATX headings", () => {
    const ids = buildOutline("Dup\n===\n\n# Dup").map((h) => h.id);
    expect(ids).toEqual(["dup", "dup-1"]);
  });

  it("skips headings inside both ``` and ~~~ fences", () => {
    const md =
      "# Real\n\n~~~\n# tilde\n~~~\n\n```\n# backtick\n```\n\n## Also";
    expect(buildOutline(md).map((h) => h.text)).toEqual(["Real", "Also"]);
  });
});

describe("documentMetrics", () => {
  it("counts words, lines, headings, links, and images", () => {
    const md = "# One\n\ntwo words [link](http://x) ![img](y.png)";
    const m = documentMetrics(md);
    expect(m.lineCount).toBe(3);
    expect(m.headingCount).toBe(1);
    expect(m.linkCount).toBe(1);
    expect(m.imageCount).toBe(1);
    expect(m.characterCount).toBe(md.length);
  });

  it("counts setext headings like buildOutline", () => {
    const md = "Title\n=====\n\ntext\n\nSection\n-------";
    expect(documentMetrics(md).headingCount).toBe(2);
  });

  it("ignores # lines inside ``` and ~~~ fences", () => {
    const md = "# Real\n\n~~~\n# tilde\n~~~\n\n```\n# backtick\n```\n\n## Also";
    expect(documentMetrics(md).headingCount).toBe(2);
  });

  it("does not count 7+ hashes as a heading", () => {
    expect(documentMetrics("####### Seven").headingCount).toBe(0);
  });
});

describe("renderMarkdownToHtml", () => {
  it("renders GFM (tables) without styling", async () => {
    const html = await renderMarkdownToHtml("| a | b |\n|---|---|\n| 1 | 2 |", {
      styled: false,
    });
    expect(html).toContain("<table>");
    expect(html).not.toContain("<!DOCTYPE html>");
  });

  it("wraps in a styled document with the given title", async () => {
    const html = await renderMarkdownToHtml("# Hi", { title: "my-doc" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>my-doc</title>");
    expect(html).toContain("<h1>Hi</h1>");
  });

  it("escapes the title so it cannot inject markup into the head", async () => {
    const html = await renderMarkdownToHtml("# hi", {
      styled: true,
      title: "</title><script>x</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;/title&gt;&lt;script&gt;x&lt;/script&gt;");
  });
});
