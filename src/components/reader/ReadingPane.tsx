"use client";

import { BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArticleHeader } from "./ArticleHeader";
import {
  TypographySettings,
  useTypography,
} from "./TypographySettings";

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
  const { config, update } = useTypography();

  if (!article) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-8 w-8" />
        <p className="text-sm">Select an article to read</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center justify-end border-b px-3">
        <TypographySettings config={config} onUpdate={update} />
      </div>
      <ScrollArea className="flex-1">
        <article
          className="mx-auto px-8 py-8"
          style={{ maxWidth: `${config.maxWidth}px` }}
        >
          <ArticleHeader
            title={article.title}
            author={article.author}
            publishedAt={article.publishedAt}
            feedTitle={article.feedTitle}
            link={article.link}
            content={article.content}
            isStarred={article.isStarred}
            onToggleStar={() => onToggleStar(article.id)}
          />
          <div
            className="article-content mt-6"
            style={{
              fontSize: `${config.fontSize}px`,
              lineHeight: config.lineHeight,
            }}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>
      </ScrollArea>
    </div>
  );
}
