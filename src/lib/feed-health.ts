export interface FeedHealthInput {
  id: string;
  title: string;
  url: string;
  siteUrl: string | null;
  lastFetched: Date | null;
  errorCount: number;
  createdAt: Date;
  articles: { publishedAt: Date }[];
}

export interface FeedHealthMetrics {
  id: string;
  title: string;
  url: string;
  siteUrl: string | null;
  totalArticles: number;
  recentArticles: number; // last 30 days
  articlesPerWeek: number;
  lastArticleAt: Date | null;
  daysSinceLastArticle: number | null;
  lastFetched: Date | null;
  errorCount: number;
  status: "healthy" | "stale" | "error" | "idle";
}

const DAY = 1000 * 60 * 60 * 24;

export function computeFeedHealth(
  feed: FeedHealthInput,
  now: number = Date.now(),
): FeedHealthMetrics {
  const cutoff = now - 30 * DAY;
  const recent = feed.articles.filter((a) => a.publishedAt.getTime() >= cutoff);

  const lastArticle = feed.articles.reduce<Date | null>((acc, a) => {
    if (!acc || a.publishedAt.getTime() > acc.getTime()) return a.publishedAt;
    return acc;
  }, null);

  const daysSinceLastArticle = lastArticle
    ? Math.floor((now - lastArticle.getTime()) / DAY)
    : null;

  // Frequency window: from earliest of (createdAt, oldest article) to now, capped to 30d
  const windowDays = Math.min(
    30,
    Math.max(1, Math.ceil((now - feed.createdAt.getTime()) / DAY)),
  );
  const articlesPerWeek = Number(((recent.length / windowDays) * 7).toFixed(2));

  let status: FeedHealthMetrics["status"];
  if (feed.errorCount >= 3) status = "error";
  else if (daysSinceLastArticle === null) status = "idle";
  else if (daysSinceLastArticle > 30) status = "stale";
  else status = "healthy";

  return {
    id: feed.id,
    title: feed.title,
    url: feed.url,
    siteUrl: feed.siteUrl,
    totalArticles: feed.articles.length,
    recentArticles: recent.length,
    articlesPerWeek,
    lastArticleAt: lastArticle,
    daysSinceLastArticle,
    lastFetched: feed.lastFetched,
    errorCount: feed.errorCount,
    status,
  };
}

export function summarizeHealth(metrics: FeedHealthMetrics[]) {
  return {
    total: metrics.length,
    healthy: metrics.filter((m) => m.status === "healthy").length,
    stale: metrics.filter((m) => m.status === "stale").length,
    error: metrics.filter((m) => m.status === "error").length,
    idle: metrics.filter((m) => m.status === "idle").length,
    totalArticles: metrics.reduce((acc, m) => acc + m.totalArticles, 0),
    recentArticles: metrics.reduce((acc, m) => acc + m.recentArticles, 0),
  };
}
