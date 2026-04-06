"use client";

import { formatDistanceToNow } from "date-fns";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArticleRowProps {
  id: string;
  title: string;
  feedTitle: string;
  publishedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isSelected: boolean;
  onSelect: (articleId: string) => void;
}

export function ArticleRow({
  id,
  title,
  feedTitle,
  publishedAt,
  isRead,
  isStarred,
  isSelected,
  onSelect,
}: ArticleRowProps) {
  const timeAgo = formatDistanceToNow(new Date(publishedAt), {
    addSuffix: true,
  });

  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left transition-colors",
        isSelected
          ? "bg-accent"
          : "hover:bg-accent/50",
      )}
    >
      <span
        className={cn(
          "line-clamp-2 text-sm leading-snug",
          isRead ? "font-normal text-muted-foreground" : "font-medium text-foreground"
        )}
      >
        {isStarred && (
          <Star className="mr-1 inline-block h-3 w-3 fill-star text-star" />
        )}
        {title}
      </span>
      <span className="text-xs text-muted-foreground">
        {feedTitle} · {timeAgo}
      </span>
    </button>
  );
}
