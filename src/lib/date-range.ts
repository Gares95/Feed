import { endOfDay, format, isValid, parseISO, startOfDay } from "date-fns";

export type DateRange = "all" | "today" | "week" | "month" | "custom";

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: "All time",
  today: "Today",
  week: "Past week",
  month: "Past month",
  custom: "Custom range",
};

export function isDateRange(value: string | undefined): value is DateRange {
  return (
    value === "all" ||
    value === "today" ||
    value === "week" ||
    value === "month" ||
    value === "custom"
  );
}

export interface DateBounds {
  since?: Date;
  until?: Date;
}

export function dateRangeToBounds(
  range: DateRange,
  from?: Date,
  to?: Date,
): DateBounds {
  if (range === "all") return {};
  const now = new Date();
  if (range === "today") {
    return { since: startOfDay(now) };
  }
  if (range === "week") {
    return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  }
  if (range === "month") {
    return { since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }
  // custom
  let lo = from && isValid(from) ? startOfDay(from) : undefined;
  let hi = to && isValid(to) ? endOfDay(to) : undefined;
  if (lo && hi && lo.getTime() > hi.getTime()) {
    [lo, hi] = [lo, hi].reverse() as [Date, Date];
    // Normalize to full-day bounds after swap
    lo = startOfDay(lo);
    hi = endOfDay(hi);
  }
  if (hi && hi.getTime() > now.getTime()) {
    hi = now;
  }
  return { since: lo, until: hi };
}

export function parseCustomRangeParam(
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from?: Date; to?: Date } {
  const result: { from?: Date; to?: Date } = {};
  if (fromRaw) {
    const d = parseISO(fromRaw);
    if (isValid(d)) result.from = d;
  }
  if (toRaw) {
    const d = parseISO(toRaw);
    if (isValid(d)) result.to = d;
  }
  return result;
}

export function formatCustomRangeParam(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
