import { buildSkillMd } from "./build";
import type { SkillMeta } from "./types";

/**
 * Package a skill into a `.skill` bundle (a zip whose entries are namespaced
 * under the skill folder, e.g. `my-skill/SKILL.md`). Returns the raw zip bytes
 * so the caller decides how to deliver them (browser download, base64, etc.).
 *
 * `fflate` is imported lazily so it stays out of the initial client bundle and
 * only loads when a user actually packages a bundle.
 */
export async function packageSkill(
  meta: SkillMeta,
  markdown: string,
): Promise<Uint8Array> {
  const skillMd = buildSkillMd(meta, markdown);
  const { zipSync, strToU8 } = await import("fflate");
  return zipSync(
    { [`${meta.name}/SKILL.md`]: strToU8(skillMd) },
    { level: 6 },
  );
}
