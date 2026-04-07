import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { computeFeedHealth, summarizeHealth } from "@/lib/feed-health";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const feeds = await prisma.feed.findMany({
    orderBy: { title: "asc" },
    include: {
      articles: { select: { publishedAt: true } },
    },
  });

  const metrics = feeds
    .map((f) => computeFeedHealth(f))
    .sort((a, b) => {
      const order = { error: 0, stale: 1, idle: 2, healthy: 3 } as const;
      return order[a.status] - order[b.status] || a.title.localeCompare(b.title);
    });

  const summary = summarizeHealth(metrics);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to reader
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Feed Health</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Frequency, freshness, and error rate across your subscriptions.
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard label="Feeds" value={summary.total} />
          <SummaryCard label="Healthy" value={summary.healthy} tone="healthy" />
          <SummaryCard label="Stale" value={summary.stale} tone="stale" />
          <SummaryCard label="Errors" value={summary.error} tone="error" />
          <SummaryCard label="Articles (30d)" value={summary.recentArticles} />
        </div>

        {metrics.length === 0 ? (
          <p className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">
            No feeds yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Feed</th>
                  <th className="px-3 py-2 text-right font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Articles</th>
                  <th className="px-3 py-2 text-right font-medium">30d</th>
                  <th className="px-3 py-2 text-right font-medium">Per week</th>
                  <th className="px-3 py-2 text-right font-medium">Last article</th>
                  <th className="px-3 py-2 text-right font-medium">Last fetch</th>
                  <th className="px-3 py-2 text-right font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium">{m.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.siteUrl ?? m.url}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <StatusPill status={m.status} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.totalArticles}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.recentArticles}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.articlesPerWeek}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {m.lastArticleAt
                        ? formatDistanceToNow(m.lastArticleAt, { addSuffix: true })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {m.lastFetched
                        ? formatDistanceToNow(m.lastFetched, { addSuffix: true })
                        : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums",
                        m.errorCount > 0 && "text-destructive",
                      )}
                    >
                      {m.errorCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "healthy" | "stale" | "error";
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "error" && "text-destructive",
          tone === "stale" && "text-star",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "healthy" | "stale" | "error" | "idle" }) {
  const styles: Record<typeof status, string> = {
    healthy: "bg-emerald-500/15 text-emerald-400",
    stale: "bg-amber-500/15 text-amber-400",
    error: "bg-red-500/15 text-red-400",
    idle: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}
