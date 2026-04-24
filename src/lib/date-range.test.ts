import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dateRangeToBounds,
  formatCustomRangeParam,
  isDateRange,
  parseCustomRangeParam,
} from "./date-range";

describe("isDateRange", () => {
  it("accepts valid ranges", () => {
    expect(isDateRange("all")).toBe(true);
    expect(isDateRange("today")).toBe(true);
    expect(isDateRange("week")).toBe(true);
    expect(isDateRange("month")).toBe(true);
    expect(isDateRange("custom")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isDateRange(undefined)).toBe(false);
    expect(isDateRange("")).toBe(false);
    expect(isDateRange("bogus")).toBe(false);
    expect(isDateRange("ALL")).toBe(false);
  });
});

describe("dateRangeToBounds", () => {
  // Pin to 2026-04-07 14:30:45 local
  const fixed = new Date(2026, 3, 7, 14, 30, 45);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixed);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty object for 'all'", () => {
    expect(dateRangeToBounds("all")).toEqual({});
  });

  it("returns midnight since for 'today'", () => {
    const { since, until } = dateRangeToBounds("today");
    expect(since!.getFullYear()).toBe(2026);
    expect(since!.getMonth()).toBe(3);
    expect(since!.getDate()).toBe(7);
    expect(since!.getHours()).toBe(0);
    expect(since!.getMinutes()).toBe(0);
    expect(since!.getSeconds()).toBe(0);
    expect(until).toBeUndefined();
  });

  it("returns 7 days ago for 'week'", () => {
    const { since } = dateRangeToBounds("week");
    expect(fixed.getTime() - since!.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("returns 30 days ago for 'month'", () => {
    const { since } = dateRangeToBounds("month");
    expect(fixed.getTime() - since!.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("returns start-of-day and end-of-day for 'custom'", () => {
    const from = new Date(2026, 1, 10, 9, 0, 0);
    const to = new Date(2026, 1, 15, 16, 0, 0);
    const { since, until } = dateRangeToBounds("custom", from, to);
    expect(since!.getHours()).toBe(0);
    expect(since!.getMinutes()).toBe(0);
    expect(until!.getHours()).toBe(23);
    expect(until!.getMinutes()).toBe(59);
    expect(until!.getDate()).toBe(15);
  });

  it("swaps reversed custom bounds", () => {
    const from = new Date(2026, 1, 20);
    const to = new Date(2026, 1, 10);
    const { since, until } = dateRangeToBounds("custom", from, to);
    expect(since!.getTime()).toBeLessThan(until!.getTime());
    expect(since!.getDate()).toBe(10);
    expect(until!.getDate()).toBe(20);
  });

  it("clamps future 'until' to now", () => {
    const from = new Date(2026, 3, 1);
    const to = new Date(2026, 5, 1);
    const { until } = dateRangeToBounds("custom", from, to);
    expect(until!.getTime()).toBeLessThanOrEqual(fixed.getTime());
  });

  it("handles custom with only 'from'", () => {
    const from = new Date(2026, 2, 15);
    const { since, until } = dateRangeToBounds("custom", from, undefined);
    expect(since).toBeDefined();
    expect(until).toBeUndefined();
  });

  it("handles custom with only 'to'", () => {
    const to = new Date(2026, 2, 15);
    const { since, until } = dateRangeToBounds("custom", undefined, to);
    expect(since).toBeUndefined();
    expect(until).toBeDefined();
  });

  it("returns empty bounds for custom with no dates", () => {
    expect(dateRangeToBounds("custom")).toEqual({});
  });
});

describe("parseCustomRangeParam", () => {
  it("parses valid ISO dates", () => {
    const { from, to } = parseCustomRangeParam("2026-03-01", "2026-03-15");
    expect(from).toBeInstanceOf(Date);
    expect(to).toBeInstanceOf(Date);
    expect(from!.getFullYear()).toBe(2026);
    expect(from!.getMonth()).toBe(2);
    expect(from!.getDate()).toBe(1);
  });

  it("returns empty object for both undefined", () => {
    expect(parseCustomRangeParam(undefined, undefined)).toEqual({});
  });

  it("ignores invalid 'from'", () => {
    const { from, to } = parseCustomRangeParam("banana", "2026-03-15");
    expect(from).toBeUndefined();
    expect(to).toBeInstanceOf(Date);
  });

  it("ignores invalid 'to'", () => {
    const { from, to } = parseCustomRangeParam("2026-03-01", "not-a-date");
    expect(from).toBeInstanceOf(Date);
    expect(to).toBeUndefined();
  });

  it("round-trips with formatCustomRangeParam", () => {
    const d = new Date(2026, 4, 20);
    const serialized = formatCustomRangeParam(d);
    expect(serialized).toBe("2026-05-20");
    const { from } = parseCustomRangeParam(serialized, undefined);
    expect(from!.getFullYear()).toBe(2026);
    expect(from!.getMonth()).toBe(4);
    expect(from!.getDate()).toBe(20);
  });
});
