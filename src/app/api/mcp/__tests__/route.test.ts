import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimitMemory } from "@/lib/rate-limit";
import { GET, POST } from "../route";

const URL = "https://marksight.test/api/mcp";

/**
 * Smoke tests through the route's real entry points with a NextRequest, the
 * type Next passes in. They cover the guard plus the handler wiring. Note they
 * can't reproduce the Node 24 failure this route once had (re-wrapping the
 * request threw only inside a running Next server), so a change to how the
 * request is rebuilt still deserves a manual check against `next start`.
 */
function rpc(body: unknown) {
  return new NextRequest(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

/** The handler answers a single JSON-RPC call as a one-event SSE stream. */
async function readResult(response: Response) {
  const text = await response.text();
  const data = text
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);
  return JSON.parse(data ?? text);
}

beforeEach(() => {
  resetRateLimitMemory();
});

describe("POST /api/mcp", () => {
  it("answers initialize and identifies itself as marksight", async () => {
    const response = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      })
    );

    expect(response.status).toBe(200);
    const message = await readResult(response);
    expect(message.result.serverInfo.name).toBe("marksight");
  });

  it("lists the tool suite", async () => {
    const response = await POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }));

    expect(response.status).toBe(200);
    const message = await readResult(response);
    const names = message.result.tools.map((tool: { name: string }) => tool.name);
    expect(names).toEqual([
      "create_skill",
      "validate_skill",
      "markdown_to_html",
      "document_outline",
      "document_metrics",
    ]);
  });

  it("runs a tool end to end", async () => {
    const response = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "document_metrics", arguments: { markdown: "# Hi\nthere" } },
      })
    );

    expect(response.status).toBe(200);
    const message = await readResult(response);
    expect(JSON.parse(message.result.content[0].text)).toMatchObject({
      wordCount: 3,
      headingCount: 1,
    });
  });

  it("rejects a body over the size cap before any tool runs", async () => {
    const response = await POST(
      new NextRequest(URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "a".repeat(2_000_001),
      })
    );

    expect(response.status).toBe(413);
  });
});

describe("GET /api/mcp", () => {
  it("is not an SSE endpoint: the server is stateless", async () => {
    const response = await GET(new NextRequest(URL, { headers: { accept: "text/event-stream" } }));
    expect(response.status).toBe(405);
  });
});
