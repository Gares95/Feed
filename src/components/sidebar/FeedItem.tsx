"use client";

import { Rss, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedItemProps {
  id: string;
  title: string;
  unreadCount: number;
  favicon: string | null;
  isSelected: boolean;
  onSelect: (feedId: string) => void;
  onDelete: (feedId: string) => void;
}

export function FeedItem({
  id,
  title,
  unreadCount,
  favicon,
  isSelected,
  onSelect,
  onDelete,
}: FeedItemProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-foreground"
      )}
    >
      {favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="h-4 w-4 shrink-0 rounded" />
      ) : (
        <Rss className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 truncate">{title}</span>
      {unreadCount > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {unreadCount}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
        title="Delete feed"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </button>
  );
}
