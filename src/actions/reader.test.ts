import { describe, it } from "vitest";

describe("extractArticle", () => {
  // Skipped: extractArticle is a thin orchestrator over safeFetch + JSDOM +
  // Readability. A meaningful test needs fixture HTML and a stubbed safeFetch;
  // out of scope for v1's smoke-test pass. The pieces it composes (safeFetch,
  // sanitizeHtml) are tested in src/lib/.
  it.skip("orchestrates safeFetch + Readability + sanitizeHtml", () => {});
});
