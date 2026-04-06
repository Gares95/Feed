"use client";

import { useState } from "react";
import { Rss, Trash2 } from "lucide-react";
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
  const [open, setOpen] = useState(false);

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
      <span className="flex-1 truncate">{title}</span>
      <span className="text-xs text-muted-foreground tabular-nums group-hover:hidden">
        {unreadCount > 0 ? unreadCount : ""}
      </span>
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
