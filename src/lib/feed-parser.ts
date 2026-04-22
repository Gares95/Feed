import Parser from "rss-parser";
import { sanitizeHtml } from "./sanitize";
import { safeFetch } from "./safe-fetch";

type CustomItem = { "content:encoded"?: string };
type FeedItem = Parser.Item & CustomItem;

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: ["content:encoded"],
  },
});

export interface ParsedFeed {
  title: string;
  url: string;
  siteUrl: string | null;
  description: string | null;
}

export interface ParsedArticle {
  guid: string;
  title: string;
  link: string;
  content: string;
  summary: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: Date;
}

function extractImageUrl(item: FeedItem): string | null {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }

  const html = item["content:encoded"] || item.content || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

export async function parseFeed(
  feedUrl: string
): Promise<{ feed: ParsedFeed; articles: ParsedArticle[] }> {
  const fetched = await safeFetch(feedUrl, {
    headers: { "User-Agent": "Feed/1.0 (Local RSS Reader)" },
    accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    maxBytes: 10 * 1024 * 1024,
    timeoutMs: 10_000,
  });
  const result = await parser.parseString(fetched.text());

  const feed: ParsedFeed = {
    title: result.title || feedUrl,
    url: feedUrl,
    siteUrl: result.link || null,
    description: result.description || null,
  };

  const articles: ParsedArticle[] = (result.items || []).map((item) => {
    const rawContent = item["content:encoded"] || item.content || item.contentSnippet || "";
    const content = sanitizeHtml(rawContent);

    const summary =
      item.contentSnippet?.slice(0, 200) || null;

    return {
      guid: item.guid || item.link || item.title || "",
      title: item.title || "Untitled",
      link: item.link || "",
      content,
      summary,
      author: item.creator || null,
      imageUrl: extractImageUrl(item),
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
    };
  });

  return { feed, articles };
}
