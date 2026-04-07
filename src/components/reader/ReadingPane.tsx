"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Highlighter, Loader2, Sparkles, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArticleHeader } from "./ArticleHeader";
import {
  TypographySettings,
  useTypography,
} from "./TypographySettings";
import { extractArticle } from "@/actions/reader";
import {
  addHighlight,
  deleteHighlight,
  getHighlights,
} from "@/actions/highlights";
import {
  applyHighlights,
  rangeTextOffset,
  type HighlightRecord,
} from "@/lib/highlights";

export interface ArticleFull {
  id: string;
  title: string;
  content: string;
  link: string;
  author: string | null;
  publishedAt: Date;
  isStarred: boolean;
  feedTitle: string;
}

interface ReadingPaneProps {
  article: ArticleFull | null;
  onToggleStar: (articleId: string) => void;
}

export function ReadingPane({ article, onToggleStar }: ReadingPaneProps) {
  const { config, update } = useTypography();
  const [readerMode, setReaderMode] = useState(false);
  const [readerContent, setReaderContent] = useState<string | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [highlights, setHighlights] = useState<HighlightRecord[]>([]);
  const [selection, setSelection] = useState<{
    text: string;
    offset: number;
    rect: DOMRect;
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset reader cache when switching articles
  useEffect(() => {
    setReaderMode(false);
    setReaderContent(null);
    setReaderError(null);
    setReaderLoading(false);
    setSelection(null);
    setHighlights([]);
    if (article?.id) {
      getHighlights(article.id).then((rows) =>
        setHighlights(
          rows.map((r) => ({
            id: r.id,
            text: r.text,
            textOffset: r.textOffset,
            note: r.note,
          })),
        ),
      );
    }
  }, [article?.id]);

  // Apply highlights to the rendered content. Re-runs whenever the rendered
  // HTML or the highlight set changes. Highlights only persist for the
  // original feed content, not reader-mode-extracted content (different DOM).
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    if (readerMode) return;
    if (highlights.length === 0) return;
    applyHighlights(node, highlights);
  }, [highlights, readerMode, article?.id, article?.content]);

  const handleMouseUp = useCallback(() => {
    if (readerMode) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const node = contentRef.current;
    if (!node || !node.contains(range.startContainer)) {
      setSelection(null);
      return;
    }
    const text = sel.toString();
    if (!text.trim()) {
      setSelection(null);
      return;
    }
    const offset = rangeTextOffset(node, range);
    if (offset < 0) {
      setSelection(null);
      return;
    }
    setSelection({ text, offset, rect: range.getBoundingClientRect() });
  }, [readerMode]);

  async function saveHighlight() {
    if (!article || !selection) return;
    const created = await addHighlight({
      articleId: article.id,
      text: selection.text,
      textOffset: selection.offset,
    });
    setHighlights((prev) => [
      ...prev,
      {
        id: created.id,
        text: created.text,
        textOffset: created.textOffset,
        note: created.note,
      },
    ]);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }

  async function removeHighlight(id: string) {
    await deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }

  async function toggleReaderMode() {
    if (!article) return;
    if (readerMode) {
      setReaderMode(false);
      return;
    }
    setReaderMode(true);
    if (readerContent || readerLoading) return;
    setReaderLoading(true);
    setReaderError(null);
    try {
      const result = await extractArticle(article.id);
      setReaderContent(result.content);
    } catch (e) {
      setReaderError(e instanceof Error ? e.message : "Failed to extract");
    } finally {
      setReaderLoading(false);
    }
  }

  if (!article) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <BookOpen className="h-8 w-8" />
        <p className="text-sm">Select an article to read</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center justify-end gap-1 border-b px-3">
        <Button
          variant={readerMode ? "secondary" : "ghost"}
          size="sm"
          className="h-6 gap-1.5 px-2 text-xs"
          onClick={toggleReaderMode}
          disabled={readerLoading}
          title={readerMode ? "Show original feed content" : "Reader mode"}
        >
          {readerLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Reader
        </Button>
        <TypographySettings config={config} onUpdate={update} />
      </div>
      <ScrollArea className="flex-1">
        <article
          className="mx-auto px-8 py-8"
          style={{ maxWidth: `${config.maxWidth}px` }}
        >
          <ArticleHeader
            title={article.title}
            author={article.author}
            publishedAt={article.publishedAt}
            feedTitle={article.feedTitle}
            link={article.link}
            content={article.content}
            isStarred={article.isStarred}
            onToggleStar={() => onToggleStar(article.id)}
          />
          {readerError && (
            <p className="mt-6 text-sm text-destructive">
              Reader mode failed: {readerError}
            </p>
          )}
          <div
            ref={contentRef}
            onMouseUp={handleMouseUp}
            className="article-content mt-6"
            style={{
              fontSize: `${config.fontSize}px`,
              lineHeight: config.lineHeight,
            }}
            dangerouslySetInnerHTML={{
              __html:
                readerMode && readerContent ? readerContent : article.content,
            }}
          />
          {highlights.length > 0 && !readerMode && (
            <div className="mt-10 border-t border-border pt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Highlights ({highlights.length})
              </h3>
              <ul className="flex flex-col gap-2">
                {highlights
                  .slice()
                  .sort((a, b) => a.textOffset - b.textOffset)
                  .map((h) => (
                    <li
                      key={h.id}
                      className="group flex items-start gap-2 rounded-md border border-border bg-card p-3 text-sm"
                    >
                      <span className="flex-1 italic text-foreground">
                        “{h.text}”
                      </span>
                      <button
                        type="button"
                        onClick={() => removeHighlight(h.id)}
                        className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        title="Delete highlight"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </article>
      </ScrollArea>
      {selection && (
        <button
          type="button"
          onClick={saveHighlight}
          className="fixed z-50 flex items-center gap-1 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md hover:bg-accent"
          style={{
            top: selection.rect.top - 36,
            left: selection.rect.left + selection.rect.width / 2 - 50,
          }}
        >
          <Highlighter className="h-3 w-3" />
          Highlight
        </button>
      )}
    </div>
  );
}
