import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  seedSkillMeta,
  effectiveSkillBody,
  buildSkillMdForMode,
  packageSkillForMode,
} from "../draft";
import { knowledgeSkillBody, KNOWLEDGE_DOC_PATH } from "../knowledge";
import type { SkillMeta } from "../types";

const HOWTO_DOC = `# Deploy Guide

Use this when the user asks to deploy the app.

## Steps

1. Run the build.
2. Check the output.
3. Deploy to production.
`;

const NOTES_DOC = `# Team Offsite Notes

Welcome to the notes from our March offsite.

## Discussion

We talked about many things.
`;

const FRONTMATTER_DOC = `---
name: custom-name
description: Use this when testing frontmatter overrides.
---

# Some Other Title

A paragraph that would otherwise become the description.
`;

describe("seedSkillMeta", () => {
  it("derives name from the H1 and description from the first paragraph", () => {
    const seeded = seedSkillMeta(HOWTO_DOC);
    expect(seeded.name).toBe("deploy-guide");
    expect(seeded.description).toContain("deploy the app");
  });

  it("prefers document frontmatter over derived metadata", () => {
    const seeded = seedSkillMeta(FRONTMATTER_DOC);
    expect(seeded.name).toBe("custom-name");
    expect(seeded.description).toContain("frontmatter overrides");
  });
});

describe("effectiveSkillBody", () => {
  it("uses the document itself in instruction mode", () => {
    expect(effectiveSkillBody(HOWTO_DOC, "instruction")).toBe(HOWTO_DOC);
  });

  it("uses the pointer body in knowledge mode", () => {
    expect(effectiveSkillBody(HOWTO_DOC, "knowledge")).toBe(knowledgeSkillBody());
  });
});

describe("buildSkillMdForMode", () => {
  const meta: SkillMeta = { name: "deploy-guide", description: "Use this to deploy." };

  it("embeds the document body in instruction mode", () => {
    const md = buildSkillMdForMode(meta, HOWTO_DOC, "instruction");
    expect(md).toContain("## Steps");
    expect(md).toContain("name: deploy-guide");
  });

  it("emits the pointer and omits the document body in knowledge mode", () => {
    const md = buildSkillMdForMode(meta, NOTES_DOC, "knowledge");
    expect(md).toContain(KNOWLEDGE_DOC_PATH);
    expect(md).not.toContain("## Discussion");
  });
});

describe("packageSkillForMode", () => {
  const meta: SkillMeta = { name: "deploy-guide", description: "Use this to deploy." };

  it("packages instruction mode with the document as the body, extras preserved", async () => {
    const extra = {
      path: "references/extra.md",
      data: new TextEncoder().encode("extra"),
    };
    const bytes = await packageSkillForMode(meta, HOWTO_DOC, "instruction", [extra]);
    const entries = unzipSync(bytes);
    expect(strFromU8(entries["deploy-guide/SKILL.md"])).toContain("## Steps");
    expect(strFromU8(entries["deploy-guide/references/extra.md"])).toBe("extra");
  });

  it("packages knowledge mode with the pointer plus the document payload", async () => {
    const bytes = await packageSkillForMode(meta, NOTES_DOC, "knowledge");
    const entries = unzipSync(bytes);
    expect(strFromU8(entries["deploy-guide/SKILL.md"])).toContain(KNOWLEDGE_DOC_PATH);
    expect(strFromU8(entries[`deploy-guide/${KNOWLEDGE_DOC_PATH}`])).toContain("## Discussion");
  });
});
