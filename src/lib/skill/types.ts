/**
 * Types for the MarkSight Skill Creator.
 *
 * An "Agent Skill" is the `SKILL.md` + bundle format that Claude (Claude Code,
 * claude.ai) and other AI agents ingest. These types model the frontmatter we
 * generate; the rules are enforced by `validateSkill` (a faithful port of the
 * official skill-creator `quick_validate.py`).
 */

/** Frontmatter keys allowed in a `SKILL.md`, in their on-disk (YAML) spelling. */
export const ALLOWED_FRONTMATTER_KEYS = [
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
  "compatibility",
] as const;

/** Skill metadata in object form (camelCase; serialized to YAML by `buildSkillMd`). */
export interface SkillMeta {
  /** kebab-case, `^[a-z0-9-]+$`, no leading/trailing hyphen, no `--`, ≤ 64 chars. */
  name: string;
  /** ≤ 1024 chars, no angle brackets (`<` / `>`). */
  description: string;
  /** Optional, serialized as `license`. */
  license?: string;
  /** Optional, serialized as `allowed-tools`. */
  allowedTools?: string;
  /** Optional, serialized as `compatibility`; ≤ 500 chars. */
  compatibility?: string;
  /** Optional; serialized under the spec-allowed `metadata` key (not a top-level key). */
  version?: string;
  /** Optional; serialized under `metadata.tags`. */
  tags?: string[];
}

/** A draft skill: derived metadata plus the markdown body it was built from. */
export interface SkillDraft {
  meta: SkillMeta;
  /** The markdown body (document content, with any pre-existing frontmatter stripped). */
  body: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** A bundle file carried alongside `SKILL.md` (e.g. `references/`, `scripts/`). */
export interface SkillExtraFile {
  path: string;
  data: Uint8Array;
}
