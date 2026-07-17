import { describe, it, expect } from "vitest";
import { buildSkillMd, stripLeadingFrontmatter, parseSkillFrontmatter, yamlString } from "../build";
import { validateSkill } from "../validate";
import { deriveSkillMeta } from "../derive";

describe("stripLeadingFrontmatter", () => {
  it("splits a leading frontmatter block from the body", () => {
    const { frontmatter, body } = stripLeadingFrontmatter("---\nfoo: bar\n---\n\n# Title\n\ntext");
    expect(frontmatter).toBe("foo: bar");
    expect(body).toBe("# Title\n\ntext");
  });

  it("returns null frontmatter when there is none", () => {
    const { frontmatter, body } = stripLeadingFrontmatter("# Title");
    expect(frontmatter).toBeNull();
    expect(body).toBe("# Title");
  });
});

describe("yamlString", () => {
  it("leaves simple strings unquoted", () => {
    expect(yamlString("Does a useful thing")).toBe("Does a useful thing");
  });

  it("quotes strings containing a colon", () => {
    expect(yamlString("Use this: now")).toBe('"Use this: now"');
  });

  it("quotes YAML-reserved scalars and number-like strings", () => {
    // A YAML loader would read these as a bool/null or a number, not a string.
    expect(yamlString("no")).toBe('"no"');
    expect(yamlString("True")).toBe('"True"');
    expect(yamlString("123")).toBe('"123"');
    expect(yamlString("~")).toBe('"~"');
  });
});

describe("buildSkillMd", () => {
  it("composes valid frontmatter + body", () => {
    const md = buildSkillMd(
      { name: "my-skill", description: "Does a thing." },
      "# My Skill\n\nBody text."
    );
    expect(md.startsWith("---\nname: my-skill\n")).toBe(true);
    expect(md).toContain("description: Does a thing.");
    expect(md.trimEnd().endsWith("Body text.")).toBe(true);
  });

  it("strips a pre-existing frontmatter block (no double frontmatter)", () => {
    const md = buildSkillMd(
      { name: "my-skill", description: "ok" },
      "---\ntitle: old\n---\n\n# Body\n\ntext"
    );
    expect(md.match(/^---/gm)?.length).toBe(2); // exactly one frontmatter block
    expect(md).not.toContain("title: old");
  });

  it("round-trips through the minimal parser back to the same metadata", () => {
    const meta = { name: "my-skill", description: 'Tricky: has "quotes"' };
    const md = buildSkillMd(meta, "# Body\n\ntext");
    const { frontmatter } = stripLeadingFrontmatter(md);
    const parsed = parseSkillFrontmatter(frontmatter ?? "");
    expect(parsed.name).toBe(meta.name);
    expect(parsed.description).toBe(meta.description);
  });

  it("produces output that passes validateSkill", () => {
    const meta = { name: "my-skill", description: "A valid description." };
    const md = buildSkillMd(meta, "# Body");
    const { frontmatter } = stripLeadingFrontmatter(md);
    expect(validateSkill(parseSkillFrontmatter(frontmatter ?? "")).valid).toBe(true);
  });

  it("nests version and tags under the allowed metadata key", () => {
    const md = buildSkillMd(
      {
        name: "my-skill",
        description: "Does a thing.",
        version: "2.3.0",
        tags: ["pdf", "ocr"],
      },
      "# Body"
    );
    // Nested under `metadata` (a spec-allowed key), not as top-level frontmatter
    // keys — so a real YAML validator sees only {name, description, metadata}.
    expect(md).toContain("metadata:\n  version: 2.3.0\n  tags: [pdf, ocr]");
    expect(md).not.toMatch(/^version:/m);
    expect(md).not.toMatch(/^tags:/m);
  });

  it("round-trips version + tags through parse and validate", () => {
    const meta = {
      name: "my-skill",
      description: "Does a thing.",
      version: "1.0",
      tags: ["a", "b"],
    };
    const md = buildSkillMd(meta, "# Body");
    const { frontmatter } = stripLeadingFrontmatter(md);
    const parsed = parseSkillFrontmatter(frontmatter ?? "");
    // The `metadata:` block round-trips instead of leaking bogus top-level keys.
    expect(validateSkill(parsed).valid).toBe(true);
    const metadata = parsed.metadata as unknown as {
      version: string;
      tags: string[];
    };
    expect(metadata.version).toBe("1.0");
    expect(metadata.tags).toEqual(["a", "b"]);
  });

  it("round-trips a literal backslash (unescape order)", () => {
    // `C:\newdir` forces quoting (colon) and a backslash followed by `n`.
    const meta = { name: "my-skill", description: "C:\\newdir" };
    const md = buildSkillMd(meta, "# Body");
    const { frontmatter } = stripLeadingFrontmatter(md);
    const parsed = parseSkillFrontmatter(frontmatter ?? "");
    expect(parsed.description).toBe("C:\\newdir");
  });

  it("omits the metadata block when version and tags are absent", () => {
    const md = buildSkillMd({ name: "my-skill", description: "Does a thing." }, "# Body");
    expect(md).not.toContain("metadata:");
  });

  it("auto-derived metadata builds a spec-valid SKILL.md", () => {
    const doc = "# Welcome to MarkSight 🌿\n\nAn open source markdown editor.";
    const md = buildSkillMd(deriveSkillMeta(doc), doc);
    const { frontmatter } = stripLeadingFrontmatter(md);
    expect(validateSkill(parseSkillFrontmatter(frontmatter ?? "")).valid).toBe(true);
  });
});
