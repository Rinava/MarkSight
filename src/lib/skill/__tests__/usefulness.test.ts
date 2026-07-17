import { describe, it, expect } from "vitest";
import { skillQualityHints } from "../hints";
import {
  suggestSkillMode,
  knowledgeDocFile,
  KNOWLEDGE_DOC_PATH,
} from "../knowledge";
import { SKILL_TEMPLATE } from "../template";
import { deriveSkillMeta } from "../derive";
import {
  stripLeadingFrontmatter,
  parseSkillFrontmatter,
} from "../build";
import { validateSkill } from "../validate";

const HOWTO_DOC = `# Deploy Guide

Use this when the user asks to deploy the app.

## Steps

1. Run the build.
2. Check the output.
3. Deploy to production.
`;

const NOTES_DOC = `# Team Offsite Notes

Welcome to the notes from our March offsite.

## Attendees

Some people were there.

## Discussion

We talked about many things.
`;

describe("skillQualityHints", () => {
  it("flags a description with no trigger context", () => {
    const hints = skillQualityHints(
      { name: "x", description: "A markdown editor." },
      "# X\n\nbody",
    );
    expect(hints.map((h) => h.id)).toContain("no-use-when");
  });

  it("flags generic document-intro descriptions", () => {
    const hints = skillQualityHints(
      { name: "x", description: "Welcome to the most advanced editor!" },
      "# X",
    );
    expect(hints.map((h) => h.id)).toContain("generic-description");
  });

  it("flags bodies over 500 lines", () => {
    const long = `# X\n\n${"line\n".repeat(600)}`;
    const hints = skillQualityHints(
      { name: "x", description: "Use this when testing." },
      long,
    );
    expect(hints.map((h) => h.id)).toContain("long-body");
  });

  it("flags heading structure without instruction sections", () => {
    const hints = skillQualityHints(
      { name: "x", description: "Use this when testing." },
      NOTES_DOC,
    );
    expect(hints.map((h) => h.id)).toContain("no-instruction-headings");
  });

  it("is clean for a well-shaped skill", () => {
    const hints = skillQualityHints(
      { name: "deploy", description: "Use this when the user asks to deploy." },
      HOWTO_DOC,
    );
    expect(hints).toEqual([]);
  });

  it('accepts "whenever" trigger phrasing (real marketplace skills use it)', () => {
    const hints = skillQualityHints(
      {
        name: "pdf",
        description:
          "Use this skill whenever the user wants to do anything with PDF files.",
      },
      HOWTO_DOC,
    );
    expect(hints.map((h) => h.id)).not.toContain("no-use-when");
  });
});

describe("suggestSkillMode", () => {
  it("suggests instruction mode for how-to documents", () => {
    expect(suggestSkillMode(HOWTO_DOC)).toBe("instruction");
  });

  it("suggests knowledge mode for content documents", () => {
    expect(suggestSkillMode(NOTES_DOC)).toBe("knowledge");
  });
});

describe("knowledge packaging", () => {

  it("ships the document body (frontmatter stripped) as the payload", () => {
    const file = knowledgeDocFile("---\nname: x\ndescription: y\n---\n\n# Doc\n\nContent.");
    expect(file.path).toBe(KNOWLEDGE_DOC_PATH);
    const text = new TextDecoder().decode(file.data);
    expect(text).toContain("# Doc");
    expect(text).not.toContain("name: x");
  });
});

describe("SKILL_TEMPLATE", () => {
  it("derives valid metadata and passes all quality hints", () => {
    const meta = deriveSkillMeta(SKILL_TEMPLATE);
    expect(meta.name).toBe("my-new-skill");
    expect(validateSkill({ ...meta }).valid).toBe(true);
    expect(skillQualityHints(meta, SKILL_TEMPLATE)).toEqual([]);
    expect(suggestSkillMode(SKILL_TEMPLATE)).toBe("instruction");
  });
});
