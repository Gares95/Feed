const DAY = 1000 * 60 * 60 * 24;

export interface ReadEvent {
  readAt: Date;
}

export interface DailyCount {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
}

/**
 * Bucket a list of read events into per-day counts over the last `days` days
 * (inclusive of today). Days with zero reads are present with count = 0.
 */
export function dailyReadCounts(
  events: ReadEvent[],
  days: number,
  now: number = Date.now(),
): DailyCount[] {
  const today = startOfDayUtc(now);
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today - i * DAY);
    buckets.set(toIsoDate(d), 0);
  }
  for (const e of events) {
    const key = toIsoDate(new Date(startOfDayUtc(e.readAt.getTime())));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

/**
 * Compute current consecutive-day reading streak ending today (UTC). A streak
 * is broken by any day with zero reads.
 */
export function currentStreak(events: ReadEvent[], now: number = Date.now()): number {
  if (events.length === 0) return 0;
  const days = new Set(
    events.map((e) => toIsoDate(new Date(startOfDayUtc(e.readAt.getTime())))),
  );
  let streak = 0;
  const today = startOfDayUtc(now);
  for (let i = 0; ; i++) {
    const key = toIsoDate(new Date(today - i * DAY));
    if (days.has(key)) {
      streak++;
    } else {
      // Allow streak to count from yesterday if today has no reads yet
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

export function summarize(events: ReadEvent[], now: number = Date.now()) {
  const today = startOfDayUtc(now);
  const week = today - 6 * DAY;
  const month = today - 29 * DAY;
  let last7 = 0;
  let last30 = 0;
  for (const e of events) {
    const t = e.readAt.getTime();
    if (t >= week) last7++;
    if (t >= month) last30++;
  }
  return {
    total: events.length,
    last7,
    last30,
    avgPerDayLast30: Number((last30 / 30).toFixed(2)),
  };
}

function startOfDayUtc(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
