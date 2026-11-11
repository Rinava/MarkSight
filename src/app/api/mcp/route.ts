import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { deriveSkillMeta } from "@/lib/skill/derive";
import { buildSkillMd } from "@/lib/skill/build";
import { validateSkill } from "@/lib/skill/validate";
import { packageSkill } from "@/lib/skill/package";
import { renderMarkdownToHtml } from "@/lib/markdown/to-html";
import { buildOutline } from "@/lib/markdown/outline";
import { documentMetrics } from "@/lib/markdown/metrics";
import { checkRateLimit, clientIdFromRequest, rateLimitResponse } from "@/lib/rate-limit";

/**
 * MarkSight MCP server (streamable HTTP at /api/mcp).
 *
 * Stateless tool suite: every tool is a thin typed wrapper over the same
 * `src/lib` cores the editor uses, so MCP output is identical to in-app
 * output. Add with:  claude mcp add --transport http marksight <url>/api/mcp
 */

// mcp-handler 2.x removed its `basePath`/`maxDuration` options and the SSE transport,
// so the function budget is a Next.js route-segment export now and the mount path is
// simply where this file lives (retiring the former `[transport]` dynamic segment).
export const maxDuration = 60;

const MAX_MARKDOWN_BYTES = 500_000;

// The endpoint is public on purpose (remote MCP clients have to reach it), so
// the abuse guard is throttling and size caps, not auth.
const RATE_LIMIT = { name: "mcp", limit: 60, windowMs: 60_000 };

// Room for the largest allowed markdown field once JSON-escaped, plus the
// JSON-RPC envelope. Anything bigger is rejected before a tool runs.
const MAX_BODY_BYTES = 2_000_000;

const markdownField = z
  .string()
  .min(1, "markdown must not be empty")
  .max(MAX_MARKDOWN_BYTES, "markdown too large");

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

// What clients show as the server's identity after connecting.
const SERVER_OPTIONS = { serverInfo: { name: "marksight", version: "1.0.0" } };

const handler = createMcpHandler((server) => {
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
    }
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
    async ({ frontmatter }) => json(validateSkill(frontmatter))
  );

  server.registerTool(
    "markdown_to_html",
    {
      title: "Render Markdown to HTML",
      description:
        "Render GitHub-flavored markdown to HTML using MarkSight's export pipeline. The output is sanitized: raw HTML embedded in the markdown (script tags, event handlers, javascript: links) is stripped, not passed through. styled=true wraps it in a standalone printable document.",
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
    }
  );

  server.registerTool(
    "document_outline",
    {
      title: "Extract document outline",
      description:
        "Extract the heading outline of a markdown document: level, text, rehype-slug-compatible anchor id, and 1-based source line. Skips headings inside code fences.",
      inputSchema: { markdown: markdownField },
    },
    async ({ markdown }) => json(buildOutline(markdown))
  );

  server.registerTool(
    "document_metrics",
    {
      title: "Compute document metrics",
      description:
        "Compute word, character, line, heading, link, and image counts for a markdown document.",
      inputSchema: { markdown: markdownField },
    },
    async ({ markdown }) => json(documentMetrics(markdown))
  );
}, SERVER_OPTIONS);

function payloadTooLarge(): Response {
  return Response.json(
    { error: `Request body too large (limit ${MAX_BODY_BYTES} bytes)` },
    { status: 413 }
  );
}

async function guarded(request: Request): Promise<Response> {
  const limit = await checkRateLimit(RATE_LIMIT, clientIdFromRequest(request));
  if (!limit.ok) return rateLimitResponse(limit);

  if (request.method !== "POST") return handler(request);

  // Cheap rejection first, then measure what actually arrived: Content-Length
  // can be missing (chunked) or simply wrong.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return payloadTooLarge();
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_BODY_BYTES) return payloadTooLarge();

  // Build the replacement from plain parts instead of `new Request(request, …)`.
  // Next hands us a NextRequest, and on Node 24 cloning one through the Request
  // constructor throws ("Cannot read private member #state"), which turned
  // every POST into a bare 500 in production.
  return handler(
    new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body,
      signal: request.signal,
    })
  );
}

export { guarded as GET, guarded as POST };
