import { prisma } from "./prisma";

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
  }));
}

export async function getArticles(options?: {
  feedId?: string;
  starredOnly?: boolean;
}) {
  const where: Record<string, unknown> = {};
  if (options?.feedId) where.feedId = options.feedId;
  if (options?.starredOnly) where.isStarred = true;

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
    content: article.content,
    link: article.link,
    author: article.author,
    publishedAt: article.publishedAt,
    isStarred: article.isStarred,
    feedTitle: article.feed.title,
  };
}

export async function getStarredCount() {
  return prisma.article.count({ where: { isStarred: true } });
}

export async function getTotalUnread() {
  return prisma.article.count({ where: { isRead: false } });
}
