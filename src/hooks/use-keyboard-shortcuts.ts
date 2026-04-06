import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onNextArticle: () => void;
  onPrevArticle: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
  onRefresh: () => void;
  onRefreshAll: () => void;
  onOpenOriginal: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle shortcuts when typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          options.onNextArticle();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          options.onPrevArticle();
          break;
        case "s":
          e.preventDefault();
          options.onToggleStar();
          break;
        case "m":
          e.preventDefault();
          options.onToggleRead();
          break;
        case "r":
          if (e.shiftKey) {
            e.preventDefault();
            options.onRefreshAll();
          } else {
            e.preventDefault();
            options.onRefresh();
          }
          break;
        case "o":
        case "Enter":
          e.preventDefault();
          options.onOpenOriginal();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [options]);
}
