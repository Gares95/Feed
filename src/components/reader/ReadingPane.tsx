"use client";

import { BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArticleHeader } from "./ArticleHeader";

export interface ArticleFull {
  id: string;
  title: string;
  content: string;
  link: string;
  author: string | null;
  publishedAt: Date;
  isStarred: boolean;
  feedTitle: string;
}

interface ReadingPaneProps {
  article: ArticleFull | null;
  onToggleStar: (articleId: string) => void;
}

export function ReadingPane({ article, onToggleStar }: ReadingPaneProps) {
  if (!article) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-8 w-8" />
        <p className="text-sm">Select an article to read</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <article className="mx-auto max-w-2xl px-8 py-8">
        <ArticleHeader
          title={article.title}
          author={article.author}
          publishedAt={article.publishedAt}
          feedTitle={article.feedTitle}
          link={article.link}
          isStarred={article.isStarred}
          onToggleStar={() => onToggleStar(article.id)}
        />
        <div
          className="article-content mt-6"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>
    </ScrollArea>
  );
}
