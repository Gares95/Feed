"use server";

import { prisma } from "@/lib/prisma";
import { cutoffDate, retentionWhere } from "@/lib/retention";
import { getSetting, getSettingBool, getSettingNumber, setSetting } from "@/lib/settings";

export interface RetentionPreview {
  count: number;
  oldestDate: Date | null;
  byFeed: { feedTitle: string; count: number }[];
}

export interface RetentionConfig {
  enabled: boolean;
  days: number;
  lastRun: string | null;
}

export async function getRetentionConfig(): Promise<RetentionConfig> {
  const [enabled, days, lastRun] = await Promise.all([
    getSettingBool("retention.enabled", false),
    getSettingNumber("retention.days", 90),
    getSetting("retention.lastRun"),
  ]);
  return { enabled, days, lastRun };
}

export async function setRetentionConfig(
  config: Pick<RetentionConfig, "enabled" | "days">,
): Promise<void> {
  await Promise.all([
    setSetting("retention.enabled", String(config.enabled)),
    setSetting("retention.days", String(config.days)),
  ]);
}

export async function previewRetention(
  days: number,
): Promise<RetentionPreview> {
  const cutoff = cutoffDate(days);

  const candidates = await prisma.article.findMany({
    where: retentionWhere(cutoff),
    select: {
      publishedAt: true,
      feed: { select: { title: true } },
    },
    orderBy: { publishedAt: "asc" },
  });

  const feedCounts = new Map<string, number>();
  for (const a of candidates) {
    const title = a.feed.title;
    feedCounts.set(title, (feedCounts.get(title) ?? 0) + 1);
  }

  return {
    count: candidates.length,
    oldestDate: candidates[0]?.publishedAt ?? null,
    byFeed: Array.from(feedCounts.entries())
      .map(([feedTitle, count]) => ({ feedTitle, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function pruneArticles(days: number): Promise<{ deleted: number }> {
  const cutoff = cutoffDate(days);

  const { count } = await prisma.article.deleteMany({
    where: retentionWhere(cutoff),
  });

  await setSetting("retention.lastRun", new Date().toISOString());

  return { deleted: count };
}

export async function maybeAutoprune(): Promise<number> {
  const config = await getRetentionConfig();
  if (!config.enabled) return 0;

  if (config.lastRun) {
    const elapsed = Date.now() - new Date(config.lastRun).getTime();
    if (elapsed < 23 * 60 * 60 * 1000) return 0;
  }

  const { deleted } = await pruneArticles(config.days);
  return deleted;
}
