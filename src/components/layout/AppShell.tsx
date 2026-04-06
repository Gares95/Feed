"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Sidebar, type FeedWithCount } from "@/components/sidebar/Sidebar";
import {
  ArticleList,
  type ArticleWithFeed,
} from "@/components/articles/ArticleList";
import {
  ReadingPane,
  type ArticleFull,
} from "@/components/reader/ReadingPane";
import { deleteFeed } from "@/actions/feeds";
import { refreshAllFeeds } from "@/actions/feeds";
import { markRead, toggleStar } from "@/actions/articles";

interface AppShellProps {
  feeds: FeedWithCount[];
  totalUnread: number;
  starredCount: number;
  initialArticles: ArticleWithFeed[];
  initialArticle: ArticleFull | null;
}

export function AppShell({
  feeds,
  totalUnread,
  starredCount,
  initialArticles,
  initialArticle,
}: AppShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [isStarredView, setIsStarredView] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    initialArticle?.id ?? null
  );
  const [articles] = useState(initialArticles);
  const [currentArticle, setCurrentArticle] = useState<ArticleFull | null>(
    initialArticle
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  function handleSelectFeed(feedId: string | null) {
    setSelectedFeedId(feedId);
    setIsStarredView(false);
    setSelectedArticleId(null);
    setCurrentArticle(null);

    const params = new URLSearchParams();
    if (feedId) params.set("feedId", feedId);

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  }

  function handleSelectStarred() {
    setSelectedFeedId(null);
    setIsStarredView(true);
    setSelectedArticleId(null);
    setCurrentArticle(null);

    startTransition(() => {
      router.push("/?starred=true");
    });
  }

  async function handleSelectArticle(articleId: string) {
    setSelectedArticleId(articleId);

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

  async function handleRefreshAll() {
    setIsRefreshing(true);
    try {
      await refreshAllFeeds();
      refresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  const heading = isStarredView
    ? "Starred"
    : selectedFeedId
      ? feeds.find((f) => f.id === selectedFeedId)?.title ?? "Articles"
      : "All Articles";

  return (
    <div className="h-screen w-screen overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" id="app-layout">
        <ResizablePanel
          id="sidebar"
          defaultSize="20%"
          minSize="200px"
          maxSize="30%"
          className="bg-card"
        >
          <Sidebar
            feeds={feeds}
            selectedFeedId={selectedFeedId}
            totalUnread={totalUnread}
            starredCount={starredCount}
            onSelectFeed={handleSelectFeed}
            onSelectStarred={handleSelectStarred}
            onDeleteFeed={handleDeleteFeed}
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
            articles={articles}
            selectedArticleId={selectedArticleId}
            onSelectArticle={handleSelectArticle}
            heading={heading}
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
    </div>
  );
}
