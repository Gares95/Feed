import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFeed } from "@/lib/feed-parser";
import { discoverFeedUrl } from "@/lib/discover-feed";
import { explainFeedError } from "@/lib/feed-error";
import { isSameOriginRequest } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let feedUrl: URL;
    try {
      feedUrl = new URL(url);
      if (!["http:", "https:"].includes(feedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Discover the actual feed URL (handles homepages with <link rel="alternate">)
    let resolvedUrl: string;
    try {
      resolvedUrl = await discoverFeedUrl(feedUrl.href);
    } catch (err) {
      return NextResponse.json({ error: explainFeedError(err) }, { status: 400 });
    }

    // Check if feed already exists
    const existing = await prisma.feed.findUnique({
      where: { url: resolvedUrl },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Feed already exists", feed: existing },
        { status: 409 }
      );
    }

    // Fetch and parse the feed
    let parsedFeed;
    let articles;
    try {
      const result = await parseFeed(resolvedUrl);
      parsedFeed = result.feed;
      articles = result.articles;
    } catch (err) {
      return NextResponse.json({ error: explainFeedError(err) }, { status: 400 });
    }

    // Store feed and articles in a transaction
    const feed = await prisma.feed.create({
      data: {
        title: parsedFeed.title,
        url: parsedFeed.url,
        siteUrl: parsedFeed.siteUrl,
        description: parsedFeed.description,
        lastFetched: new Date(),
        articles: {
          create: articles.map((article) => ({
            guid: article.guid,
            title: article.title,
            link: article.link,
            content: article.content,
            summary: article.summary,
            author: article.author,
            imageUrl: article.imageUrl,
            publishedAt: article.publishedAt,
          })),
        },
      },
      include: {
        articles: {
          orderBy: { publishedAt: "desc" },
        },
      },
    });

    return NextResponse.json({ feed }, { status: 201 });
  } catch (error) {
    console.error("Failed to add feed:", error);
    return NextResponse.json({ error: explainFeedError(error) }, { status: 500 });
  }
}
