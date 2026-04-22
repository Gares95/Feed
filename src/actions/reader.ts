"use server";

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import { safeFetch } from "@/lib/safe-fetch";

export async function extractArticle(
  articleId: string,
): Promise<{ content: string; title: string | null; byline: string | null }> {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { link: true },
  });
  if (!article?.link) throw new Error("Article has no link to extract from");

  const result = await safeFetch(article.link, {
    accept: "text/html,application/xhtml+xml",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Feed/1.0; Local RSS Reader)",
    },
    maxBytes: 5 * 1024 * 1024,
    timeoutMs: 15_000,
  });
  const html = result.text();

  const dom = new JSDOM(html, { url: article.link });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();
  if (!parsed?.content) throw new Error("Could not extract article content");

  return {
    content: sanitizeHtml(parsed.content),
    title: parsed.title ?? null,
    byline: parsed.byline ?? null,
  };
}
