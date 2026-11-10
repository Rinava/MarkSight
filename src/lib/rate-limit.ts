/**
 * Small per-client rate limiter shared by the public API routes (the MCP
 * endpoint and the AI "improve" route).
 *
 * Two backends:
 *  - Upstash Redis over its REST API when `UPSTASH_REDIS_REST_URL` and
 *    `UPSTASH_REDIS_REST_TOKEN` are set. That's a shared store, so the limit
 *    holds across serverless instances and regions.
 *  - An in-memory fixed window otherwise. It only sees the traffic of one
 *    instance, so treat it as a speed bump, not a guarantee.
 *
 * If the shared store errors out we fall back to memory instead of failing the
 * request: a limiter outage shouldn't take the endpoint down with it.
 */

export interface RateLimitRule {
  /** Namespace so routes don't share counters, e.g. "mcp". */
  name: string;
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets (for the Retry-After header). */
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Hard cap on tracked clients so a flood of spoofed IPs can't grow memory. */
const MAX_TRACKED_CLIENTS = 10_000;

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function toResult(rule: RateLimitRule, count: number, resetInMs: number): RateLimitResult {
  return {
    ok: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil(resetInMs / 1000)),
  };
}

export function checkMemoryRateLimit(
  rule: RateLimitRule,
  clientId: string,
  now: number = Date.now()
): RateLimitResult {
  const key = `${rule.name}:${clientId}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_CLIENTS) pruneExpired(now);
    // Still full of live windows: drop the oldest entry (Map keeps insertion order).
    if (buckets.size >= MAX_TRACKED_CLIENTS) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    bucket = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  return toResult(rule, bucket.count, bucket.resetAt - now);
}

async function checkUpstashRateLimit(
  rule: RateLimitRule,
  clientId: string,
  url: string,
  token: string
): Promise<RateLimitResult> {
  const key = `marksight:ratelimit:${rule.name}:${clientId}`;
  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      // NX: only start the clock on the first hit of a window.
      ["PEXPIRE", key, rule.windowMs, "NX"],
      ["PTTL", key],
    ]),
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);

  const [incr, , pttl] = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  if (typeof incr?.result !== "number") throw new Error(incr?.error ?? "Unexpected Upstash reply");

  const ttl = typeof pttl?.result === "number" && pttl.result > 0 ? pttl.result : rule.windowMs;
  return toResult(rule, incr.result, ttl);
}

export async function checkRateLimit(
  rule: RateLimitRule,
  clientId: string
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      return await checkUpstashRateLimit(rule, clientId, url, token);
    } catch (error) {
      console.error("rate-limit: shared store unavailable, using memory:", error);
    }
  }
  return checkMemoryRateLimit(rule, clientId);
}

/**
 * Best available client identifier. Hosting platforms (Vercel included) put
 * the real client address first in `x-forwarded-for`; without a proxy in front
 * the header is whatever the caller sent, which is one more reason the limiter
 * is a speed bump when self-hosted bare.
 */
export function clientIdFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** A ready-made 429 with Retry-After for a failed check. */
export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/** Test hook: forget every in-memory window. */
export function resetRateLimitMemory() {
  buckets.clear();
}
