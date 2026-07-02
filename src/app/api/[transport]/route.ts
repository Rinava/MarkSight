import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { deriveSkillMeta } from "@/lib/skill/derive";
import { buildSkillMd } from "@/lib/skill/build";
import { validateSkill } from "@/lib/skill/validate";
import { packageSkill } from "@/lib/skill/package";
import { renderMarkdownToHtml } from "@/lib/markdown/to-html";
import { buildOutline } from "@/lib/markdown/outline";
import { documentMetrics } from "@/lib/markdown/metrics";

/**
 * MarkSight MCP server (streamable HTTP at /api/mcp).
 *
 * Stateless tool suite: every tool is a thin typed wrapper over the same
 * `src/lib` cores the editor uses, so MCP output is identical to in-app
 * output. Add with:  claude mcp add --transport http marksight <url>/api/mcp
 */

const MAX_MARKDOWN_BYTES = 500_000;

const markdownField = z
  .string()
  .min(1, "markdown must not be empty")
  .max(MAX_MARKDOWN_BYTES, "markdown too large");

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_skill",
      {
        title: "Create Agent Skill",
        description:
          "Package a markdown document as an Agent Skill: derives (or accepts) name/description, builds a validated SKILL.md, and returns a base64 .skill zip bundle namespaced as <name>/SKILL.md.",
        inputSchema: {
          markdown: markdownField,
          name: z.string().max(64).optional(),
          description: z.string().max(1024).optional(),
        },
      },
      async ({ markdown, name, description }) => {
        const derived = deriveSkillMeta(markdown);
        const meta = {
          name: name?.trim() || derived.name,
          description: description?.trim() || derived.description,
        };
        const validation = validateSkill({ ...meta });
        if (!validation.valid) {
          return json({ ok: false, validation });
        }
        const bytes = await packageSkill(meta, markdown);
        return json({
          ok: true,
          meta,
          validation,
          skillMd: buildSkillMd(meta, markdown),
          bundleBase64: Buffer.from(bytes).toString("base64"),
          bundleFilename: `${meta.name}.skill`,
        });
      },
    );

    server.registerTool(
      "validate_skill",
      {
        title: "Validate SKILL.md frontmatter",
        description:
          "Validate Agent Skill metadata against the official spec (allowed keys, kebab-case name ≤64 chars, description ≤1024 chars without angle brackets, compatibility ≤500 chars). Pass the frontmatter as a JSON object.",
        inputSchema: {
          frontmatter: z.record(z.string(), z.unknown()),
        },
      },
      async ({ frontmatter }) => json(validateSkill(frontmatter)),
    );

    server.registerTool(
      "markdown_to_html",
      {
        title: "Render Markdown to HTML",
        description:
          "Render GitHub-flavored markdown to HTML using MarkSight's export pipeline. styled=true wraps it in a standalone printable document.",
        inputSchema: {
          markdown: markdownField,
          styled: z.boolean().optional(),
          title: z.string().max(200).optional(),
        },
      },
      async ({ markdown, styled, title }) => {
        const html = await renderMarkdownToHtml(markdown, {
          styled: styled ?? false,
          title,
        });
        return { content: [{ type: "text" as const, text: html }] };
      },
    );

    server.registerTool(
      "document_outline",
      {
        title: "Extract document outline",
        description:
          "Extract the heading outline of a markdown document: level, text, rehype-slug-compatible anchor id, and 1-based source line. Skips headings inside code fences.",
        inputSchema: { markdown: markdownField },
      },
      async ({ markdown }) => json(buildOutline(markdown)),
    );

    server.registerTool(
      "document_metrics",
      {
        title: "Compute document metrics",
        description:
          "Compute word, character, line, heading, link, and image counts for a markdown document.",
        inputSchema: { markdown: markdownField },
      },
      async ({ markdown }) => json(documentMetrics(markdown)),
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
  },
);

export { handler as GET, handler as POST };
