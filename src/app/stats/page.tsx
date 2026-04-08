import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { currentStreak, dailyReadCounts, summarize } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [readArticles, totalArticles, totalUnread, totalStarred, topFeeds] =
    await Promise.all([
      prisma.article.findMany({
        where: { readAt: { not: null } },
        select: { readAt: true },
      }),
      prisma.article.count(),
      prisma.article.count({ where: { isRead: false } }),
      prisma.article.count({ where: { isStarred: true } }),
      prisma.feed.findMany({
        orderBy: { title: "asc" },
        include: {
          _count: { select: { articles: { where: { readAt: { not: null } } } } },
        },
      }),
    ]);

  const events = readArticles
    .filter((a): a is { readAt: Date } => a.readAt !== null)
    .map((a) => ({ readAt: a.readAt }));

  const summary = summarize(events);
  const streak = currentStreak(events);
  const last30 = dailyReadCounts(events, 30);
  const peak = Math.max(1, ...last30.map((d) => d.count));

  const feedRanking = topFeeds
    .map((f) => ({ id: f.id, title: f.title, read: f._count.articles }))
    .filter((f) => f.read > 0)
    .sort((a, b) => b.read - a.read)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to reader
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Reading Stats</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How much you&apos;ve been reading and what you keep coming back to.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Read total" value={summary.total} />
          <Stat label="Last 7 days" value={summary.last7} />
          <Stat label="Last 30 days" value={summary.last30} />
          <Stat label="Streak" value={streak} suffix={streak === 1 ? "day" : "days"} />
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Articles in DB" value={totalArticles} muted />
          <Stat label="Unread" value={totalUnread} muted />
          <Stat label="Starred" value={totalStarred} muted />
          <Stat
            label="Avg / day (30d)"
            value={summary.avgPerDayLast30}
            muted
          />
        </div>

        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Last 30 days
          </h2>
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex h-32 items-end gap-1">
              {last30.map((d) => {
                const h = (d.count / peak) * 100;
                return (
                  <div
                    key={d.date}
                    className="group relative flex-1"
                    title={`${d.date}: ${d.count}`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-sm transition-colors",
                        d.count === 0 ? "bg-muted/50" : "bg-primary/70 hover:bg-primary",
                      )}
                      style={{ height: `${Math.max(h, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{last30[0]?.date}</span>
              <span>{last30[last30.length - 1]?.date}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top feeds by reads
          </h2>
          {feedRanking.length === 0 ? (
            <p className="rounded-md border border-border p-6 text-center text-sm text-muted-foreground">
              No reads yet. Open some articles to start building stats.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Feed</th>
                    <th className="px-3 py-2 text-right font-medium">Read</th>
                  </tr>
                </thead>
                <tbody>
                  {feedRanking.map((f) => (
                    <tr key={f.id} className="border-t border-border">
                      <td className="px-3 py-2">{f.title}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{f.read}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  muted,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums",
          muted && "text-muted-foreground",
        )}
      >
        <span>{value}</span>
        {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
