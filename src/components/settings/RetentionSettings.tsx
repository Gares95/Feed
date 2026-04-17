"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type RetentionConfig,
  type RetentionPreview,
  setRetentionConfig,
  previewRetention,
  pruneArticles,
} from "@/actions/retention";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
  { label: "1 year", value: 365 },
];

interface RetentionSettingsProps {
  initial: RetentionConfig;
}

export function RetentionSettings({ initial }: RetentionSettingsProps) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [days, setDays] = useState(initial.days);
  const [lastRun, setLastRun] = useState(initial.lastRun);
  const [preview, setPreview] = useState<RetentionPreview | null>(null);
  const [pruneResult, setPruneResult] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    setEnabled(next);
    setPruneResult(null);
    if (next) {
      startTransition(async () => {
        await setRetentionConfig({ enabled: next, days });
        const p = await previewRetention(days);
        setPreview(p);
      });
    } else {
      setPreview(null);
      startTransition(async () => {
        await setRetentionConfig({ enabled: next, days });
      });
    }
  }

  function handleDaysChange(value: number) {
    setDays(value);
    setPruneResult(null);
    startTransition(async () => {
      await setRetentionConfig({ enabled, days: value });
      if (enabled) {
        const p = await previewRetention(value);
        setPreview(p);
      }
    });
  }

  function handlePruneNow() {
    startTransition(async () => {
      const result = await pruneArticles(days);
      setPruneResult(result.deleted);
      setLastRun(new Date().toISOString());
      setPreview(null);
    });
  }

  function handleRefreshPreview() {
    startTransition(async () => {
      const p = await previewRetention(days);
      setPreview(p);
      setPruneResult(null);
    });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        Article retention
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Automatically prune old articles to keep the database lean. Starred
        articles, articles with highlights, and unread articles are always kept
        regardless of age.
      </p>

      <div className="mt-6 space-y-5">
        <div className="flex items-center justify-between">
          <label htmlFor="retention-toggle" className="text-sm font-medium">
            Auto-prune old articles
          </label>
          <button
            id="retention-toggle"
            role="switch"
            aria-checked={enabled}
            onClick={() => handleToggle(!enabled)}
            disabled={isPending}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              enabled ? "bg-accent" : "bg-muted",
              isPending && "opacity-50",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
                enabled ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {enabled && (
          <>
            <div className="flex items-center justify-between">
              <label htmlFor="retention-days" className="text-sm font-medium">
                Delete articles older than
              </label>
              <select
                id="retention-days"
                value={days}
                onChange={(e) => handleDaysChange(Number(e.target.value))}
                disabled={isPending}
                className="rounded-md border bg-card px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-accent"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Separator />

            {preview && preview.count > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  {preview.count} article{preview.count !== 1 ? "s" : ""} would
                  be removed
                </p>
                {preview.oldestDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Oldest: {new Date(preview.oldestDate).toLocaleDateString()}
                  </p>
                )}
                {preview.byFeed.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {preview.byFeed.slice(0, 10).map((f) => (
                      <li key={f.feedTitle}>
                        {f.feedTitle}: {f.count}
                      </li>
                    ))}
                    {preview.byFeed.length > 10 && (
                      <li>…and {preview.byFeed.length - 10} more feeds</li>
                    )}
                  </ul>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={handlePruneNow}
                  disabled={isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {isPending ? "Pruning…" : "Prune now"}
                </Button>
              </div>
            )}

            {preview && preview.count === 0 && (
              <p className="text-sm text-muted-foreground">
                No articles match the retention criteria — nothing to prune.
              </p>
            )}

            {pruneResult !== null && (
              <p className="text-sm text-green-400">
                Pruned {pruneResult} article{pruneResult !== 1 ? "s" : ""}.
              </p>
            )}

            {!preview && pruneResult === null && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPreview}
                disabled={isPending}
              >
                {isPending ? "Calculating…" : "Preview what would be deleted"}
              </Button>
            )}
          </>
        )}

        {lastRun && (
          <p className="text-xs text-muted-foreground">
            Last pruned: {new Date(lastRun).toLocaleString()}
          </p>
        )}
      </div>
    </section>
  );
}
