import { buildSkillMd, stripLeadingFrontmatter } from "./build";
import type { SkillMeta } from "./types";

/**
 * Knowledge-skill packaging: most documents are content, not instructions.
 * Instead of dumping the whole document into Claude's context on every
 * trigger, generate a short pointer `SKILL.md` and ship the document as
 * `references/document.md` inside the bundle — the official anatomy for
 * reference material.
 */

export type SkillMode = "instruction" | "knowledge";

export const KNOWLEDGE_DOC_PATH = "references/document.md";

const IMPERATIVE_LIST_RE =
  /^\s*(?:[-*]|\d+\.)\s+(?:run|use|click|create|write|add|install|open|check|set|copy|paste|select|type|press|call|import|export|build|test|deploy|configure|update|remove|delete|start|stop)\b/gim;

const INSTRUCTION_HEADING_RE =
  /^#{1,6}\s+(when to use|steps|instructions?|usage|how to|workflow|process|setup|getting started|output( format)?)/gim;

/**
 * Guess whether a document is instruction-shaped (a how-to the skill body can
 * be) or content-shaped (better shipped as a reference). Counts imperative
 * signals; three or more → instruction.
 */
export function suggestSkillMode(markdown: string): SkillMode {
  const { body } = stripLeadingFrontmatter(markdown);

  const imperativeItems = body.match(IMPERATIVE_LIST_RE)?.length ?? 0;
  const instructionHeadings = body.match(INSTRUCTION_HEADING_RE)?.length ?? 0;
  const numberedSteps = (body.match(/^\s*\d+\.\s+\S/gm)?.length ?? 0) >= 3 ? 1 : 0;

  const signals = imperativeItems + instructionHeadings * 2 + numberedSteps;
  return signals >= 3 ? "instruction" : "knowledge";
}

/** The generated pointer body for a knowledge skill. */
export function knowledgeSkillBody(): string {
  return [
    `This skill provides reference material bundled at \`${KNOWLEDGE_DOC_PATH}\`.`,
    "",
    "## Instructions",
    "",
    `1. Read \`${KNOWLEDGE_DOC_PATH}\`.`,
    "2. Ground your answer in that document — quote or cite the relevant sections.",
    "3. If the question falls outside the document, say so instead of guessing.",
  ].join("\n");
}


/** The document payload shipped alongside the pointer, frontmatter stripped. */
export function knowledgeDocFile(markdown: string): {
  path: string;
  data: Uint8Array;
} {
  const { body } = stripLeadingFrontmatter(markdown);
  return { path: KNOWLEDGE_DOC_PATH, data: new TextEncoder().encode(body) };
}
