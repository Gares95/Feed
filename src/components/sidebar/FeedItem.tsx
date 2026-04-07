"use client";

import { useState } from "react";
import { Rss, Trash2, RefreshCw, AlertTriangle, Settings } from "lucide-react";
import { FeedSettingsDialog } from "./FeedSettingsDialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FeedItemProps {
  id: string;
  title: string;
  unreadCount: number;
  favicon: string | null;
  errorCount: number;
  refreshInterval: number | null;
  isSelected: boolean;
  onSelect: (feedId: string) => void;
  onDelete: (feedId: string) => void;
  onRefresh: (feedId: string) => void;
  onUpdated: () => void;
}

export function FeedItem({
  id,
  title,
  unreadCount,
  favicon,
  errorCount,
  refreshInterval,
  isSelected,
  onSelect,
  onDelete,
  onRefresh,
  onUpdated,
}: FeedItemProps) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasError = errorCount > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
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
      <span className={cn("flex-1 truncate", hasError && "text-destructive")}>{title}</span>
      {hasError && (
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 text-destructive group-hover:hidden"
          aria-label={`Failed to fetch (${errorCount} errors)`}
        />
      )}
      <span className="text-xs text-muted-foreground tabular-nums group-hover:hidden">
        {!hasError && unreadCount > 0 ? unreadCount : ""}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRefresh(id);
        }}
        className="hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground group-hover:block"
        title={hasError ? "Retry feed" : "Refresh feed"}
      >
        <RefreshCw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setSettingsOpen(true);
        }}
        className="hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground group-hover:block"
        title="Feed settings"
      >
        <Settings className="h-4 w-4" />
      </button>
      <FeedSettingsDialog
        feedId={id}
        initialTitle={title}
        initialRefreshInterval={refreshInterval}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={onUpdated}
      />
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
          }}
          className="hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive group-hover:block"
          title="Delete feed"
        >
          <Trash2 className="h-4 w-4" />
        </AlertDialogTrigger>
        <AlertDialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this feed and all its articles. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                onDelete(id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
