import { parseSkillFrontmatter, stripLeadingFrontmatter } from "./build";

/**
 * Import an existing skill — from a pasted/opened `SKILL.md` or a packaged
 * `.skill`/`.zip` bundle — so it can be edited in MarkSight and re-exported.
 *
 * Bundles may carry files beyond `SKILL.md` (`references/`, `scripts/`,
 * `assets/`). Those can't be edited in a single-document editor, so they are
 * returned as `extraFiles` and preserved verbatim on re-export.
 */

export interface ImportedSkill {
  /** Parsed frontmatter (on-disk key spelling), {} if none was present. */
  frontmatter: Record<string, string>;
  /** Full markdown for the editor: frontmatter block + body, normalized. */
  markdown: string;
  /** Bundle files other than SKILL.md, paths relative to the skill root. */
  extraFiles: { path: string; data: Uint8Array }[];
  /** Top-level folder name inside the bundle, if the zip was namespaced. */
  rootDir: string | null;
}

export function importSkillMd(text: string): ImportedSkill {
  const { frontmatter } = stripLeadingFrontmatter(text);
  return {
    frontmatter: frontmatter ? parseSkillFrontmatter(frontmatter) : {},
    markdown: text,
    extraFiles: [],
    rootDir: null,
  };
}

const SKILL_MD_RE = /(^|\/)SKILL\.md$/;

export async function importSkillBundle(
  bytes: Uint8Array,
): Promise<ImportedSkill> {
  const { unzipSync, strFromU8 } = await import("fflate");
  const entries = unzipSync(bytes);

  const paths = Object.keys(entries).filter(
    (p) => !p.endsWith("/") && !p.split("/").includes("__MACOSX"),
  );
  const skillMdPath = paths
    .filter((p) => SKILL_MD_RE.test(p))
    // Prefer the shallowest SKILL.md (the skill root, not a nested example).
    .sort((a, b) => a.split("/").length - b.split("/").length)[0];

  if (!skillMdPath) {
    throw new Error("No SKILL.md found in the bundle");
  }

  const rootDir = skillMdPath.includes("/")
    ? skillMdPath.slice(0, skillMdPath.lastIndexOf("/"))
    : null;
  const prefix = rootDir ? `${rootDir}/` : "";

  const extraFiles = paths
    .filter((p) => p !== skillMdPath && p.startsWith(prefix))
    .map((p) => ({ path: p.slice(prefix.length), data: entries[p] }));

  const imported = importSkillMd(strFromU8(entries[skillMdPath]));
  return { ...imported, extraFiles, rootDir };
}
