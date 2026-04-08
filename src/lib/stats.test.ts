import { describe, it, expect } from "vitest";
import { currentStreak, dailyReadCounts, summarize } from "./stats";

const NOW = new Date("2026-04-08T15:00:00Z").getTime();
const DAY = 1000 * 60 * 60 * 24;

function eventsOn(daysAgo: number[]) {
  return daysAgo.map((d) => ({ readAt: new Date(NOW - d * DAY) }));
}

describe("dailyReadCounts", () => {
  it("buckets events into per-day counts including empty days", () => {
    const out = dailyReadCounts(eventsOn([0, 0, 1, 3]), 7, NOW);
    expect(out).toHaveLength(7);
    expect(out[6].count).toBe(2); // today
    expect(out[5].count).toBe(1); // yesterday
    expect(out[4].count).toBe(0);
    expect(out[3].count).toBe(1); // 3 days ago
  });

  it("ignores events outside the window", () => {
    const out = dailyReadCounts(eventsOn([0, 100]), 7, NOW);
    const total = out.reduce((acc, d) => acc + d.count, 0);
    expect(total).toBe(1);
  });
});

describe("currentStreak", () => {
  it("counts consecutive days including today", () => {
    expect(currentStreak(eventsOn([0, 1, 2, 3]), NOW)).toBe(4);
  });

  it("counts from yesterday when today has no reads yet", () => {
    expect(currentStreak(eventsOn([1, 2, 3]), NOW)).toBe(3);
  });

  it("breaks at first gap", () => {
    expect(currentStreak(eventsOn([0, 1, 3, 4]), NOW)).toBe(2);
  });

  it("returns 0 for no events", () => {
    expect(currentStreak([], NOW)).toBe(0);
  });
});

describe("summarize", () => {
  it("computes 7d, 30d totals and averages", () => {
    const s = summarize(eventsOn([0, 1, 5, 10, 40]), NOW);
    expect(s.total).toBe(5);
    expect(s.last7).toBe(3);
    expect(s.last30).toBe(4);
    expect(s.avgPerDayLast30).toBeCloseTo(4 / 30, 2);
  });
});
