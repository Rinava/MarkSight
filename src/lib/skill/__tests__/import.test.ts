import { describe, it, expect } from "vitest";
import { importSkillMd, importSkillBundle } from "../import";
import { packageSkill } from "../package";
import { parseGitHubUrl } from "../marketplace";

describe("importSkillMd", () => {
  it("parses frontmatter and keeps full markdown", () => {
    const text = "---\nname: my-skill\ndescription: Does things.\n---\n\n# Body";
    const imported = importSkillMd(text);
    expect(imported.frontmatter.name).toBe("my-skill");
    expect(imported.frontmatter.description).toBe("Does things.");
    expect(imported.markdown).toBe(text);
    expect(imported.extraFiles).toEqual([]);
  });

  it("handles documents without frontmatter", () => {
    const imported = importSkillMd("# Just a doc");
    expect(imported.frontmatter).toEqual({});
  });
});

describe("importSkillBundle ↔ packageSkill round-trip", () => {
  it("re-imports a packaged skill with extra files preserved", async () => {
    const extras = [
      { path: "references/notes.md", data: new TextEncoder().encode("# Notes") },
      { path: "scripts/run.py", data: new TextEncoder().encode("print('hi')") },
    ];
    const bytes = await packageSkill(
      { name: "round-trip", description: "A round trip." },
      "# Round Trip\n\nBody.",
      extras,
    );

    const imported = await importSkillBundle(bytes);
    expect(imported.rootDir).toBe("round-trip");
    expect(imported.frontmatter.name).toBe("round-trip");
    expect(imported.extraFiles.map((f) => f.path).sort()).toEqual([
      "references/notes.md",
      "scripts/run.py",
    ]);
    expect(new TextDecoder().decode(imported.extraFiles[0].data)).toContain(
      "Notes",
    );
  });

  it("rejects bundles with no SKILL.md", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const bytes = zipSync({ "readme.txt": strToU8("nope") });
    await expect(importSkillBundle(bytes)).rejects.toThrow(/No SKILL\.md/);
  });

  it("prefers the shallowest SKILL.md", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const bytes = zipSync({
      "outer/SKILL.md": strToU8("---\nname: outer\ndescription: x\n---\nbody"),
      "outer/examples/nested/SKILL.md": strToU8(
        "---\nname: nested\ndescription: x\n---\nbody",
      ),
    });
    const imported = await importSkillBundle(bytes);
    expect(imported.frontmatter.name).toBe("outer");
    expect(imported.extraFiles.map((f) => f.path)).toEqual([
      "examples/nested/SKILL.md",
    ]);
  });

  it("rejects bundles with too many files", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const files: Record<string, Uint8Array> = {
      "SKILL.md": strToU8("---\nname: big\ndescription: x\n---\nbody"),
    };
    for (let i = 0; i < 30; i += 1) {
      files[`references/file-${i}.txt`] = strToU8("x");
    }
    await expect(importSkillBundle(zipSync(files))).rejects.toThrow(
      /too many files/,
    );
  });

  it("rejects bundles with an oversized file", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const bytes = zipSync({
      "SKILL.md": strToU8("---\nname: big\ndescription: x\n---\nbody"),
      "references/huge.bin": new Uint8Array(1_000_001),
    });
    await expect(importSkillBundle(bytes)).rejects.toThrow(/too large/);
  });
});

describe("parseGitHubUrl", () => {
  it("parses repo URLs", () => {
    expect(parseGitHubUrl("https://github.com/anthropics/skills")).toEqual({
      owner: "anthropics",
      repo: "skills",
      ref: null,
      path: "",
    });
  });

  it("parses tree and blob URLs with refs and paths", () => {
    expect(
      parseGitHubUrl("https://github.com/o/r/tree/main/skills/pdf"),
    ).toEqual({ owner: "o", repo: "r", ref: "main", path: "skills/pdf" });
    expect(
      parseGitHubUrl("https://github.com/o/r/blob/main/skills/pdf/SKILL.md"),
    ).toEqual({ owner: "o", repo: "r", ref: "main", path: "skills/pdf/SKILL.md" });
  });

  it("parses raw.githubusercontent.com URLs", () => {
    expect(
      parseGitHubUrl("https://raw.githubusercontent.com/o/r/main/x/SKILL.md"),
    ).toEqual({ owner: "o", repo: "r", ref: "main", path: "x/SKILL.md" });
  });

  it("rejects non-GitHub URLs and garbage", () => {
    expect(parseGitHubUrl("https://gitlab.com/o/r")).toBeNull();
    expect(parseGitHubUrl("not a url")).toBeNull();
  });
});
