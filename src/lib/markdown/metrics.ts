/**
 * Document metrics, shared by analytics and the MCP `document_metrics` tool.
 * Pure — no GA side effects.
 */

export interface DocumentMetrics {
  wordCount: number;
  characterCount: number;
  lineCount: number;
  headingCount: number;
  linkCount: number;
  imageCount: number;
}

const LINK_RE = /(?<!!)\[([^\]]+)\]\([^)]+\)/g;
const IMAGE_RE = /!\[([^\]]*)\]\([^)]+\)/g;
const ATX_HEADING_RE = /^#{1,6}\s/;
const FENCE_RE = /^\s*(```|~~~)/;
const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/;

export function documentMetrics(content: string): DocumentMetrics {
  const lines = content.split("\n");
  const words = content.split(/\s+/).filter((word) => word.length > 0);
  const characters = content.length;
  const links = (content.match(LINK_RE) || []).length;
  const images = (content.match(IMAGE_RE) || []).length;

  let insideFence = false;
  let headings = 0;
  lines.forEach((line, index) => {
    if (FENCE_RE.test(line)) {
      insideFence = !insideFence;
      return;
    }
    if (insideFence) return;

    if (ATX_HEADING_RE.test(line)) {
      headings++;
      return;
    }

    const setext = line.match(SETEXT_RE);
    if (setext) {
      const prev = lines[index - 1];
      if (prev && prev.trim() && !ATX_HEADING_RE.test(prev) && !FENCE_RE.test(prev)) {
        headings++;
      }
    }
  });

  return {
    wordCount: words.length,
    characterCount: characters,
    lineCount: lines.length,
    headingCount: headings,
    linkCount: links,
    imageCount: images,
  };
}
