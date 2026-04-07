import { describe, it, expect } from "vitest";
import {
  starredToJson,
  starredToMarkdown,
  type StarredArticleExport,
} from "./export-starred";

const sample: StarredArticleExport[] = [
  {
    id: "a1",
    title: "Hello World",
    link: "https://example.com/post",
    author: "Alice",
    feedTitle: "Example Blog",
    publishedAt: new Date("2026-01-15T08:00:00Z"),
    content: "<p>body</p>",
    summary: "A short summary.",
  },
];

describe("starredToJson", () => {
  it("produces valid JSON with article fields", () => {
    const out = starredToJson(sample);
    const parsed = JSON.parse(out);
    expect(parsed.count).toBe(1);
    expect(parsed.articles[0]).toMatchObject({
      id: "a1",
      title: "Hello World",
      link: "https://example.com/post",
      feed: "Example Blog",
      author: "Alice",
    });
    expect(parsed.articles[0].publishedAt).toBe("2026-01-15T08:00:00.000Z");
  });

  it("handles empty list", () => {
    const parsed = JSON.parse(starredToJson([]));
    expect(parsed.count).toBe(0);
    expect(parsed.articles).toEqual([]);
  });
});

describe("starredToMarkdown", () => {
  it("includes title, source, and link", () => {
    const md = starredToMarkdown(sample);
    expect(md).toContain("# Starred Articles");
    expect(md).toContain("## Hello World");
    expect(md).toContain("**Source:** Example Blog");
    expect(md).toContain("**Author:** Alice");
    expect(md).toContain("<https://example.com/post>");
    expect(md).toContain("> A short summary.");
  });

  it("renders an empty-state message when there are no articles", () => {
    const md = starredToMarkdown([]);
    expect(md).toContain("_No starred articles._");
  });
});
