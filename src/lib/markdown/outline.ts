import GithubSlugger from "github-slugger";

/**
 * Heading outline extraction, shared by the sidebar outline UI and the MCP
 * `document_outline` tool. Pure — no React/DOM.
 */

export interface OutlineHeading {
  level: number;
  text: string;
  /** Same slugger rehype-slug uses in the preview, so ids match rendered anchors. */
  id: string;
  /** 1-based source line. */
  line: number;
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const FENCE_RE = /^\s*(```|~~~)/;
// Setext underline: a run of = (H1) or - (H2), up to 3 leading spaces.
const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/;

export function buildOutline(markdown: string): OutlineHeading[] {
  const lines = markdown.split("\n");
  const extracted: OutlineHeading[] = [];
  const slugger = new GithubSlugger();
  let insideFence = false;

  lines.forEach((line, index) => {
    if (FENCE_RE.test(line)) {
      insideFence = !insideFence;
      return;
    }
    if (insideFence) return;

    const match = line.match(HEADING_RE);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      extracted.push({ level, text, id: slugger.slug(text), line: index + 1 });
      return;
    }

    // Setext heading: a non-blank text line followed by an =/- underline.
    // rehype-slug renders+slugs these, so we must too or duplicate ids desync.
    const setext = line.match(SETEXT_RE);
    if (setext) {
      const prev = lines[index - 1];
      if (prev && prev.trim() && !HEADING_RE.test(prev) && !FENCE_RE.test(prev)) {
        const level = setext[1][0] === "=" ? 1 : 2;
        const text = prev.trim();
        extracted.push({ level, text, id: slugger.slug(text), line: index });
      }
    }
  });

  return extracted;
}
