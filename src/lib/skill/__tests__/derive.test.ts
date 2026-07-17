import { describe, it, expect } from "vitest";
import { deriveSkillName, deriveSkillDescription, deriveSkillMeta } from "../derive";

describe("deriveSkillName", () => {
  it("slugifies the first H1, stripping emoji and markdown", () => {
    expect(deriveSkillName("# Welcome to MarkSight 🌿\n\nbody")).toBe("welcome-to-marksight");
  });

  it("strips link syntax to the link text", () => {
    expect(deriveSkillName("# My [Cool](https://x.com) Skill")).toBe("my-cool-skill");
  });

  it("supports setext H1", () => {
    expect(deriveSkillName("My Skill\n========\n\nbody")).toBe("my-skill");
  });

  it("falls back when there is no H1", () => {
    expect(deriveSkillName("just a paragraph, no heading")).toBe("untitled-skill");
  });

  it("falls back when the H1 is emoji/symbol only", () => {
    expect(deriveSkillName("# 🌿🚀✨")).toBe("untitled-skill");
  });

  it("ignores a heading deeper than H1", () => {
    expect(deriveSkillName("## Subheading first\n\n# Real Title")).toBe("real-title");
  });

  it("truncates to 64 chars with no trailing hyphen", () => {
    const name = deriveSkillName(`# ${"a ".repeat(60)}`);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name.endsWith("-")).toBe(false);
  });

  it("ignores pre-existing frontmatter when finding the H1", () => {
    expect(deriveSkillName("---\nfoo: bar\n---\n\n# Real Title")).toBe("real-title");
  });
});

describe("deriveSkillDescription", () => {
  it("uses the first non-heading paragraph as plain text", () => {
    const md = "# Title\n\nThis is the **first** paragraph with a [link](http://x).";
    expect(deriveSkillDescription(md)).toBe("This is the first paragraph with a link.");
  });

  it("skips the H1 and blank lines", () => {
    expect(deriveSkillDescription("# Title\n\n\nReal description here.")).toBe(
      "Real description here."
    );
  });

  it("removes angle brackets", () => {
    expect(deriveSkillDescription("# T\n\nRenders <html> tags")).toBe("Renders html tags");
  });

  it("falls back when there is no paragraph", () => {
    expect(deriveSkillDescription("# Only A Title")).toBe(
      "A skill generated from a MarkSight document."
    );
  });

  it("truncates to <= 1024 characters", () => {
    const md = `# T\n\n${"word ".repeat(400)}`;
    expect(deriveSkillDescription(md).length).toBeLessThanOrEqual(1024);
  });
});

describe("deriveSkillMeta", () => {
  it("produces both fields", () => {
    expect(deriveSkillMeta("# My Skill\n\nDoes a thing.")).toEqual({
      name: "my-skill",
      description: "Does a thing.",
    });
  });
});
