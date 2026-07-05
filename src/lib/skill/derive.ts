import { stripLeadingFrontmatter } from "./build";
import type { SkillMeta } from "./types";

/**
 * Auto-derive skill metadata from a markdown document:
 *   - `name` from the first H1 (slugified to the skill-name charset)
 *   - `description` from the first non-heading paragraph (stripped to plain text)
 * Both have deterministic fallbacks so the output is always spec-valid.
 */

const NAME_FALLBACK = "untitled-skill";
const DESCRIPTION_FALLBACK = "A skill generated from a MarkSight document.";
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;

/** Reduce inline markdown to readable plain text. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/`+([^`]*)`+/g, "$1") // inline code
    .replace(/[*_~]+/g, "") // emphasis markers
    .replace(/^>+[ \t]?/gm, "") // blockquote markers
    .replace(/^#{1,6}[ \t]+/gm, ""); // stray heading markers
}

/** First H1 (ATX `# …` or setext `text\n===`) text, or null. */
function firstH1(body: string): string | null {
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const atx = lines[i].match(/^#[ \t]+(.+?)[ \t]*#*[ \t]*$/);
    if (atx) return atx[1];

    const text = lines[i].trim();
    const next = lines[i + 1]?.trim();
    if (text && !/^#{1,6}[ \t]/.test(text) && next && /^=+$/.test(next)) {
      return text;
    }
  }
  return null;
}

/** First non-heading paragraph (joined to a single line), or "". */
function firstParagraph(body: string): string {
  const lines = body.split(/\r?\n/);
  const collected: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      if (collected.length) break;
      continue;
    }
    if (/^#{1,6}[ \t]+/.test(trimmed)) continue; // ATX heading
    if (/^(=+|-+)[ \t]*$/.test(trimmed)) continue; // setext underline / rule

    // A line immediately followed by a setext underline is a heading — skip it.
    const next = lines[i + 1]?.trim();
    if (!collected.length && next && /^(=+|-+)$/.test(next)) continue;

    collected.push(trimmed);
  }

  return collected.join(" ");
}

export function deriveSkillName(markdown: string): string {
  const { body } = stripLeadingFrontmatter(markdown);
  const heading = firstH1(body);
  if (!heading) return NAME_FALLBACK;

  const slug = stripInlineMarkdown(heading)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, MAX_NAME_LENGTH)
    .replace(/-+$/, "");

  return slug || NAME_FALLBACK;
}

export function deriveSkillDescription(markdown: string): string {
  const { body } = stripLeadingFrontmatter(markdown);

  let description = stripInlineMarkdown(firstParagraph(body))
    .replace(/[<>]/g, "") // spec forbids angle brackets
    .replace(/\s+/g, " ")
    .trim();

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    const cut = description.slice(0, MAX_DESCRIPTION_LENGTH);
    description = cut.replace(/\s+\S*$/, "").trim() || cut;
  }

  return description || DESCRIPTION_FALLBACK;
}

export function deriveSkillMeta(markdown: string): SkillMeta {
  return {
    name: deriveSkillName(markdown),
    description: deriveSkillDescription(markdown),
  };
}
