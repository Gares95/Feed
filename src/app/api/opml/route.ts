import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOpml, parseOpml } from "@/lib/opml";
import { parseFeed } from "@/lib/feed-parser";

export async function GET() {
  const feeds = await prisma.feed.findMany({
    orderBy: { title: "asc" },
    select: { title: true, url: true, siteUrl: true },
  });

  const opml = generateOpml(feeds);

  return new NextResponse(opml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="feed-subscriptions.opml"',
    },
  });
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No OPML file provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `OPML file exceeds ${MAX_UPLOAD_BYTES} bytes` },
        { status: 413 },
      );
    }

    const xml = await file.text();
    const outlines = parseOpml(xml);

    if (outlines.length === 0) {
      return NextResponse.json(
        { error: "No feeds found in OPML file" },
        { status: 400 },
      );
    }

    const results = { added: 0, skipped: 0, failed: 0, total: outlines.length };

    for (const outline of outlines) {
      try {
        const existing = await prisma.feed.findUnique({
          where: { url: outline.xmlUrl },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const { feed: parsedFeed, articles } = await parseFeed(outline.xmlUrl);

        await prisma.feed.create({
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
        });

        results.added++;
      } catch (error) {
        console.error(`Failed to import feed ${outline.xmlUrl}:`, error);
        results.failed++;
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("OPML import failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to import OPML";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
