import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  starredToJson,
  starredToMarkdown,
  type StarredArticleExport,
} from "@/lib/export-starred";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "md";

  const rows = await prisma.article.findMany({
    where: { isStarred: true },
    orderBy: { publishedAt: "desc" },
    include: { feed: { select: { title: true } } },
  });

  const articles: StarredArticleExport[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    link: a.link,
    author: a.author,
    feedTitle: a.feed.title,
    publishedAt: a.publishedAt,
    content: a.content,
    summary: a.summary,
  }));

  if (format === "json") {
    return new NextResponse(starredToJson(articles), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="starred-articles.json"',
      },
    });
  }

  return new NextResponse(starredToMarkdown(articles), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="starred-articles.md"',
    },
  });
}
