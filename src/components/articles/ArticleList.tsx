"use client";

import { FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArticleRow } from "./ArticleRow";

export interface ArticleWithFeed {
  id: string;
  title: string;
  feedTitle: string;
  publishedAt: Date;
  isRead: boolean;
  isStarred: boolean;
}

interface ArticleListProps {
  articles: ArticleWithFeed[];
  selectedArticleId: string | null;
  onSelectArticle: (articleId: string) => void;
  heading: string;
}

export function ArticleList({
  articles,
  selectedArticleId,
  onSelectArticle,
  heading,
}: ArticleListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center border-b px-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          {heading}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {articles.length}
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <FileText className="h-8 w-8" />
          <p className="text-sm">No articles</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {articles.map((article) => (
            <ArticleRow
              key={article.id}
              id={article.id}
              title={article.title}
              feedTitle={article.feedTitle}
              publishedAt={article.publishedAt}
              isRead={article.isRead}
              isStarred={article.isStarred}
              isSelected={selectedArticleId === article.id}
              onSelect={onSelectArticle}
            />
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
