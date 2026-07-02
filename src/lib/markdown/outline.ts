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

export function buildOutline(markdown: string): OutlineHeading[] {
  const lines = markdown.split("\n");
  const extracted: OutlineHeading[] = [];
  const slugger = new GithubSlugger();
  let insideFence = false;

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      return;
    }
    if (insideFence) return;
    const match = line.match(HEADING_RE);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      extracted.push({ level, text, id: slugger.slug(text), line: index + 1 });
    }
  });

  return extracted;
}
