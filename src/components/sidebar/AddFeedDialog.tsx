"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AddFeedDialogProps {
  onFeedAdded: () => void;
}

const SUGGESTED_FEEDS: { title: string; description: string; url: string }[] = [
  {
    title: "Hacker News",
    description: "Tech, startups, programming",
    url: "https://news.ycombinator.com/rss",
  },
  {
    title: "BBC News",
    description: "World news from the BBC",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    title: "The Guardian",
    description: "International news and analysis",
    url: "https://www.theguardian.com/international/rss",
  },
  {
    title: "Ars Technica",
    description: "Tech, science, policy, culture",
    url: "https://feeds.arstechnica.com/arstechnica/index",
  },
  {
    title: "The Verge",
    description: "Technology, science, entertainment",
    url: "https://www.theverge.com/rss/index.xml",
  },
  {
    title: "XKCD",
    description: "Webcomic of romance, sarcasm, math, and language",
    url: "https://xkcd.com/rss.xml",
  },
];

export function AddFeedDialog({ onFeedAdded }: AddFeedDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add feed");
        return;
      }

      setUrl("");
      setOpen(false);
      onFeedAdded();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setUrl("");
          setError(null);
          setLoading(false);
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="h-7 w-7" />}
      >
        <Plus className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Feed</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Paste an RSS/Atom URL, or a site&apos;s homepage URL — Feed will try
          to auto-discover the feed link.
        </p>

        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
          <Input
            placeholder="https://site.url/feed.xml"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? "Adding..." : "Add Feed"}
          </Button>
        </form>

        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Try one of these
          </p>
          <ul className="mt-2 space-y-1">
            {SUGGESTED_FEEDS.map((suggestion) => (
              <li key={suggestion.url}>
                <button
                  type="button"
                  onClick={() => setUrl(suggestion.url)}
                  disabled={loading}
                  className="group flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {suggestion.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {suggestion.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    Use URL
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">
            How to find a feed URL
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Look for an <strong>RSS</strong>, <strong>Feed</strong>, or
              orange RSS icon in the site&apos;s header or footer.
            </li>
            <li>
              Try common paths on the site: <code>/rss</code>,{" "}
              <code>/feed</code>, <code>/atom.xml</code>, or{" "}
              <code>/index.xml</code>.
            </li>
            <li>
              If you can&apos;t find a feed link, paste the homepage URL here
              — Feed scans the page for{" "}
              <code>&lt;link rel=&quot;alternate&quot;&gt;</code> tags.
            </li>
            <li>
              For YouTube channels, Reddit, Mastodon, and GitHub releases,
              most pages expose a hidden RSS endpoint — search the site
              name plus &quot;RSS&quot;.
            </li>
          </ul>
        </details>
      </DialogContent>
    </Dialog>
  );
}
