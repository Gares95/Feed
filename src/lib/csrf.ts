/**
 * Same-origin check for state-changing API routes.
 *
 * Next.js Server Actions already validate the Origin header in v15+, but raw
 * API routes (POST /api/feeds, POST /api/opml, POST /api/backup) do not. A
 * cross-site page the user has open can submit a form or fire fetch() at our
 * loopback port; without this check those requests succeed.
 *
 * Accepts the request when Origin (or, as a fallback, Referer) parses to the
 * same host the request was sent to. Rejects when both headers are missing.
 * Simple form POSTs from another origin will either carry Origin or Referer,
 * so a strict "one must match" rule holds up.
 */
export function isSameOriginRequest(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return false;
}
