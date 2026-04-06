import { AppShell } from "@/components/layout/AppShell";
import {
  getFeedsWithCounts,
  getArticles,
  getStarredCount,
  getTotalUnread,
} from "@/lib/queries";

interface PageProps {
  searchParams: Promise<{ feedId?: string; starred?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;

  const [feeds, totalUnread, starredCount, articles] = await Promise.all([
    getFeedsWithCounts(),
    getTotalUnread(),
    getStarredCount(),
    params.starred === "true"
      ? getArticles({ starredOnly: true })
      : getArticles({ feedId: params.feedId }),
  ]);

  return (
    <AppShell
      feeds={feeds}
      totalUnread={totalUnread}
      starredCount={starredCount}
      initialArticles={articles}
      initialArticle={null}
    />
  );
}
