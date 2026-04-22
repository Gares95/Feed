/**
 * Build a SQLite FTS5 MATCH query from user input.
 *
 * Strips FTS5 special characters, then wraps each remaining term in quotes
 * with a prefix wildcard. Returns null if the input has no usable terms.
 */
const MAX_FTS_INPUT = 200;

export function buildFtsQuery(input: string): string | null {
  if (input.length > MAX_FTS_INPUT) return null;
  const sanitized = input.replace(/['"*^~(){}[\]]/g, "").trim();
  if (!sanitized) return null;
  return sanitized
    .split(/\s+/)
    .map((term) => `"${term}"*`)
    .join(" ");
}
