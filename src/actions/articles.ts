"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getArticles,
  searchArticles as searchArticlesQuery,
  type ArticlePage,
} from "@/lib/queries";
import {
  dateRangeToBounds,
  parseCustomRangeParam,
  type DateRange,
} from "@/lib/date-range";

export async function markRead(articleId: string) {
  await prisma.article.update({
    where: { id: articleId },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/");
}

export async function markUnread(articleId: string) {
  await prisma.article.update({
    where: { id: articleId },
    data: { isRead: false, readAt: null },
  });
  revalidatePath("/");
}

export async function toggleStar(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { isStarred: true },
  });
  if (!article) throw new Error("Article not found");

  await prisma.article.update({
    where: { id: articleId },
    data: { isStarred: !article.isStarred },
  });
  revalidatePath("/");
}

export async function searchArticles(query: string) {
  return searchArticlesQuery(query);
}

export async function markAllRead(feedId?: string) {
  await prisma.article.updateMany({
    where: feedId ? { feedId, isRead: false } : { isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/");
}

export async function loadMoreArticles(params: {
  feedId?: string | null;
  starred?: boolean;
  range?: DateRange;
  from?: string;
  to?: string;
  cursor: string;
}): Promise<ArticlePage> {
  const { from, to } = parseCustomRangeParam(params.from, params.to);
  const { since, until } = dateRangeToBounds(params.range ?? "all", from, to);
  return getArticles({
    feedId: params.feedId ?? undefined,
    starredOnly: params.starred ?? false,
    since,
    until,
    cursor: params.cursor,
  });
}
