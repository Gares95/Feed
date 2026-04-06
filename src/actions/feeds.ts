"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseFeed } from "@/lib/feed-parser";

export async function refreshFeed(feedId: string) {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed) throw new Error("Feed not found");

  try {
    const { articles } = await parseFeed(feed.url);

    for (const article of articles) {
      await prisma.article.upsert({
        where: {
          feedId_guid: { feedId: feed.id, guid: article.guid },
        },
        create: {
          feedId: feed.id,
          guid: article.guid,
          title: article.title,
          link: article.link,
          content: article.content,
          summary: article.summary,
          author: article.author,
          imageUrl: article.imageUrl,
          publishedAt: article.publishedAt,
        },
        update: {
          title: article.title,
          content: article.content,
          summary: article.summary,
          author: article.author,
          imageUrl: article.imageUrl,
        },
      });
    }

    await prisma.feed.update({
      where: { id: feed.id },
      data: { lastFetched: new Date(), errorCount: 0 },
    });
  } catch (error) {
    await prisma.feed.update({
      where: { id: feed.id },
      data: { errorCount: { increment: 1 } },
    });
    throw error;
  }

  revalidatePath("/");
}

export async function refreshAllFeeds() {
  const feeds = await prisma.feed.findMany();
  const results = await Promise.allSettled(
    feeds.map((feed) => refreshFeed(feed.id))
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.error(`${failed}/${feeds.length} feeds failed to refresh`);
  }

  revalidatePath("/");
}

export async function deleteFeed(feedId: string) {
  await prisma.feed.delete({ where: { id: feedId } });
  revalidatePath("/");
}
