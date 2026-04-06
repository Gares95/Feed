"use client";

import { format } from "date-fns";
import { ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ArticleHeaderProps {
  title: string;
  author: string | null;
  publishedAt: Date;
  feedTitle: string;
  link: string;
  isStarred: boolean;
  onToggleStar: () => void;
}

export function ArticleHeader({
  title,
  author,
  publishedAt,
  feedTitle,
  link,
  isStarred,
  onToggleStar,
}: ArticleHeaderProps) {
  return (
    <header className="space-y-3 border-b pb-6">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight">
        {title}
      </h1>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{feedTitle}</span>
        {author && (
          <>
            <span>·</span>
            <span>{author}</span>
          </>
        )}
        <span>·</span>
        <time dateTime={new Date(publishedAt).toISOString()}>
          {format(new Date(publishedAt), "MMM d, yyyy")}
        </time>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={onToggleStar}
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              isStarred ? "fill-star text-star" : "text-muted-foreground"
            )}
          />
          {isStarred ? "Starred" : "Star"}
        </Button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open original
        </a>
      </div>
    </header>
  );
}
