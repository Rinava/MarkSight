import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkMemoryRateLimit,
  checkRateLimit,
  clientIdFromRequest,
  rateLimitResponse,
  resetRateLimitMemory,
} from "../rate-limit";

const rule = { name: "test", limit: 3, windowMs: 60_000 };

beforeEach(() => {
  resetRateLimitMemory();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("checkMemoryRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const now = 1_000_000;
    expect(checkMemoryRateLimit(rule, "a", now)).toMatchObject({ ok: true, remaining: 2 });
    expect(checkMemoryRateLimit(rule, "a", now)).toMatchObject({ ok: true, remaining: 1 });
    expect(checkMemoryRateLimit(rule, "a", now)).toMatchObject({ ok: true, remaining: 0 });
    expect(checkMemoryRateLimit(rule, "a", now)).toMatchObject({ ok: false, remaining: 0 });
  });

  it("tracks clients and rule names separately", () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) checkMemoryRateLimit(rule, "a", now);
    expect(checkMemoryRateLimit(rule, "b", now).ok).toBe(true);
    expect(checkMemoryRateLimit({ ...rule, name: "other" }, "a", now).ok).toBe(true);
  });

  it("opens a fresh window once the old one expires", () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) checkMemoryRateLimit(rule, "a", now);
    expect(checkMemoryRateLimit(rule, "a", now + 59_999).ok).toBe(false);
    expect(checkMemoryRateLimit(rule, "a", now + 60_000)).toMatchObject({ ok: true, remaining: 2 });
  });

  it("reports how long to wait, rounded up to whole seconds", () => {
    const now = 1_000_000;
    checkMemoryRateLimit(rule, "a", now);
    expect(checkMemoryRateLimit(rule, "a", now + 30_500).retryAfterSeconds).toBe(30);
    expect(checkMemoryRateLimit(rule, "a", now + 59_900).retryAfterSeconds).toBe(1);
  });
});

describe("checkRateLimit", () => {
  it("uses the in-memory window when no shared store is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (let i = 0; i < 3; i++) expect((await checkRateLimit(rule, "a")).ok).toBe(true);
    expect((await checkRateLimit(rule, "a")).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("counts in Upstash when it is configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret");
    const fetchMock = vi.fn(async () =>
      Response.json([{ result: 4 }, { result: 0 }, { result: 12_000 }])
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(rule, "1.2.3.4");
    expect(result).toMatchObject({ ok: false, remaining: 0, retryAfterSeconds: 12 });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://example.upstash.io/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(JSON.parse(init.body as string)[0]).toEqual([
      "INCR",
      "marksight:ratelimit:test:1.2.3.4",
    ]);
  });

  it("falls back to memory when the shared store fails", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 }))
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    for (let i = 0; i < 3; i++) expect((await checkRateLimit(rule, "a")).ok).toBe(true);
    expect((await checkRateLimit(rule, "a")).ok).toBe(false);
  });
});

describe("clientIdFromRequest", () => {
  it("takes the first x-forwarded-for hop", () => {
    const request = new Request("https://x.test", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientIdFromRequest(request)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    expect(
      clientIdFromRequest(
        new Request("https://x.test", { headers: { "x-real-ip": "198.51.100.2" } })
      )
    ).toBe("198.51.100.2");
    expect(clientIdFromRequest(new Request("https://x.test"))).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("returns a 429 with Retry-After", async () => {
    const response = rateLimitResponse({
      ok: false,
      limit: 3,
      remaining: 0,
      retryAfterSeconds: 42,
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(await response.json()).toHaveProperty("error");
  });
});
