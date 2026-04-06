"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markRead(articleId: string) {
  await prisma.article.update({
    where: { id: articleId },
    data: { isRead: true },
  });
  revalidatePath("/");
}

export async function markUnread(articleId: string) {
  await prisma.article.update({
    where: { id: articleId },
    data: { isRead: false },
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

export async function markAllRead(feedId?: string) {
  await prisma.article.updateMany({
    where: feedId ? { feedId, isRead: false } : { isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/");
}
