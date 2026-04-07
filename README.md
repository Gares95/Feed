# Feed

A local-first RSS / Atom reader. Runs entirely on your machine, stores everything in a single SQLite file, and asks for zero accounts or API keys. Designed for focused reading: dark-mode-first, generous typography, keyboard-navigable.

> Closer in spirit to Reeder or Matter than to Feedly. No cloud, no algorithm, no ads.

## Features

- **Subscribe to any RSS / Atom feed** — paste a URL, the app auto-discovers and parses
- **Three-pane reader** — sidebar (feeds) · article list · reading pane, all resizable
- **Folders** for organizing feeds, with drag-friendly move-between
- **OPML import / export** — bring your subscriptions with you
- **Full-text search** powered by SQLite FTS5
- **Command palette** (`⌘K` / `Ctrl+K`) for fast navigation
- **Auto-refresh** with configurable per-feed intervals
- **Reader mode** — content extraction via Mozilla Readability
- **Article highlights** — select text to save persistent annotations
- **Starred export** — download starred articles as Markdown or JSON
- **Feed health dashboard** — frequency, freshness, and error metrics per feed
- **Image proxy** for blocked / mixed-content images
- **Code-block syntax highlighting** in articles
- **Mobile-responsive** layout with swipe gestures
- **Dark-mode-first** design using oklch color tokens
- **Keyboard shortcuts** for everything that matters: `j` / `k`, `s`, `m`, `r`, `o`, …

## Quick start

```bash
git clone <this-repo>
cd Feed
npm run setup       # install + prisma generate + prisma migrate dev
npm run dev         # http://localhost:3000
```

Open the app, click `+`, paste a feed URL, and start reading.

## Commands

```bash
npm run setup       # First-time: install, generate Prisma client, run migrations
npm run dev         # Dev server (Turbopack) on http://localhost:3000
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Vitest
npm run test:watch  # Vitest in watch mode
npx prisma studio   # Browse the SQLite database in a GUI
```

Run a single test file:

```bash
npx vitest run src/lib/highlights.test.ts
```

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **React 19**, **TypeScript 5** (strict mode)
- **Tailwind CSS v4**, **shadcn/ui** (New York), **Lucide** icons
- **Prisma 6** + **SQLite** (single file at `prisma/dev.db`)
- **rss-parser** for parsing, **DOMPurify + jsdom** for server-side HTML sanitization
- **react-resizable-panels** for the three-pane layout
- **Vitest** + **React Testing Library**

## Architecture

```
Add feed URL  →  POST /api/feeds  →  fetch RSS → parse XML → sanitize → SQLite
Read articles →  Server Components query Prisma → render three-pane layout
Mutations     →  Server Actions → SQLite → optimistic UI update
```

Key design decisions:

- **Server-side feed fetching only** — never fetch RSS from the client (CORS / security)
- **Full article HTML stored in SQLite** — reading is instant and works offline
- **All feed HTML sanitized with DOMPurify** before rendering
- **No client state library** — React Context for UI state, Server Components for data
- **Server Actions over API routes** for mutations; API routes only for complex server-only operations

## Project layout

```
src/
├── app/             # Pages and API routes (App Router)
│   ├── api/         # feeds, articles, opml, image-proxy, export/starred
│   ├── health/      # Feed health dashboard
│   ├── page.tsx     # Three-pane reader entry
│   └── globals.css  # oklch token system
├── actions/         # Server Actions (feeds, articles, folders, reader, highlights)
├── components/
│   ├── layout/      # AppShell (resizable three-pane)
│   ├── sidebar/     # Sidebar, FeedItem, AddFeedDialog, OpmlActions, FeedSettings
│   ├── articles/    # ArticleList, ArticleRow
│   ├── reader/      # ReadingPane, ArticleHeader, TypographySettings
│   └── ui/          # shadcn primitives
├── lib/             # feed-parser, sanitize, queries, opml, highlights, feed-health, …
├── hooks/           # useKeyboardShortcuts, …
└── generated/prisma # Prisma client (custom output path)
prisma/
├── schema.prisma
└── migrations/
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| `j` / `↓` | Next article |
| `k` / `↑` | Previous article |
| `Enter` / `o` | Open article in reading pane |
| `s` | Toggle star |
| `m` | Toggle read / unread |
| `r` | Refresh current feed |
| `R` | Refresh all feeds |
| `a` | Add new feed |
| `⌘K` / `Ctrl+K` | Command palette |

## Privacy

Everything lives in `prisma/dev.db`. No telemetry, no third-party requests beyond fetching the feeds you subscribe to (and any inline images, optionally routed through the local image proxy). Back up the project to back up the data.

## Roadmap

The full phased roadmap, design tokens, schema, and architectural rationale live in [`PROJECT_BLUEPRINT.md`](./PROJECT_BLUEPRINT.md). Phase 1–3 are complete, Phase 5 is in progress, and Phase 4 (optional AI) is intentionally deferred.

## License

Personal project — no license declared. Treat as “all rights reserved” unless stated otherwise.
