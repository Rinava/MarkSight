import { NextResponse } from "next/server";
import { generateText, APICallError, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { validateSkill } from "@/lib/skill/validate";
import { deriveSkillMeta } from "@/lib/skill/derive";

/**
 * AI refinement for skill metadata. Two provider paths, checked in order:
 *
 * 1. `GOOGLE_GENERATIVE_AI_API_KEY` → direct Gemini (free AI Studio tier;
 *    `SKILL_AI_MODEL` is a bare Gemini id, default `gemini-3-flash`).
 * 2. `AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN` → Vercel AI Gateway (plain
 *    "provider/model" slug, default `anthropic/claude-haiku-4.5`).
 *
 * Feature-gated: with neither configured the route reports
 * `{ enabled: false }` and the UI hides the button — the offline creator is
 * never affected. AI output is re-validated with the shared `validateSkill`;
 * invalid output is repaired or rejected, never passed through.
 */

const MAX_CONTENT_BYTES = 100_000;

function resolveModel(): { model: LanguageModel; viaGateway: boolean } | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      model: google(process.env.SKILL_AI_MODEL || "gemini-flash-latest"),
      viaGateway: false,
    };
  }
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    return {
      model: process.env.SKILL_AI_MODEL || "anthropic/claude-haiku-4.5",
      viaGateway: true,
    };
  }
  return null;
}

function aiEnabled(): boolean {
  return resolveModel() !== null;
}

export async function GET() {
  return NextResponse.json({ enabled: aiEnabled() });
}

export async function POST(request: Request) {
  const resolved = resolveModel();
  if (!resolved) {
    return NextResponse.json({ enabled: false });
  }

  let content: unknown;
  try {
    ({ content } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "content must be a non-empty string" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT_BYTES) {
    return NextResponse.json({ error: "Document too large" }, { status: 413 });
  }

  const current = deriveSkillMeta(content);

  try {
    const { text } = await generateText({
      model: resolved.model,
      prompt: [
        "You are refining metadata for an Agent Skill (a SKILL.md Claude uses).",
        "Given the document below, produce improved skill metadata.",
        "",
        "Rules:",
        "- name: kebab-case, lowercase letters/digits/hyphens only, no leading/trailing/double hyphens, max 64 chars.",
        '- description: max 1024 chars, MUST NOT contain "<" or ">", and MUST state what the skill does AND when to use it (include trigger phrasing like "Use this skill when/whenever ...").',
        "- Keep the intent of the current metadata; sharpen, do not invent capabilities absent from the document.",
        "",
        `Current name: ${current.name}`,
        `Current description: ${current.description}`,
        "",
        "Document:",
        "---",
        content.slice(0, 20_000),
        "---",
        "",
        'Reply with ONLY a JSON object, no code fences: {"name": "...", "description": "..."}',
      ].join("\n"),
      ...(resolved.viaGateway
        ? { providerOptions: { gateway: { tags: ["feature:skill-creator"] } } }
        : {}),
    });

    const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let parsed: { name?: unknown; description?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned unparseable output" }, { status: 422 });
    }

    const name =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : current.name;
    const description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim().replace(/[<>]/g, "").slice(0, 1024)
        : current.description;

    const validation = validateSkill({ name, description });
    if (!validation.valid) {
      // Repair: fall back to the already-valid derived metadata per field.
      const repaired = {
        name: validateSkill({ name, description: "x" }).valid ? name : current.name,
        description: validateSkill({ name: "x", description }).valid
          ? description
          : current.description,
      };
      const recheck = validateSkill(repaired);
      if (!recheck.valid) {
        return NextResponse.json(
          { error: "AI output failed validation", details: validation.errors },
          { status: 422 },
        );
      }
      return NextResponse.json({ enabled: true, ...repaired, repaired: true });
    }

    return NextResponse.json({ enabled: true, name, description });
  } catch (error) {
    console.error("skill/improve failed:", error);
    // Gateway errors may wrap APICallError (e.g. GatewayInternalServerError
    // with the APICallError as `cause`) — look at both layers.
    const apiError = APICallError.isInstance(error)
      ? error
      : error instanceof Error && APICallError.isInstance(error.cause)
        ? error.cause
        : null;
    const status =
      apiError?.statusCode ??
      (typeof (error as { statusCode?: unknown })?.statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined);

    const message =
      status === 429
        ? "AI rate limit reached — try again shortly"
        : status === 402
          ? "AI budget exhausted"
          : status === 403
            ? "AI Gateway not activated for this team yet — add a card in Vercel's AI settings to unlock the free credits"
            : "AI provider error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
