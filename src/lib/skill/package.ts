import { buildSkillMd } from "./build";
import type { SkillMeta } from "./types";

/**
 * Package a skill into a `.skill` bundle (a zip whose entries are namespaced
 * under the skill folder, e.g. `my-skill/SKILL.md`). Returns the raw zip bytes
 * so the caller decides how to deliver them (browser download, base64, etc.).
 *
 * `extraFiles` (e.g. `references/`, `scripts/` carried over from an imported
 * bundle) are preserved verbatim under the same skill folder.
 *
 * `fflate` is imported lazily so it stays out of the initial client bundle and
 * only loads when a user actually packages a bundle.
 */
export async function packageSkill(
  meta: SkillMeta,
  markdown: string,
  extraFiles: { path: string; data: Uint8Array }[] = []
): Promise<Uint8Array> {
  const skillMd = buildSkillMd(meta, markdown);
  const { zipSync, strToU8 } = await import("fflate");

  const entries: Record<string, Uint8Array> = {
    [`${meta.name}/SKILL.md`]: strToU8(skillMd),
  };
  for (const file of extraFiles) {
    if (!file.path || file.path.includes("..")) continue;
    entries[`${meta.name}/${file.path}`] = file.data;
  }

  return zipSync(entries, { level: 6 });
}
