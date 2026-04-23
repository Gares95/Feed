import { AppShell } from "@/components/layout/AppShell";
import {
  getFeedsWithCounts,
  getFolders,
  getArticles,
  getStarredCount,
  getTotalUnread,
} from "@/lib/queries";
import { dateRangeToSince, isDateRange, type DateRange } from "@/lib/date-range";

interface PageProps {
  searchParams: Promise<{ feedId?: string; starred?: string; range?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const range: DateRange = isDateRange(params.range) ? params.range : "all";
  const since = dateRangeToSince(range);

  const [feeds, folders, totalUnread, starredCount, articlePage] = await Promise.all([
    getFeedsWithCounts(),
    getFolders(),
    getTotalUnread(),
    getStarredCount(),
    params.starred === "true"
      ? getArticles({ starredOnly: true, since })
      : getArticles({ feedId: params.feedId, since }),
  ]);

  return (
    <AppShell
      feeds={feeds}
      folders={folders}
      totalUnread={totalUnread}
      starredCount={starredCount}
      initialArticles={articlePage.articles}
      initialNextCursor={articlePage.nextCursor}
      initialFeedId={params.feedId ?? null}
      initialStarred={params.starred === "true"}
      initialArticle={null}
      initialDateRange={range}
    />
  );
}
