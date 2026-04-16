"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Sidebar, type FeedWithCount, type FolderRef } from "@/components/sidebar/Sidebar";
import {
  ArticleList,
  type ArticleWithFeed,
} from "@/components/articles/ArticleList";
import {
  ReadingPane,
  type ArticleFull,
} from "@/components/reader/ReadingPane";
import {
  deleteFeed,
  refreshAllFeeds,
  refreshFeed,
} from "@/actions/feeds";
import {
  markAllRead,
  markRead,
  markUnread,
  toggleStar,
} from "@/actions/articles";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useArticleSearch } from "@/hooks/use-article-search";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useSwipe } from "@/hooks/use-swipe";
import type { DateRange } from "@/lib/date-range";
import { CommandPalette } from "@/components/CommandPalette";

interface AppShellProps {
  feeds: FeedWithCount[];
  folders: FolderRef[];
  totalUnread: number;
  starredCount: number;
  initialArticles: ArticleWithFeed[];
  initialArticle: ArticleFull | null;
  initialDateRange: DateRange;
}

export function AppShell({
  feeds,
  folders,
  totalUnread,
  starredCount,
  initialArticles,
  initialArticle,
  initialDateRange,
}: AppShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [isStarredView, setIsStarredView] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    initialArticle?.id ?? null
  );
  const articles = initialArticles;
  const [currentArticle, setCurrentArticle] = useState<ArticleFull | null>(
    initialArticle
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileView, setMobileView] = useState<"sidebar" | "list" | "reader">(
    "list",
  );

  const search = useArticleSearch();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  useAutoRefresh(refresh);

  function buildUrl(opts: {
    feedId?: string | null;
    starred?: boolean;
    range?: DateRange;
  }) {
    const params = new URLSearchParams();
    if (opts.feedId) params.set("feedId", opts.feedId);
    if (opts.starred) params.set("starred", "true");
    const r = opts.range ?? dateRange;
    if (r !== "all") params.set("range", r);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function handleSelectFeed(feedId: string | null) {
    setSelectedFeedId(feedId);
    setIsStarredView(false);
    setSelectedArticleId(null);
    setCurrentArticle(null);
    setMobileView("list");

    startTransition(() => {
      router.push(buildUrl({ feedId }));
    });
  }

  function handleSelectStarred() {
    setSelectedFeedId(null);
    setIsStarredView(true);
    setSelectedArticleId(null);
    setCurrentArticle(null);
    setMobileView("list");

    startTransition(() => {
      router.push(buildUrl({ starred: true }));
    });
  }

  function handleDateRangeChange(range: DateRange) {
    setDateRange(range);
    startTransition(() => {
      router.push(
        buildUrl({
          feedId: selectedFeedId,
          starred: isStarredView,
          range,
        }),
      );
    });
  }

  async function handleSelectArticle(articleId: string) {
    setSelectedArticleId(articleId);
    setMobileView("reader");

    // Mark as read optimistically
    const articleInList = articles.find((a) => a.id === articleId);
    if (articleInList && !articleInList.isRead) {
      articleInList.isRead = true;
    }

    // Fetch full article content
    try {
      const res = await fetch(`/api/articles/${articleId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentArticle(data.article);
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
    }

    // Persist read state
    await markRead(articleId);
  }

  async function handleToggleStar(articleId: string) {
    // Optimistic update
    if (currentArticle && currentArticle.id === articleId) {
      setCurrentArticle({
        ...currentArticle,
        isStarred: !currentArticle.isStarred,
      });
    }

    await toggleStar(articleId);
    refresh();
  }

  async function handleDeleteFeed(feedId: string) {
    await deleteFeed(feedId);
    if (selectedFeedId === feedId) {
      setSelectedFeedId(null);
      setSelectedArticleId(null);
      setCurrentArticle(null);
    }
    refresh();
  }

  async function handleMarkAllRead() {
    await markAllRead(selectedFeedId ?? undefined);
    refresh();
  }

  async function handleRefreshFeed(feedId: string) {
    try {
      await refreshFeed(feedId);
    } catch (error) {
      console.error("Failed to refresh feed:", error);
    }
    refresh();
  }

  async function handleRefreshAll() {
    setIsRefreshing(true);
    try {
      await refreshAllFeeds();
      refresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  const displayedArticles = search.results ?? articles;

  const readerSwipe = useSwipe({
    onSwipeLeft: () => {
      const i = displayedArticles.findIndex((a) => a.id === selectedArticleId);
      if (i >= 0 && i + 1 < displayedArticles.length) {
        handleSelectArticle(displayedArticles[i + 1].id);
      }
    },
    onSwipeRight: () => setMobileView("list"),
  });

  useKeyboardShortcuts({
    onNextArticle: () => {
      const currentIndex = displayedArticles.findIndex(
        (a) => a.id === selectedArticleId,
      );
      const nextIndex = currentIndex + 1;
      if (nextIndex < displayedArticles.length) {
        handleSelectArticle(displayedArticles[nextIndex].id);
      }
    },
    onPrevArticle: () => {
      const currentIndex = displayedArticles.findIndex(
        (a) => a.id === selectedArticleId,
      );
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        handleSelectArticle(displayedArticles[prevIndex].id);
      }
    },
    onToggleStar: () => {
      if (selectedArticleId) handleToggleStar(selectedArticleId);
    },
    onToggleRead: async () => {
      if (!selectedArticleId) return;
      const article = displayedArticles.find(
        (a) => a.id === selectedArticleId,
      );
      if (article) {
        if (article.isRead) {
          await markUnread(selectedArticleId);
        } else {
          await markRead(selectedArticleId);
        }
        refresh();
      }
    },
    onRefresh: () => refresh(),
    onRefreshAll: () => handleRefreshAll(),
    onOpenOriginal: () => {
      if (currentArticle?.link) {
        window.open(currentArticle.link, "_blank", "noopener,noreferrer");
      }
    },
  });

  const heading = isStarredView
    ? "Starred"
    : selectedFeedId
      ? feeds.find((f) => f.id === selectedFeedId)?.title ?? "Articles"
      : "All Articles";

  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Mobile: stacked single-pane layout */}
      <div className="flex h-full flex-col md:hidden">
        <div className="flex h-12 items-center gap-2 border-b px-2">
          {mobileView === "sidebar" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileView("list")}
              title="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : mobileView === "reader" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileView("list")}
              title="Back to list"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileView("sidebar")}
              title="Open feeds"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="truncate text-sm font-semibold">{heading}</h1>
        </div>
        <div className="min-h-0 flex-1">
          {mobileView === "sidebar" && (
            <Sidebar
              feeds={feeds}
              folders={folders}
              selectedFeedId={selectedFeedId}
              totalUnread={totalUnread}
              starredCount={starredCount}
              onSelectFeed={handleSelectFeed}
              onSelectStarred={handleSelectStarred}
              onDeleteFeed={handleDeleteFeed}
              onRefreshFeed={handleRefreshFeed}
              onUpdateFeed={refresh}
              onRefreshAll={handleRefreshAll}
              onFeedAdded={refresh}
              isStarredView={isStarredView}
              isRefreshing={isRefreshing || isPending}
            />
          )}
          {mobileView === "list" && (
            <ArticleList
              articles={displayedArticles}
              selectedArticleId={selectedArticleId}
              onSelectArticle={handleSelectArticle}
              heading={heading}
              searchQuery={search.query}
              onSearchChange={search.onChange}
              isSearching={search.isSearching}
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              onMarkAllRead={handleMarkAllRead}
              searchError={search.error}
              hasFeeds={feeds.length > 0}
              onRefreshAll={handleRefreshAll}
            />
          )}
          {mobileView === "reader" && (
            <div className="h-full" {...readerSwipe}>
              <ReadingPane
                article={currentArticle}
                onToggleStar={handleToggleStar}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop: three-pane resizable layout */}
      <ResizablePanelGroup
        orientation="horizontal"
        id="app-layout"
        className="hidden md:flex"
      >
        <ResizablePanel
          id="sidebar"
          defaultSize="28%"
          minSize="200px"
          maxSize="38%"
          className="bg-card"
        >
          <Sidebar
            feeds={feeds}
            folders={folders}
            selectedFeedId={selectedFeedId}
            totalUnread={totalUnread}
            starredCount={starredCount}
            onSelectFeed={handleSelectFeed}
            onSelectStarred={handleSelectStarred}
            onDeleteFeed={handleDeleteFeed}
            onRefreshFeed={handleRefreshFeed}
            onUpdateFeed={refresh}
            onRefreshAll={handleRefreshAll}
            onFeedAdded={refresh}
            isStarredView={isStarredView}
            isRefreshing={isRefreshing || isPending}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel
          id="article-list"
          defaultSize="30%"
          minSize="250px"
          className="bg-background"
        >
          <ArticleList
            articles={displayedArticles}
            selectedArticleId={selectedArticleId}
            onSelectArticle={handleSelectArticle}
            heading={heading}
            searchQuery={search.query}
            onSearchChange={search.onChange}
            isSearching={search.isSearching}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onMarkAllRead={handleMarkAllRead}
            searchError={search.error}
            hasFeeds={feeds.length > 0}
            onRefreshAll={handleRefreshAll}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel id="reading-pane" defaultSize="50%" minSize="400px" className="bg-background">
          <ReadingPane
            article={currentArticle}
            onToggleStar={handleToggleStar}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        feeds={feeds}
        onSelectAll={() => handleSelectFeed(null)}
        onSelectStarred={handleSelectStarred}
        onSelectFeed={(id) => handleSelectFeed(id)}
        onRefreshAll={handleRefreshAll}
        onMarkAllRead={handleMarkAllRead}
      />
    </div>
  );
}
