const WORDS_PER_MINUTE = 200;
const MIN_WORDS_FOR_ESTIMATE = 150;

const TRAILING_TRUNCATION_PATTERNS: RegExp[] = [
  /…\s*$/,
  /\.{3,}\s*$/,
  /\[\s*(?:\.{3}|…)\s*\]\s*$/,
  /\b(?:read more|continue reading|read the (?:full|rest|story)|view the full article|read the original)\b[^.!?]*[.!?]?\s*$/i,
];

const TRAILING_LINK_PATTERN =
  /<a\b[^>]*>\s*(?:read more|continue reading|read the (?:full|rest|story)|view the full article|read the original)[^<]*<\/a>\s*(?:<\/[a-z]+>\s*)*$/i;

/**
 * Estimate reading time in minutes from article HTML.
 * Returns null when the content looks truncated (RSS excerpts with
 * "Read more" links) or is too short to estimate confidently — the
 * caller should hide the badge rather than show a misleading "1 min read".
 */
export function estimateReadingTime(html: string): number | null {
  if (!html) return null;

  const trimmedHtml = html.trim();
  if (TRAILING_LINK_PATTERN.test(trimmedHtml)) return null;

  const text = trimmedHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (TRAILING_TRUNCATION_PATTERNS.some((re) => re.test(text))) return null;

  const wordCount = text.split(" ").filter(Boolean).length;
  if (wordCount < MIN_WORDS_FOR_ESTIMATE) return null;

  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
