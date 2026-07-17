import { buildSkillMd, parseSkillFrontmatter, stripLeadingFrontmatter } from "./build";
import { deriveSkillMeta } from "./derive";
import { knowledgeDocFile, knowledgeSkillBody, type SkillMode } from "./knowledge";
import { packageSkill } from "./package";
import type { SkillExtraFile, SkillMeta } from "./types";

/**
 * Pure skill-draft helpers shared by the editable skill state, the sidebar
 * panel, and the one-click toolbar export. Keeping the per-mode body, seeding,
 * and packaging in one tested place stops the four call sites from drifting.
 */

/** Seed editable metadata from a document — frontmatter wins, derivation is the fallback. */
export function seedSkillMeta(content: string): {
  name: string;
  description: string;
} {
  const { frontmatter } = stripLeadingFrontmatter(content);
  const fm = frontmatter ? parseSkillFrontmatter(frontmatter) : {};
  const derived = deriveSkillMeta(content);
  return {
    name: fm.name?.trim() || derived.name,
    description: fm.description?.trim() || derived.description,
  };
}

/**
 * The body the skill ships as its instructions: the document itself in
 * instruction mode, or the short pointer in knowledge mode (where the document
 * travels as `references/document.md` instead).
 */
export function effectiveSkillBody(content: string, mode: SkillMode): string {
  return mode === "knowledge" ? knowledgeSkillBody() : content;
}

/** The generated `SKILL.md` for the given metadata, document, and packaging mode. */
export function buildSkillMdForMode(meta: SkillMeta, content: string, mode: SkillMode): string {
  return buildSkillMd(meta, effectiveSkillBody(content, mode));
}

/** Package the skill into `.skill` zip bytes, honoring the packaging mode. */
export function packageSkillForMode(
  meta: SkillMeta,
  content: string,
  mode: SkillMode,
  extraFiles: SkillExtraFile[] = []
): Promise<Uint8Array> {
  return mode === "knowledge"
    ? packageSkill(meta, knowledgeSkillBody(), [knowledgeDocFile(content), ...extraFiles])
    : packageSkill(meta, content, extraFiles);
}
