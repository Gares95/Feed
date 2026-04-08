"use client";

import { useState } from "react";
import Link from "next/link";
import { Newspaper, Star, RefreshCw, FolderPlus, ChevronDown, ChevronRight, Pencil, Trash2, Activity, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AddFeedDialog } from "./AddFeedDialog";
import { FeedItem } from "./FeedItem";
import { OpmlActions } from "./OpmlActions";
import { groupFeedsByFolder } from "@/lib/group-feeds";
import {
  createFolder,
  renameFolder,
  deleteFolder,
  moveFeedToFolder,
} from "@/actions/folders";

export interface FolderRef {
  id: string;
  name: string;
}

export interface FeedWithCount {
  id: string;
  title: string;
  favicon: string | null;
  unreadCount: number;
  errorCount: number;
  lastFetched: Date | null;
  refreshInterval: number | null;
  folderId: string | null;
}

interface SidebarProps {
  feeds: FeedWithCount[];
  folders: FolderRef[];
  selectedFeedId: string | null;
  totalUnread: number;
  starredCount: number;
  onSelectFeed: (feedId: string | null) => void;
  onSelectStarred: () => void;
  onDeleteFeed: (feedId: string) => void;
  onRefreshFeed: (feedId: string) => void;
  onUpdateFeed: () => void;
  onRefreshAll: () => void;
  onFeedAdded: () => void;
  isStarredView: boolean;
  isRefreshing: boolean;
}

export function Sidebar({
  feeds,
  folders,
  selectedFeedId,
  totalUnread,
  starredCount,
  onSelectFeed,
  onSelectStarred,
  onDeleteFeed,
  onRefreshFeed,
  onUpdateFeed,
  onRefreshAll,
  onFeedAdded,
  isStarredView,
  isRefreshing,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const groups = groupFeedsByFolder(feeds, folders);

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleNewFolder() {
    const name = window.prompt("Folder name?");
    if (!name?.trim()) return;
    await createFolder(name);
    onFeedAdded();
  }

  async function handleDeleteFolder(folderId: string) {
    if (!window.confirm("Delete this folder? Feeds inside will become uncategorized.")) return;
    await deleteFolder(folderId);
    onFeedAdded();
  }

  async function commitRename(folderId: string) {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    await renameFolder(folderId, trimmed);
    onFeedAdded();
  }

  async function handleMoveFeed(feedId: string, folderId: string | null) {
    await moveFeedToFolder(feedId, folderId);
    onFeedAdded();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <h1 className="text-sm font-semibold tracking-tight">Feed</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNewFolder}
            title="New folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
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
          <OpmlActions onImportComplete={onFeedAdded} />
          <Link href="/health" title="Feed health dashboard">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Activity className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/stats" title="Reading stats">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <BarChart3 className="h-4 w-4" />
            </Button>
          </Link>
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

          {feeds.length === 0 && folders.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No feeds yet. Click + to add one.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {groups.map((group) => {
                const folderId = group.folder?.id ?? "__uncat__";
                const isCollapsed = collapsed.has(folderId);
                const label = group.folder?.name ?? "Uncategorized";
                const isRenaming = renamingId === group.folder?.id;
                return (
                  <div key={folderId} className="flex flex-col gap-0.5">
                    <div className="group flex items-center gap-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(folderId)}
                        className="flex flex-1 items-center gap-1 rounded px-1 py-1 hover:bg-accent/50"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {isRenaming && group.folder ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => commitRename(group.folder!.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(group.folder!.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-transparent text-xs uppercase tracking-wide outline-none"
                          />
                        ) : (
                          <span className="truncate">{label}</span>
                        )}
                      </button>
                      {group.folder && !isRenaming && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(group.folder!.id);
                              setRenameValue(group.folder!.name);
                            }}
                            className="hidden rounded p-0.5 hover:bg-accent group-hover:block"
                            title="Rename folder"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(group.folder!.id)}
                            className="hidden rounded p-0.5 hover:bg-destructive/20 hover:text-destructive group-hover:block"
                            title="Delete folder"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="flex flex-col gap-0.5 pl-2">
                        {group.feeds.length === 0 ? (
                          <p className="px-2 py-1 text-[11px] text-muted-foreground/70">
                            Empty
                          </p>
                        ) : (
                          group.feeds.map((feed) => (
                            <FeedItem
                              key={feed.id}
                              id={feed.id}
                              title={feed.title}
                              unreadCount={feed.unreadCount}
                              favicon={feed.favicon}
                              errorCount={feed.errorCount}
                              refreshInterval={feed.refreshInterval}
                              folderId={feed.folderId}
                              folders={folders}
                              isSelected={selectedFeedId === feed.id && !isStarredView}
                              onSelect={onSelectFeed}
                              onDelete={onDeleteFeed}
                              onRefresh={onRefreshFeed}
                              onUpdated={onUpdateFeed}
                              onMove={handleMoveFeed}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
