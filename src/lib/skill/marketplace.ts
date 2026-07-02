import { importSkillMd, type ImportedSkill } from "./import";

/**
 * Fetch skills from public GitHub-hosted sources (the common denominator for
 * skill marketplaces: the official anthropics/skills repo, Claude plugin
 * marketplaces, community collections).
 *
 * Everything runs client-side against api.github.com / raw.githubusercontent.com
 * (both CORS-enabled; unauthenticated — subject to GitHub's per-IP rate limit,
 * surfaced as a friendly error). Imported content is untrusted: it is only ever
 * rendered as text and re-packaged, never executed.
 */

export interface GitHubRef {
  owner: string;
  repo: string;
  ref: string | null;
  path: string;
}

export interface MarketplaceSource {
  label: string;
  /** Prefill URL for the import box. */
  url: string;
}

/** Curated quick-picks; the generic URL import covers everything else. */
export const MARKETPLACE_SOURCES: MarketplaceSource[] = [
  {
    label: "Anthropic skills (official)",
    url: "https://github.com/anthropics/skills",
  },
  {
    label: "Claude plugins (official marketplace)",
    url: "https://github.com/anthropics/claude-plugins-public",
  },
];

const API = "https://api.github.com";
const MAX_EXTRA_FILES = 30;
const MAX_FILE_BYTES = 1_000_000;

export function parseGitHubUrl(input: string): GitHubRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (url.hostname === "raw.githubusercontent.com") {
    // /{owner}/{repo}/{ref}/{...path}
    if (parts.length < 3) return null;
    const [owner, repo, ref, ...rest] = parts;
    return { owner, repo, ref, path: rest.join("/") };
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return null;
  }
  if (parts.length < 2) return null;

  const [owner, repo, kind, ref, ...rest] = parts;
  if (kind === "tree" || kind === "blob") {
    return { owner, repo, ref: ref ?? null, path: rest.join("/") };
  }
  return { owner, repo, ref: null, path: "" };
}

interface ContentsEntry {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  download_url: string | null;
}

async function ghFetch(url: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (response.status === 403 || response.status === 429) {
    throw new Error(
      "GitHub rate limit reached — wait a few minutes and try again",
    );
  }
  if (response.status === 404) {
    throw new Error("Not found on GitHub — check the URL (private repos are not supported)");
  }
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status})`);
  }
  return response;
}

async function listDir(gh: GitHubRef, path: string): Promise<ContentsEntry[]> {
  const refQuery = gh.ref ? `?ref=${encodeURIComponent(gh.ref)}` : "";
  const response = await ghFetch(
    `${API}/repos/${gh.owner}/${gh.repo}/contents/${path}${refQuery}`,
  );
  const json = await response.json();
  if (!Array.isArray(json)) throw new Error("Expected a directory listing");
  return json as ContentsEntry[];
}

async function fetchFile(entry: ContentsEntry): Promise<Uint8Array> {
  if (!entry.download_url) throw new Error(`No download URL for ${entry.path}`);
  if (entry.size > MAX_FILE_BYTES) {
    throw new Error(`${entry.name} is too large to import (>1 MB)`);
  }
  const response = await ghFetch(entry.download_url);
  return new Uint8Array(await response.arrayBuffer());
}

/** A skill folder discovered inside a repo (a directory containing SKILL.md). */
export interface DiscoveredSkill {
  name: string;
  path: string;
}

/**
 * Resolve a GitHub URL to either a single imported skill (when the URL points
 * at a SKILL.md or a folder containing one) or a list of discovered skill
 * folders to choose from (when it points at a repo/collection).
 */
export async function fetchFromGitHub(
  input: string,
): Promise<
  | { kind: "skill"; skill: ImportedSkill; source: string }
  | { kind: "list"; skills: DiscoveredSkill[]; gh: GitHubRef }
> {
  const gh = parseGitHubUrl(input);
  if (!gh) {
    throw new Error("Not a GitHub URL — paste a repo, folder, or SKILL.md link");
  }

  // Direct SKILL.md link → import it plus its sibling files.
  if (/(^|\/)SKILL\.md$/i.test(gh.path)) {
    const dir = gh.path.includes("/")
      ? gh.path.slice(0, gh.path.lastIndexOf("/"))
      : "";
    return { kind: "skill", skill: await importSkillDir(gh, dir), source: input };
  }

  // Folder → skill if it contains SKILL.md, otherwise discover skills below it.
  const entries = await listDir(gh, gh.path);
  if (entries.some((e) => e.type === "file" && e.name === "SKILL.md")) {
    return {
      kind: "skill",
      skill: await importSkillDir(gh, gh.path, entries),
      source: input,
    };
  }

  const skills = await discoverSkills(gh, entries);
  if (skills.length === 0) {
    throw new Error("No SKILL.md found at that location");
  }
  return { kind: "list", skills, gh };
}

/** Import a directory that contains SKILL.md, carrying subfiles (depth 1–2). */
export async function importSkillDir(
  gh: GitHubRef,
  dirPath: string,
  preListed?: ContentsEntry[],
): Promise<ImportedSkill> {
  const entries = preListed ?? (await listDir(gh, dirPath));
  const skillMd = entries.find((e) => e.type === "file" && e.name === "SKILL.md");
  if (!skillMd) throw new Error("No SKILL.md in that folder");

  const text = new TextDecoder().decode(await fetchFile(skillMd));
  const imported = importSkillMd(text);

  const extraFiles: { path: string; data: Uint8Array }[] = [];
  const siblings = entries.filter((e) => e.name !== "SKILL.md");
  for (const entry of siblings) {
    if (extraFiles.length >= MAX_EXTRA_FILES) break;
    if (entry.type === "file") {
      extraFiles.push({ path: entry.name, data: await fetchFile(entry) });
    } else if (entry.type === "dir") {
      const children = await listDir(gh, entry.path);
      for (const child of children) {
        if (extraFiles.length >= MAX_EXTRA_FILES) break;
        if (child.type !== "file") continue; // depth capped at 2
        extraFiles.push({
          path: `${entry.name}/${child.name}`,
          data: await fetchFile(child),
        });
      }
    }
  }

  const rootDir = dirPath ? dirPath.slice(dirPath.lastIndexOf("/") + 1) : null;
  return { ...imported, extraFiles, rootDir };
}

/** Find directories containing a SKILL.md, one level deep from the entries. */
async function discoverSkills(
  gh: GitHubRef,
  entries: ContentsEntry[],
): Promise<DiscoveredSkill[]> {
  const dirs = entries.filter((e) => e.type === "dir").slice(0, 40);
  const found: DiscoveredSkill[] = [];

  const checks = await Promise.allSettled(
    dirs.map(async (dir) => {
      const children = await listDir(gh, dir.path);
      if (children.some((c) => c.type === "file" && c.name === "SKILL.md")) {
        found.push({ name: dir.name, path: dir.path });
      } else {
        // Common layout: a collection dir (skills/, plugins/…) one level up.
        for (const child of children.filter((c) => c.type === "dir").slice(0, 20)) {
          const grandchildren = await listDir(gh, child.path);
          if (grandchildren.some((g) => g.type === "file" && g.name === "SKILL.md")) {
            found.push({ name: child.name, path: child.path });
          }
        }
      }
    }),
  );
  void checks;

  return found.sort((a, b) => a.name.localeCompare(b.name));
}
