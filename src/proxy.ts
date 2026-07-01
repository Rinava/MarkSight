import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request nonce + Content-Security-Policy.
 *
 * Runs in Next.js's `proxy` (the renamed `middleware` convention as of v16),
 * which executes on the Node.js runtime.
 *
 * Uses a nonce with `strict-dynamic` so only first-party scripts that carry the
 * nonce (Next.js framework bootstrap, next/script-loaded Google Analytics, the
 * next-themes inline script, and our JSON-LD) can execute, and any scripts they
 * load are trusted transitively. `style-src` keeps `'unsafe-inline'` because
 * CodeMirror, Prism, and Tailwind inject inline styles that cannot be nonced.
 */
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.google-analytics.com https://*.vercel-insights.com https://*.vercel-scripts.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `worker-src 'self' blob:`,
    `upgrade-insecure-requests`,
  ].join("; ");

  // Pass the nonce to the app (read in the root layout via headers()) and echo
  // the CSP on both the request and the response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Run on all paths except static assets and image files.
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
