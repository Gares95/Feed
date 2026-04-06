"use client";

import { Newspaper, Star, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AddFeedDialog } from "./AddFeedDialog";
import { FeedItem } from "./FeedItem";

export interface FeedWithCount {
  id: string;
  title: string;
  favicon: string | null;
  unreadCount: number;
}

interface SidebarProps {
  feeds: FeedWithCount[];
  selectedFeedId: string | null;
  totalUnread: number;
  starredCount: number;
  onSelectFeed: (feedId: string | null) => void;
  onSelectStarred: () => void;
  onDeleteFeed: (feedId: string) => void;
  onRefreshAll: () => void;
  onFeedAdded: () => void;
  isStarredView: boolean;
  isRefreshing: boolean;
}

export function Sidebar({
  feeds,
  selectedFeedId,
  totalUnread,
  starredCount,
  onSelectFeed,
  onSelectStarred,
  onDeleteFeed,
  onRefreshAll,
  onFeedAdded,
  isStarredView,
  isRefreshing,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <h1 className="text-sm font-semibold tracking-tight">Feed</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            title="Refresh all feeds"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
          <AddFeedDialog onFeedAdded={onFeedAdded} />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* All Articles */}
          <button
            onClick={() => onSelectFeed(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              !selectedFeedId && !isStarredView
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-foreground"
            )}
          >
            <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">All Articles</span>
            {totalUnread > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {totalUnread}
              </span>
            )}
          </button>

          {/* Starred */}
          <button
            onClick={onSelectStarred}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              isStarredView
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-foreground"
            )}
          >
            <Star className="h-4 w-4 shrink-0 text-star" />
            <span className="flex-1">Starred</span>
            {starredCount > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {starredCount}
              </span>
            )}
          </button>

          <Separator className="my-2" />

          {/* Feed list */}
          {feeds.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No feeds yet. Click + to add one.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {feeds.map((feed) => (
                <FeedItem
                  key={feed.id}
                  id={feed.id}
                  title={feed.title}
                  unreadCount={feed.unreadCount}
                  favicon={feed.favicon}
                  isSelected={selectedFeedId === feed.id && !isStarredView}
                  onSelect={onSelectFeed}
                  onDelete={onDeleteFeed}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
