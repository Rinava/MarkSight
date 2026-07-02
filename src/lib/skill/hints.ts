import { stripLeadingFrontmatter } from "./build";
import type { SkillMeta } from "./types";

/**
 * Non-blocking quality hints: a skill can be spec-valid yet useless — Claude
 * triggers skills from the description, and instruction-shaped bodies work
 * better than raw content. These heuristics flag the common gaps; they never
 * block export.
 */

export interface SkillHint {
  id: string;
  message: string;
}

const USE_WHEN_RE =
  /\b(use (this |it )?(skill )?when(ever)?|use (this |it )?for|when(ever)? the user|trigger|invoke)\b/i;

const GENERIC_OPENERS_RE =
  /^(welcome|hello|hi\b|this (document|file|page)|introduction|readme|notes?\b)/i;

const INSTRUCTION_HEADING_RE =
  /^#{2,6}\s+(when to use|steps|instructions?|usage|how to|workflow|process|output( format)?)/im;

const MAX_BODY_LINES = 500;

export function skillQualityHints(
  meta: SkillMeta,
  markdown: string,
): SkillHint[] {
  const hints: SkillHint[] = [];
  const { body } = stripLeadingFrontmatter(markdown);

  if (!USE_WHEN_RE.test(meta.description)) {
    hints.push({
      id: "no-use-when",
      message:
        'Description has no trigger context — Claude decides when to use a skill from its description. Add a sentence like "Use this when …".',
    });
  }

  if (GENERIC_OPENERS_RE.test(meta.description.trim())) {
    hints.push({
      id: "generic-description",
      message:
        "Description reads like a document intro, not a skill trigger. Describe what the skill does and when to use it.",
    });
  }

  const lineCount = body.split("\n").length;
  if (lineCount > MAX_BODY_LINES) {
    hints.push({
      id: "long-body",
      message: `Body is ${lineCount} lines — the recommended limit is ~${MAX_BODY_LINES}. Consider moving detail into references/ files (knowledge mode does this automatically).`,
    });
  }

  const hasHeadings = /^#{2,6}\s+\S/m.test(body);
  if (hasHeadings && !INSTRUCTION_HEADING_RE.test(body)) {
    hints.push({
      id: "no-instruction-headings",
      message:
        'No instruction-shaped sections found (e.g. "When to use", "Steps", "Output format"). Skills work best as imperative instructions.',
    });
  }

  return hints;
}
