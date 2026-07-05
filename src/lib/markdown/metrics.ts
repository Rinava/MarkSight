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

export function documentMetrics(content: string): DocumentMetrics {
  const lines = content.split('\n');
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const characters = content.length;
  const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
  const images = (content.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length;

  // Fence-aware ATX heading count (1–6 hashes), consistent with buildOutline.
  let insideFence = false;
  let headings = 0;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (!insideFence && /^#{1,6}\s/.test(line)) headings++;
  }

  return {
    wordCount: words.length,
    characterCount: characters,
    lineCount: lines.length,
    headingCount: headings,
    linkCount: links,
    imageCount: images,
  };
}
