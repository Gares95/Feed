import { describe, it, expect } from "vitest";
import { computeFeedHealth, summarizeHealth } from "./feed-health";

const NOW = new Date("2026-04-07T12:00:00Z").getTime();
const DAY = 1000 * 60 * 60 * 24;

function articlesAt(daysAgo: number[]) {
  return daysAgo.map((d) => ({ publishedAt: new Date(NOW - d * DAY) }));
}

describe("computeFeedHealth", () => {
  it("marks healthy when articles are recent and no errors", () => {
    const m = computeFeedHealth(
      {
        id: "1",
        title: "Blog",
        url: "https://x/feed",
        siteUrl: null,
        lastFetched: new Date(NOW - DAY),
        errorCount: 0,
        createdAt: new Date(NOW - 60 * DAY),
        articles: articlesAt([1, 5, 10, 20, 40]),
      },
      NOW,
    );
    expect(m.status).toBe("healthy");
    expect(m.totalArticles).toBe(5);
    expect(m.recentArticles).toBe(4);
    expect(m.daysSinceLastArticle).toBe(1);
    expect(m.articlesPerWeek).toBeGreaterThan(0);
  });

  it("marks stale when last article is older than 30 days", () => {
    const m = computeFeedHealth(
      {
        id: "1",
        title: "Old",
        url: "u",
        siteUrl: null,
        lastFetched: new Date(NOW - DAY),
        errorCount: 0,
        createdAt: new Date(NOW - 200 * DAY),
        articles: articlesAt([45, 90]),
      },
      NOW,
    );
    expect(m.status).toBe("stale");
  });

  it("marks error when errorCount >= 3", () => {
    const m = computeFeedHealth(
      {
        id: "1",
        title: "Broken",
        url: "u",
        siteUrl: null,
        lastFetched: null,
        errorCount: 5,
        createdAt: new Date(NOW - 10 * DAY),
        articles: articlesAt([1]),
      },
      NOW,
    );
    expect(m.status).toBe("error");
  });

  it("marks idle when there are no articles", () => {
    const m = computeFeedHealth(
      {
        id: "1",
        title: "Empty",
        url: "u",
        siteUrl: null,
        lastFetched: new Date(NOW),
        errorCount: 0,
        createdAt: new Date(NOW - DAY),
        articles: [],
      },
      NOW,
    );
    expect(m.status).toBe("idle");
    expect(m.daysSinceLastArticle).toBeNull();
  });
});

describe("summarizeHealth", () => {
  it("counts statuses across feeds", () => {
    const metrics = [
      computeFeedHealth(
        {
          id: "a",
          title: "A",
          url: "u",
          siteUrl: null,
          lastFetched: new Date(NOW),
          errorCount: 0,
          createdAt: new Date(NOW - 10 * DAY),
          articles: articlesAt([1]),
        },
        NOW,
      ),
      computeFeedHealth(
        {
          id: "b",
          title: "B",
          url: "u",
          siteUrl: null,
          lastFetched: null,
          errorCount: 4,
          createdAt: new Date(NOW - 10 * DAY),
          articles: [],
        },
        NOW,
      ),
    ];
    const s = summarizeHealth(metrics);
    expect(s.total).toBe(2);
    expect(s.healthy).toBe(1);
    expect(s.error).toBe(1);
  });
});
