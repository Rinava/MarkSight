import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFromGitHub, importSkillDir, type GitHubRef } from "../marketplace";

/**
 * A tiny fake of the three GitHub endpoints the importer uses, keyed by URL.
 * Anything not registered answers 404, like the real API.
 */
function mockGitHub(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    if (!(url in routes)) return new Response("Not Found", { status: 404 });
    const body = routes[url];
    if (body instanceof Response) return body.clone();
    if (typeof body === "string") return new Response(body);
    return Response.json(body);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const API = "https://api.github.com/repos/acme/skills";
const RAW = "https://raw.githubusercontent.com/acme/skills/main";
const SKILL_MD = "---\nname: demo\ndescription: Use this when testing.\n---\n\n# Demo";

function file(path: string, size = 10) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return { name, path, type: "file" as const, size, download_url: `${RAW}/${path}` };
}

function dir(path: string) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return { name, path, type: "dir" as const, size: 0, download_url: null };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFromGitHub: skill discovery", () => {
  const tree = {
    tree: [
      { path: "README.md", type: "blob" },
      { path: "skills", type: "tree" },
      { path: "skills/alpha/SKILL.md", type: "blob" },
      { path: "skills/alpha/notes.md", type: "blob" },
      { path: "skills/beta/skill.md", type: "blob" },
      { path: "skills/beta/nested/SKILL.md", type: "blob" },
      { path: "skills-archive/old/SKILL.md", type: "blob" },
      { path: "docs/NOT-A-SKILL.md", type: "blob" },
      { path: "vendor/SKILL.md", type: "tree" },
      { path: "other/zeta/SKILL.md", type: "blob" },
    ],
  };

  it("lists every folder with a SKILL.md, sorted by name", async () => {
    mockGitHub({
      [`${API}/contents/`]: [file("README.md"), dir("skills")],
      [API]: { default_branch: "main" },
      [`${API}/git/trees/main?recursive=1`]: tree,
    });

    const result = await fetchFromGitHub("https://github.com/acme/skills");
    if (result.kind !== "list") throw new Error("expected a list");
    expect(result.skills).toEqual([
      { name: "alpha", path: "skills/alpha" },
      { name: "beta", path: "skills/beta" },
      { name: "nested", path: "skills/beta/nested" },
      { name: "old", path: "skills-archive/old" },
      { name: "zeta", path: "other/zeta" },
    ]);
  });

  it("only returns skills under the requested folder, not lookalike prefixes", async () => {
    mockGitHub({
      [`${API}/contents/skills?ref=main`]: [dir("skills/alpha"), dir("skills/beta")],
      [`${API}/git/trees/main?recursive=1`]: tree,
    });

    const result = await fetchFromGitHub("https://github.com/acme/skills/tree/main/skills");
    if (result.kind !== "list") throw new Error("expected a list");
    // "skills-archive/old" shares the string prefix but is a different folder.
    expect(result.skills.map((s) => s.path)).toEqual([
      "skills/alpha",
      "skills/beta",
      "skills/beta/nested",
    ]);
  });

  it("falls back to main when the repo reports no default branch", async () => {
    const fetchMock = mockGitHub({
      [`${API}/contents/`]: [file("README.md")],
      [API]: {},
      [`${API}/git/trees/main?recursive=1`]: tree,
    });
    await fetchFromGitHub("https://github.com/acme/skills");
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toContain(
      `${API}/git/trees/main?recursive=1`
    );
  });

  it("says so when nothing is found", async () => {
    mockGitHub({
      [`${API}/contents/`]: [file("README.md")],
      [API]: { default_branch: "main" },
      [`${API}/git/trees/main?recursive=1`]: { tree: [{ path: "README.md", type: "blob" }] },
    });
    await expect(fetchFromGitHub("https://github.com/acme/skills")).rejects.toThrow(
      "No SKILL.md found"
    );
  });

  it("surfaces rate limiting instead of reporting an empty repo", async () => {
    mockGitHub({
      [`${API}/contents/`]: new Response("limit", { status: 403 }),
    });
    await expect(fetchFromGitHub("https://github.com/acme/skills")).rejects.toThrow(/rate limit/i);
  });

  it("rejects URLs that aren't GitHub", async () => {
    mockGitHub({});
    await expect(fetchFromGitHub("https://example.com/acme/skills")).rejects.toThrow(
      "Not a GitHub URL"
    );
  });

  it("imports directly when the folder itself holds a SKILL.md", async () => {
    mockGitHub({
      [`${API}/contents/skills/alpha?ref=main`]: [
        file("skills/alpha/SKILL.md"),
        file("skills/alpha/notes.md"),
      ],
      [`${RAW}/skills/alpha/SKILL.md`]: SKILL_MD,
      [`${RAW}/skills/alpha/notes.md`]: "notes",
    });

    const result = await fetchFromGitHub("https://github.com/acme/skills/tree/main/skills/alpha");
    if (result.kind !== "skill") throw new Error("expected a skill");
    expect(result.skill.frontmatter.name).toBe("demo");
    expect(result.skill.rootDir).toBe("alpha");
    expect(result.skill.extraFiles.map((f) => f.path)).toEqual(["notes.md"]);
  });
});

describe("importSkillDir: caps on untrusted repos", () => {
  const gh: GitHubRef = { owner: "acme", repo: "skills", ref: "main", path: "big" };

  it("stops at 30 extra files across the folder and its subfolders", async () => {
    const top = Array.from({ length: 25 }, (_, i) => file(`big/f${i}.txt`));
    const nested = Array.from({ length: 25 }, (_, i) => file(`big/refs/r${i}.txt`));
    const routes: Record<string, unknown> = {
      [`${API}/contents/big/refs?ref=main`]: nested,
      [`${RAW}/big/SKILL.md`]: SKILL_MD,
    };
    for (const entry of [...top, ...nested]) routes[entry.download_url] = "x";
    const fetchMock = mockGitHub(routes);

    const skill = await importSkillDir(gh, "big", [file("big/SKILL.md"), ...top, dir("big/refs")]);

    expect(skill.extraFiles).toHaveLength(30);
    expect(skill.extraFiles.at(-1)?.path).toBe("refs/r4.txt");
    // The 6th nested file and beyond are never downloaded.
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).not.toContain(`${RAW}/big/refs/r5.txt`);
  });

  it("refuses files over 1 MB without downloading them", async () => {
    const fetchMock = mockGitHub({ [`${RAW}/big/SKILL.md`]: SKILL_MD });
    await expect(
      importSkillDir(gh, "big", [file("big/SKILL.md"), file("big/huge.bin", 1_000_001)])
    ).rejects.toThrow("too large");
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).not.toContain(`${RAW}/big/huge.bin`);
  });

  it("accepts a file of exactly 1 MB", async () => {
    mockGitHub({ [`${RAW}/big/SKILL.md`]: SKILL_MD, [`${RAW}/big/ok.bin`]: "x" });
    const skill = await importSkillDir(gh, "big", [
      file("big/SKILL.md"),
      file("big/ok.bin", 1_000_000),
    ]);
    expect(skill.extraFiles.map((f) => f.path)).toEqual(["ok.bin"]);
  });

  it("does not descend past one level of subfolders", async () => {
    mockGitHub({
      [`${API}/contents/big/refs?ref=main`]: [file("big/refs/a.md"), dir("big/refs/deeper")],
      [`${RAW}/big/SKILL.md`]: SKILL_MD,
      [`${RAW}/big/refs/a.md`]: "a",
    });
    const skill = await importSkillDir(gh, "big", [file("big/SKILL.md"), dir("big/refs")]);
    expect(skill.extraFiles.map((f) => f.path)).toEqual(["refs/a.md"]);
  });

  it("fails clearly when the folder has no SKILL.md", async () => {
    mockGitHub({});
    await expect(importSkillDir(gh, "big", [file("big/readme.md")])).rejects.toThrow(
      "No SKILL.md in that folder"
    );
  });
});
