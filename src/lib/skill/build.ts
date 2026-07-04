import type { SkillMeta } from "./types";

/**
 * Assemble a `SKILL.md` string from skill metadata and a markdown body, and the
 * small frontmatter helpers shared with derivation. Pure string logic — no
 * React/Next imports — so it runs in the browser, the AI route, and the MCP
 * server alike.
 */

const BOM = 0xfeff;
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n)*/;

/**
 * Split a leading YAML frontmatter block off a markdown document.
 * Returns the raw frontmatter text (or null) and the remaining body.
 */
export function stripLeadingFrontmatter(markdown: string): {
  frontmatter: string | null;
  body: string;
} {
  const text = markdown.charCodeAt(0) === BOM ? markdown.slice(1) : markdown;
  const match = text.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: null, body: text };
  return {
    frontmatter: match[1],
    body: text.slice(match[0].length),
  };
}

/** Serialize a string as a YAML scalar, double-quoting only when necessary. */
export function yamlString(value: string): string {
  const needsQuote =
    value === "" ||
    /^[\s>|@`"'%&*!?#-]/.test(value) ||
    /\s$/.test(value) ||
    value.includes(": ") ||
    value.includes(" #") ||
    /[:#[\]{}",]/.test(value) ||
    /[\n\t]/.test(value);

  if (!needsQuote) return value;

  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

/**
 * Build a complete `SKILL.md`: validated frontmatter followed by the document
 * body (with any pre-existing frontmatter stripped to avoid a double block).
 */
export function buildSkillMd(meta: SkillMeta, markdown: string): string {
  const { body } = stripLeadingFrontmatter(markdown);

  const lines: string[] = [
    `name: ${yamlString(meta.name)}`,
    `description: ${yamlString(meta.description)}`,
  ];
  if (meta.license) lines.push(`license: ${yamlString(meta.license)}`);
  if (meta.allowedTools) {
    lines.push(`allowed-tools: ${yamlString(meta.allowedTools)}`);
  }
  if (meta.compatibility) {
    lines.push(`compatibility: ${yamlString(meta.compatibility)}`);
  }

  // version/tags aren't top-level Agent Skill keys, so nest them under the
  // spec-allowed `metadata` dict (keeps validateSkill happy).
  const version = meta.version?.trim();
  const tags = (meta.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (version || tags.length > 0) {
    lines.push("metadata:");
    if (version) lines.push(`  version: ${yamlString(version)}`);
    if (tags.length > 0) {
      lines.push(`  tags: [${tags.map((t) => yamlString(t)).join(", ")}]`);
    }
  }

  const trimmedBody = body.replace(/^\s+/, "").replace(/\s+$/, "");
  return `---\n${lines.join("\n")}\n---\n\n${trimmedBody}\n`;
}

/**
 * Minimal parser for the simple `key: value` frontmatter that `buildSkillMd`
 * emits. Sufficient for round-trip validation; not a full YAML parser.
 */
export function parseSkillFrontmatter(
  frontmatter: string,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of frontmatter.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    result[key] = value;
  }
  return result;
}
