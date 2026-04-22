import { safeFetch, SafeFetchError } from "@/lib/safe-fetch";

const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const FEED_TYPES = [
  "application/rss+xml",
  "application/atom+xml",
  "application/feed+json",
  "application/json",
];

/**
 * Parse an HTML document and return the first feed URL advertised by a
 * <link rel="alternate" type="..."> tag, resolved against `baseUrl`. Returns
 * null if none is found. Pure helper, no network.
 */
export function findFeedLinkInHtml(html: string, baseUrl: string): string | null {
  // Look at <link ...> tags only — cheap regex is fine for this.
  const linkRegex = /<link\b[^>]*>/gi;
  for (const match of html.matchAll(linkRegex)) {
    const tag = match[0];
    const rel = attr(tag, "rel");
    if (!rel || !/\balternate\b/i.test(rel)) continue;
    const type = attr(tag, "type");
    if (!type || !FEED_TYPES.includes(type.toLowerCase())) continue;
    const href = attr(tag, "href");
    if (!href) continue;
    try {
      return new URL(href, baseUrl).href;
    } catch {
      continue;
    }
  }
  return null;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

/**
 * Given a URL the user pasted, return the actual feed URL to parse. If the
 * URL already points at a feed (returns XML/JSON content type), it's used
 * as-is. Otherwise, fetches the HTML and looks for <link rel="alternate">.
 * Throws with a clear message if discovery fails.
 */
export async function discoverFeedUrl(input: string): Promise<string> {
  let result;
  try {
    result = await safeFetch(input, {
      headers: { "User-Agent": BROWSER_UA },
      accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.5",
      maxBytes: 2 * 1024 * 1024,
      timeoutMs: 10_000,
    });
  } catch (err) {
    if (err instanceof SafeFetchError && err.code === "bad_status" && err.status) {
      const wrapped = new Error(`Status code ${err.status}`);
      (wrapped as Error & { status?: number }).status = err.status;
      throw wrapped;
    }
    throw err;
  }

  const contentType = (result.headers.get("content-type") || "").toLowerCase();

  // Already a feed: return the (possibly redirected) final URL.
  if (
    contentType.includes("xml") ||
    contentType.includes("rss") ||
    contentType.includes("atom") ||
    contentType.includes("application/json")
  ) {
    return result.url || input;
  }

  // HTML: scan for a feed link.
  if (contentType.includes("html")) {
    const found = findFeedLinkInHtml(result.text(), result.url || input);
    if (found) return found;
    throw new Error(
      "This URL doesn't return a feed and no <link rel=\"alternate\"> was found on the page. Try the site's RSS/Atom URL directly.",
    );
  }

  // Unknown content type — let the parser try the URL itself.
  return result.url || input;
}
