import { describe, expect, it } from "vitest";
import { cutoffDate, retentionWhere } from "./retention";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("cutoffDate", () => {
  it("returns a date N days before the given timestamp", () => {
    const now = new Date("2026-04-17T12:00:00Z").getTime();
    const result = cutoffDate(90, now);
    expect(result.toISOString()).toBe("2026-01-17T12:00:00.000Z");
  });

  it("handles 0 days (cutoff = now)", () => {
    const now = new Date("2026-04-17T12:00:00Z").getTime();
    const result = cutoffDate(0, now);
    expect(result.getTime()).toBe(now);
  });

  it("handles 365 days", () => {
    const now = new Date("2026-04-17T12:00:00Z").getTime();
    const result = cutoffDate(365, now);
    const diff = now - result.getTime();
    expect(diff).toBe(365 * DAY_MS);
  });
});

describe("retentionWhere", () => {
  const cutoff = new Date("2026-01-17T12:00:00Z");
  const filter = retentionWhere(cutoff);

  it("filters articles published before the cutoff", () => {
    expect(filter.publishedAt).toEqual({ lt: cutoff });
  });

  it("only targets read articles", () => {
    expect(filter.isRead).toBe(true);
  });

  it("excludes starred articles", () => {
    expect(filter.isStarred).toBe(false);
  });

  it("excludes articles with highlights", () => {
    expect(filter.highlights).toEqual({ none: {} });
  });
});
