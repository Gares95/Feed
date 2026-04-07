export interface StarredArticleExport {
  id: string;
  title: string;
  link: string;
  author: string | null;
  feedTitle: string;
  publishedAt: Date;
  content: string;
  summary: string | null;
}

export function starredToJson(articles: StarredArticleExport[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: articles.length,
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        link: a.link,
        author: a.author,
        feed: a.feedTitle,
        publishedAt: a.publishedAt.toISOString(),
        summary: a.summary,
        content: a.content,
      })),
    },
    null,
    2,
  );
}

export function starredToMarkdown(articles: StarredArticleExport[]): string {
  const header = `# Starred Articles\n\n_Exported ${new Date().toISOString()} — ${articles.length} article${articles.length === 1 ? "" : "s"}_\n\n---\n\n`;

  if (articles.length === 0) {
    return header + "_No starred articles._\n";
  }

  const body = articles
    .map((a) => {
      const parts: string[] = [];
      parts.push(`## ${a.title}`);
      const meta: string[] = [];
      meta.push(`**Source:** ${a.feedTitle}`);
      if (a.author) meta.push(`**Author:** ${a.author}`);
      meta.push(`**Published:** ${a.publishedAt.toISOString()}`);
      meta.push(`**Link:** <${a.link}>`);
      parts.push(meta.join("  \n"));
      if (a.summary) {
        parts.push(`> ${a.summary.replace(/\n/g, "\n> ")}`);
      }
      return parts.join("\n\n");
    })
    .join("\n\n---\n\n");

  return header + body + "\n";
}
