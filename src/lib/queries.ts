import { Prisma } from "@/generated/prisma";
import { prisma } from "./prisma";
import { buildFtsQuery } from "./fts-query";
import { highlightCodeBlocks } from "./highlight-code";

export async function getFeedsWithCounts() {
  const feeds = await prisma.feed.findMany({
    orderBy: { title: "asc" },
    include: {
      _count: {
        select: { articles: { where: { isRead: false } } },
      },
    },
  });

  return feeds.map((feed) => ({
    id: feed.id,
    title: feed.title,
    favicon: feed.favicon,
    unreadCount: feed._count.articles,
    errorCount: feed.errorCount,
    lastFetched: feed.lastFetched,
    refreshInterval: feed.refreshInterval,
    folderId: feed.folderId,
  }));
}

export async function getFolders() {
  const folders = await prisma.folder.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return folders.map((f) => ({ id: f.id, name: f.name }));
}

export async function getArticles(options?: {
  feedId?: string;
  starredOnly?: boolean;
  since?: Date;
}) {
  const where: Record<string, unknown> = {};
  if (options?.feedId) where.feedId = options.feedId;
  if (options?.starredOnly) where.isStarred = true;
  if (options?.since) where.publishedAt = { gte: options.since };

  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: {
      feed: { select: { title: true } },
    },
  });

  return articles.map((article) => ({
    id: article.id,
    title: article.title,
    feedTitle: article.feed.title,
    publishedAt: article.publishedAt,
    isRead: article.isRead,
    isStarred: article.isStarred,
  }));
}

export async function getArticleById(id: string) {
  const article = await prisma.article.findUnique({
    where: { id },
    include: { feed: { select: { title: true } } },
  });

  if (!article) return null;

  return {
    id: article.id,
    title: article.title,
    content: highlightCodeBlocks(article.content),
    link: article.link,
    author: article.author,
    publishedAt: article.publishedAt,
    isStarred: article.isStarred,
    feedTitle: article.feed.title,
  };
}

export async function searchArticles(query: string) {
  const ftsQuery = buildFtsQuery(query);
  if (!ftsQuery) return [];

  const results = await prisma.$queryRaw<
    {
      id: string;
      title: string;
      feedTitle: string;
      publishedAt: Date;
      isRead: boolean;
      isStarred: boolean;
    }[]
  >(Prisma.sql`
    SELECT
      a.id,
      a.title,
      f.title AS feedTitle,
      a.publishedAt,
      a.isRead,
      a.isStarred
    FROM ArticleFts fts
    JOIN Article a ON a.rowid = fts.rowid
    JOIN Feed f ON f.id = a.feedId
    WHERE ArticleFts MATCH ${ftsQuery}
    ORDER BY rank
    LIMIT 100
  `);

  return results.map((r) => ({
    ...r,
    isRead: Boolean(r.isRead),
    isStarred: Boolean(r.isStarred),
    publishedAt: new Date(r.publishedAt),
  }));
}

export async function getStarredCount() {
  return prisma.article.count({ where: { isStarred: true } });
}

export async function getTotalUnread() {
  return prisma.article.count({ where: { isRead: false } });
}
