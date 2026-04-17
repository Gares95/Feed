# PROJECT_BLUEPRINT.md — Feed: Local RSS Reader

> Master build guide for a new local-first RSS reader web application.
> This file is the single source of truth for a Claude Code session building this project from scratch.

---

## Project Overview

**Feed** is a local-first RSS/Atom reader built as a browser-based web app. It runs entirely on localhost, stores all data in SQLite, and requires zero external accounts or API keys. The design is dark-mode-first, typographically rich, and optimized for focused reading.

## Product Vision

A beautiful, fast, private RSS reader that runs locally and respects the user's attention. No accounts, no cloud sync, no algorithmic feeds, no ads. Just clean reading.

The UI should feel closer to Reeder or Matter than to Feedly or Google Reader — minimal chrome, generous typography, smooth transitions, and a layout that disappears when you're reading.

## User Value

- **Daily use:** Check feeds every morning, catch up on tech blogs, news, releases
- **Privacy:** All data local, no tracking, no third-party analytics
- **Speed:** Instant navigation, no network latency for reads, SQLite-backed search
- **Focus:** Distraction-free reading view with configurable density
- **Ownership:** OPML import/export means no lock-in

## Target User

Developers, designers, and knowledge workers who read blogs, technical content, and newsletters. Single-user, single-machine.

---

## MVP Scope (Phase 1)

The MVP must deliver a complete, usable reading experience:

1. **Add feeds** — paste a URL, the app auto-discovers the RSS/Atom feed
2. **Fetch & parse feeds** — server-side fetch, parse XML, store articles in SQLite
3. **Three-pane layout** — sidebar (feed list) | article list | reading pane
4. **Read articles** — rendered HTML with sanitized content, clean typography
5. **Mark read/unread** — automatic on open, manual toggle
6. **Star/favorite articles** — persistent, filterable
7. **Unread counts** — per-feed and total in sidebar
8. **Manual refresh** — button to re-fetch all feeds or a single feed
9. **Basic keyboard shortcuts** — j/k (next/prev article), s (star), m (toggle read), r (refresh)
10. **Dark mode by default** — primary experience; light mode toggle deferred beyond v1

### What is Explicitly Out of Scope for v1

- Authentication / user accounts
- Multi-device sync
- OPML import/export (Phase 2)
- Full-text search (Phase 2)
- Feed folders/categories (Phase 2)
- Auto-refresh / background polling (Phase 2)
- Content extraction / reader mode (Phase 3)
- Any AI/LLM features (Phase 4+)
- Mobile-responsive layout (Phase 3)
- Browser extension for subscribing
- Push notifications
- Social features (sharing, comments)
- Feed discovery / recommendations
- Podcast/audio support

---

## Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Server components for data fetching, API routes for feed fetching, proven at this scale |
| Language | **TypeScript 5** | Type safety, especially for feed/article data models |
| UI Components | **@base-ui/react** (wrapped in `src/components/ui/`) | Headless accessible primitives; shadcn CLI used to scaffold wrappers |
| Icons | **Lucide React** | Clean, consistent, tree-shakeable |
| Styling | **Tailwind CSS v4** | Utility-first, CSS variables for theming, fast iteration |
| Layout | **react-resizable-panels** | Proven in UIGen for multi-pane resizable layouts |
| Database | **Prisma 6 + SQLite** | Zero-config local persistence, typed queries, migrations |
| RSS Parsing | **rss-parser** | Battle-tested RSS/Atom parser, handles edge cases |
| HTML Sanitization | **DOMPurify + jsdom** | Secure rendering of feed content (server-side sanitization) |
| Content Extraction | **@mozilla/readability** | Reader-mode extraction for full article content |
| Syntax Highlighting | **highlight.js** | Code block highlighting in article content (github-dark theme) |
| Date Handling | **date-fns** | Lightweight, tree-shakeable, relative time formatting |
| Testing | **Vitest + React Testing Library** | Fast, same setup as UIGen |
| Fonts | **Geist Sans + Geist Mono** (via next/font) | Clean, modern, optimized loading |

### Dependencies NOT Needed

- No AI SDK (no `@ai-sdk/anthropic`, no `ai` package)
- No `bcrypt` or `jose` (no auth)
- No `@babel/standalone` (no transpilation)
- No `@monaco-editor/react` (no code editing)
- No `cmdk` — command palette (Phase 2) was implemented without it

---

## Architecture Overview

```
User opens http://localhost:3000
  → Next.js App Router serves the SPA shell
  → Server Components fetch feed/article data from SQLite via Prisma
  → Client Components render three-pane layout
  → User clicks "Add Feed" → API route fetches + parses RSS → stores in SQLite
  → User clicks article → reading pane renders sanitized HTML
  → User actions (read/star/unread) → Server Actions update SQLite
```

### Data Flow

```
Feed URL input
  → POST /api/feeds (server-side fetch + parse)
  → Prisma → SQLite (feeds + articles tables)
  → Revalidation triggers UI update
  → Sidebar shows new feed with unread count
  → Article list shows latest articles
  → Click article → reading pane renders content
  → Read/star actions → Server Actions → SQLite update → UI refresh
```

### Key Architectural Decisions

1. **Server-side feed fetching**: RSS feeds are fetched via Next.js API routes, not client-side. This avoids CORS issues entirely and allows HTML sanitization before storage.

2. **Store full article content in SQLite**: Articles are fetched and stored with their full HTML content. This means reading is instant (no network request) and works offline for already-fetched content.

3. **Server Actions for mutations**: Mark-read, star, unstar, delete-feed operations use Next.js Server Actions for simple, type-safe mutations without manual API route boilerplate.

4. **No client-side state management library**: React Context for UI state (selected feed, selected article, panel sizes). Server state comes from Prisma via Server Components or Server Actions. No Redux, no Zustand, no TanStack Query needed at this scale.

5. **Optimistic UI for read/star**: Mark-read and star operations update the UI immediately and persist in the background via Server Actions.

---

## Database Schema

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Folder {
  id        String   @id @default(cuid())
  name      String
  position  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  feeds Feed[]
}

model Feed {
  id              String    @id @default(cuid())
  title           String
  url             String    @unique
  siteUrl         String?
  description     String?
  favicon         String?
  lastFetched     DateTime?
  errorCount      Int       @default(0)
  refreshInterval Int?      // minutes; null = use global default
  folderId        String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  folder   Folder?   @relation(fields: [folderId], references: [id], onDelete: SetNull)
  articles Article[]

  @@index([folderId])
}

model Article {
  id          String    @id @default(cuid())
  feedId      String
  guid        String
  title       String
  link        String
  content     String    @default("")
  summary     String?
  author      String?
  imageUrl    String?
  publishedAt DateTime
  isRead      Boolean   @default(false)
  readAt      DateTime?
  isStarred   Boolean   @default(false)
  createdAt   DateTime  @default(now())

  feed       Feed        @relation(fields: [feedId], references: [id], onDelete: Cascade)
  highlights Highlight[]

  @@unique([feedId, guid])
  @@index([feedId, publishedAt])
  @@index([isRead])
  @@index([readAt])
  @@index([isStarred])
}

model Setting {
  key   String @id
  value String
}

model Highlight {
  id         String   @id @default(cuid())
  articleId  String
  text       String
  textOffset Int
  note       String?
  createdAt  DateTime @default(now())

  article Article @relation(fields: [articleId], references: [id], onDelete: Cascade)

  @@index([articleId])
}
```

### Why SQLite + Prisma

- **Zero config**: No database server to install or manage. The DB is a single file.
- **Fast reads**: SQLite is extremely fast for the read-heavy workload of an RSS reader.
- **Typed queries**: Prisma generates TypeScript types from the schema.
- **Migrations**: `prisma migrate dev` handles schema evolution cleanly.
- **Portable**: The entire database is one file you can back up or move.

---

## Suggested Folder Structure

```
feed/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (dark mode class, fonts)
│   │   ├── page.tsx                # Main page — three-pane reader
│   │   ├── globals.css             # Tailwind + CSS variables + dark theme
│   │   ├── settings/
│   │   │   └── page.tsx            # Settings page (retention policy config)
│   │   └── api/
│   │       └── feeds/
│   │           └── route.ts        # POST: add feed, GET: refresh feeds
│   ├── actions/
│   │   ├── feeds.ts                # addFeed, deleteFeed, refreshFeed, refreshAll
│   │   ├── articles.ts             # markRead, markUnread, toggleStar, markAllRead
│   │   ├── folders.ts              # createFolder, renameFolder, deleteFolder, moveFeedToFolder
│   │   └── retention.ts            # getRetentionConfig, setRetentionConfig, previewRetention, pruneArticles
│   ├── components/
│   │   ├── layout/
│   │   │   └── AppShell.tsx        # Three-pane resizable layout
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx         # Feed list with unread counts
│   │   │   ├── FeedItem.tsx        # Single feed row in sidebar
│   │   │   └── AddFeedDialog.tsx   # Modal to add new feed
│   │   ├── articles/
│   │   │   ├── ArticleList.tsx     # Scrollable article list for selected feed
│   │   │   └── ArticleRow.tsx      # Single article row (title, date, read state)
│   │   ├── reader/
│   │   │   ├── ReadingPane.tsx     # Article content renderer
│   │   │   └── ArticleHeader.tsx   # Title, author, date, source link, star button
│   │   ├── settings/
│   │   │   └── RetentionSettings.tsx # Retention policy toggle, period, preview, prune
│   │   └── ui/                     # @base-ui/react wrappers
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── scroll-area.tsx
│   │       ├── separator.tsx
│   │       └── resizable.tsx
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── utils.ts                # cn() utility
│   │   ├── feed-parser.ts          # RSS/Atom fetch + parse + sanitize
│   │   ├── sanitize.ts             # DOMPurify HTML sanitization
│   │   ├── settings.ts             # Key-value settings helpers (get/set/getNumber/getBool)
│   │   ├── retention.ts            # Pure retention helpers (cutoffDate, retentionWhere)
│   │   └── constants.ts            # App-wide constants
│   └── hooks/
│       └── use-keyboard-shortcuts.ts
├── public/
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.mts
├── CLAUDE.md
└── PROJECT_BLUEPRINT.md            # This file
```

---

## UI/UX Direction

### Design Language: Dark-First Minimal

The app should feel like a premium reading tool. Think: low-contrast dark surfaces, generous whitespace, sharp typography, subtle borders, no visual noise.

**Color system (dark mode — primary):**
- Background: `oklch(0.13 0 0)` — near-black, not pure black
- Surface (cards, panels): `oklch(0.17 0 0)` — subtle elevation
- Surface elevated (popovers): `oklch(0.21 0 0)`
- Border: `oklch(1 0 0 / 8%)` — barely visible dividers
- Text primary: `oklch(0.93 0 0)` — off-white, easy on eyes
- Text secondary: `oklch(0.55 0 0)` — muted for metadata
- Accent: `oklch(0.65 0.15 250)` — muted blue for interactive elements
- Accent hover: `oklch(0.72 0.15 250)`
- Destructive: `oklch(0.65 0.2 25)` — muted red
- Star: `oklch(0.75 0.15 85)` — warm amber for starred items

**Color system (light mode — secondary):**
- Background: `oklch(0.985 0 0)`
- Surface: `oklch(1 0 0)` — pure white
- Border: `oklch(0.90 0 0)`
- Text primary: `oklch(0.15 0 0)`
- Text secondary: `oklch(0.45 0 0)`
- Accent: `oklch(0.50 0.18 250)`

### Typography

- **Body text (articles):** 16-18px, `line-height: 1.7`, Geist Sans. Aim for ~65-75 characters per line for comfortable reading.
- **UI text (sidebar, lists):** 13-14px, `line-height: 1.4`, tighter
- **Article titles in list:** 14-15px, `font-weight: 500`
- **Article title in reading pane:** 24-28px, `font-weight: 600`
- **Monospace (code blocks in articles):** Geist Mono, slightly smaller

### Interaction Style

- **Small, elegant controls:** Buttons are compact (`h-7` to `h-8`). Icons are `h-4 w-4`. Padding is tight but not cramped.
- **Hover states:** Subtle background shifts (`bg-white/5` on dark), not color changes. Transitions at 150ms.
- **Active/selected states:** Left border accent or subtle background highlight, not bold outlines.
- **Focus indicators:** Ring style matching shadcn defaults, visible but not aggressive.
- **Transitions:** `transition-colors duration-150` on interactive elements. No bouncing, no spring animations.
- **Empty states:** Centered icon + short message + action button. Friendly but not cute.

### Layout Patterns

**Three-pane layout (default):**
```
┌──────────────┬────────────────────┬──────────────────────────┐
│   Sidebar    │   Article List     │   Reading Pane           │
│   (feeds)    │   (titles+dates)   │   (full article)         │
│              │                    │                          │
│  default 28% │   default 30%      │   default 50%            │
│  min: 200px  │   min: 250px       │   min: 400px             │
│  max: 38%    │                    │                          │
└──────────────┴────────────────────┴──────────────────────────┘
```

- Sidebar shows: All Articles (count), Starred (count), separator, then feed list with per-feed unread counts
- Article list shows: title, feed name, relative date, read/unread indicator (bold vs normal weight)
- Reading pane shows: article header (title, author, date, source link, star button) then scrollable sanitized HTML content

**Sidebar item style:**
```
[favicon] Feed Name                    (12)
```
Favicon is 16x16, unread count is a small muted badge on the right. Selected feed has a subtle left border accent or background highlight.

**Article row style:**
```
Article Title That Might Be Long and...
Feed Name · 2h ago
```
Unread articles: `font-weight: 500`, white text. Read articles: `font-weight: 400`, muted text. Starred indicator: small amber dot.

### Keyboard Shortcuts (MVP)

| Key | Action |
|---|---|
| `j` / `↓` | Next article |
| `k` / `↑` | Previous article |
| `Enter` / `o` | Open article in reading pane |
| `s` | Toggle star |
| `m` | Toggle read/unread |
| `r` | Refresh current feed |
| `R` (shift+r) | Refresh all feeds |
| `a` | Add new feed (opens dialog) |

---

## LLM Options — Honest Assessment

### v1 Recommendation: No LLM

The core product is a reading experience. LLMs add zero value to subscribing, reading, starring, or organizing feeds. Every LLM integration adds setup friction, latency, and failure modes. Ship v1 without any LLM dependency.

### Deterministic Alternatives Used Instead

| Feature | Approach | Why it's better than LLM for v1 |
|---|---|---|
| Reading time | `wordCount / 200` WPM | Instant, deterministic, no API call |
| Content extraction | `@extractus/article-extractor` or DOM heuristics | Reliable, fast, well-tested |
| Search | SQLite FTS5 full-text search | Instant, local, zero setup |
| Categorization | Folder-based manual organization | User has full control |
| Excerpts | First 200 chars of stripped HTML | Simple, fast, predictable |

### Future AI Enhancements (Phase 4+, Optional)

When the core product is solid, AI features can be added as opt-in:

1. **Ollama integration** — Article summarization via local model. User installs Ollama + a small model (e.g., Llama 3.2 3B). Summaries generated on demand, cached in SQLite. Feasible but adds setup complexity and requires decent hardware.

2. **User-provided API key** — Support pasting an OpenAI/Anthropic key in settings. Enables cloud-quality summarization, semantic search, smart digests. User pays their own API costs. Clean opt-in, no free-tier fragility.

3. **Rule-based "smart" features** — Keyword highlighting, duplicate detection, reading pattern stats. No LLM needed, deterministic, reliable.

**What to avoid:**
- Free hosted inference (Hugging Face, etc.) — too unreliable and rate-limited for a reading app that processes many articles
- Bundling a model with the app — too large, too slow, too complex
- Making any LLM feature load-bearing in the core UX

---

## Non-Negotiable Constraints

1. **Zero external API keys required** — The app must work out of the box after `npm run setup && npm run dev`
2. **SQLite only** — No PostgreSQL, no MongoDB, no cloud databases
3. **No authentication** — Single-user local app, no sign-up/sign-in
4. **No paid services** — No subscription APIs, no cloud infrastructure
5. **Dark mode by default** — Light mode is secondary, dark is the primary experience
6. **Runs on localhost** — No deployment target, no Docker, no cloud hosting in v1
7. **One-command setup** — `npm run setup` must handle everything (install, generate, migrate)
8. **Sanitized HTML rendering** — All feed content must be sanitized with DOMPurify before rendering. No raw HTML injection.
9. **Server-side feed fetching** — Never fetch RSS from the client (CORS, security)
10. **Keyboard-navigable** — Core read/navigate/star actions must work without a mouse

## Anti-Goals

These are things we are **intentionally avoiding**:

1. **Auth in v1** — No users, no sessions, no passwords. Single-user local app.
2. **Cloud deployment complexity** — No Vercel, no AWS, no Docker. Localhost only.
3. **Paid AI dependencies** — No API keys required. No Anthropic, no OpenAI in the default experience.
4. **Multi-user collaboration** — One person, one machine. No sharing, no teams.
5. **Complex agent systems** — No autonomous AI agents, no multi-step AI workflows.
6. **Unreliable free inference as a core dependency** — No Hugging Face hosted inference, no free-tier rate-limited services in the critical path.
7. **Building too many features before the MVP is solid** — Phase 1 is subscribe + read + mark read + star. Nothing else until that's polished.
8. **Premature optimization** — No caching layers, no background workers, no WebSocket subscriptions. SQLite reads are fast enough.
9. **Mobile-first design** — Desktop reading experience first. Responsive is Phase 3.
10. **Feature parity with Feedly/Inoreader** — This is a focused local reader, not a social feed aggregator.
11. **RSS feed generation or publishing** — This is a reader, not a publisher.
12. **Browser extension** — Keep the scope to the web app.

---

## Implementation Phases

### Phase 1 — Core MVP (Start Here)

**Goal:** Subscribe to feeds, read articles, mark read, star favorites.

- [x] Project scaffolding (Next.js 15, TypeScript, Tailwind v4, Prisma + SQLite)
- [x] Database schema (Feed, Article models)
- [x] `npm run setup` script (install + prisma generate + prisma migrate deploy)
- [x] Feed parser service (fetch URL → parse RSS/Atom → return structured data)
- [x] API route: `POST /api/feeds` — add a new feed (fetch, parse, store)
- [x] Server actions: `refreshFeed`, `refreshAllFeeds`
- [x] Server actions: `markRead`, `markUnread`, `toggleStar`, `markAllRead`
- [x] Dark-mode-first CSS variables and global styles
- [x] Three-pane resizable layout shell (`AppShell.tsx`)
- [x] Sidebar component with feed list and unread counts
- [x] Article list component (title, feed name, date, read state)
- [x] Reading pane with sanitized HTML rendering
- [x] Add Feed dialog (URL input → auto-discover → save)
- [x] Delete feed (with confirmation)
- [x] Keyboard shortcuts (j/k/s/m/r/o/Enter)
- [x] Empty states for all panes
- [x] CLAUDE.md for the new repo
- [ ] Dark/light mode toggle — deferred, dark mode is default and sufficient

### Phase 2 — Organization & Search

- [x] Feed folders / categories (group feeds; rename/delete; move via Feed Settings)
- [x] OPML import and export
- [x] Full-text search via SQLite FTS5
- [x] Command palette (Cmd/Ctrl+K) for quick navigation
- [x] Auto-refresh on configurable interval (per-feed with 60-min default)
- [x] Mark all as read (per feed or across current view)
- [x] Article date range filters (today / week / month / all)
- [x] Feed settings (custom name, refresh interval)
- [x] Feed error handling UI (inline error indicator + retry button)

### Phase 3 — Reading Experience

- [x] Content extraction / reader mode (Mozilla Readability, lazy + cached per article)
- [x] Reading time estimates (shown when content is complete; hidden for truncated RSS excerpts — full-content backfill tracked in Open Proposals)
- [x] Article typography settings (font size, line height, width)
- [x] Image proxy for broken/blocked images (/api/image-proxy + sanitize rewrite)
- [x] Code block syntax highlighting in articles (highlight.js, github-dark)
- [x] "Open in browser" action (existed from Phase 1, keyboard shortcut o/Enter added)
- [x] Mobile-responsive layout (stacked single-pane below md breakpoint)
- [x] Swipe gestures on mobile (left = next article, right = back to list)

### Phase 4 — Intelligence (Optional AI)

- [ ] Ollama integration for article summarization (opt-in)
- [ ] User-provided API key support (OpenAI/Anthropic) for cloud-quality AI
- [ ] Smart digest: daily/weekly summary of top articles
- [ ] Semantic search (vector embeddings of articles)
- [ ] Auto-categorization suggestions
- [ ] Duplicate/similar article detection

### Phase 5 — Power User

- [ ] Multiple view modes (three-pane, two-pane, card grid)
- [ ] Theme customization (accent colors, reader background)
- [x] Article annotations / highlights
- [x] Export starred articles (Markdown, JSON)
- [x] Feed health dashboard (uptime, error rate, frequency)
- [x] Statistics (articles read per day/week, reading time)
- [x] Settings page with key-value config (Setting model)
- [x] Retention policy — automatic pruning of old read articles (configurable period, preserves starred/highlighted/unread, auto-prunes during refresh cycle)
- [x] Data backup and restore (JSON export/import via Settings; full round-trip: folders, feeds, articles, highlights, settings)

---

## Milestone Plan

| Milestone | Target | Deliverable |
|---|---|---|
| **M1: Skeleton** ✓ | End of first session | Project scaffolded, DB schema, one-command setup works, dev server runs with empty three-pane layout |
| **M2: Feed Ingestion** ✓ | +1 session | Can add a feed URL, fetch articles, see them in the article list |
| **M3: Reading** ✓ | +1 session | Click an article → see rendered content in reading pane, mark-read on open |
| **M4: Core Interactions** ✓ | +1 session | Star/unstar, mark read/unread, keyboard shortcuts, unread counts |
| **M5: Polish** ✓ | +1 session | Empty states, error handling, loading states, visual polish pass |
| **M6: MVP Complete** ✓ | +1 session | Add/delete feeds, full reading flow, keyboard nav, dark mode polished (light toggle deferred) |

---

## Development Principles & Guardrails

### Code Style
- TypeScript strict mode
- Server Components by default, `"use client"` only when needed (interactivity, hooks)
- Prefer Server Actions over API routes for mutations
- Use API routes for complex operations (feed fetching/parsing) that need server-side libraries
- `cn()` utility for conditional class merging (clsx + tailwind-merge)
- Named exports, not default exports (except page.tsx as required by Next.js)

### Component Patterns
- Small, focused components (one file = one component)
- Props interfaces defined in the same file
- UI components in `components/ui/` (@base-ui/react wrappers)
- Feature components in `components/{feature}/`
- No prop drilling beyond 2 levels — use Context or Server Components

### Data Patterns
- Prisma client singleton in `lib/prisma.ts`
- Server Actions for all mutations (mark read, star, add feed)
- Server Components for initial data fetching
- Optimistic updates on the client for read/star (update UI immediately, persist async)

### Testing
- Vitest + React Testing Library
- Test business logic (feed parser, sanitizer) in node environment
- Test components in jsdom environment
- Focus tests on behavior, not implementation

### Security
- Sanitize ALL feed HTML content with DOMPurify before rendering
- Never use `dangerouslySetInnerHTML` without prior sanitization
- Server-side feed fetching only (no client-side fetch of external URLs)
- Validate feed URLs server-side before fetching

### Performance
- SQLite indexes on frequently queried columns (feedId, publishedAt, isRead, isStarred)
- Don't fetch all articles at once — paginate or limit to recent N per feed
- Lazy-load article content (fetch on click, not on list render)
- Use `React.memo` sparingly and only when profiling shows a bottleneck

---

## Future Enhancements

Beyond the phased roadmap, these are ideas worth considering once the product is mature:

- **Feed bundling**: Group related feeds (e.g., "Tech", "News") and show a merged timeline
- **Readability scoring**: Simple heuristic to flag long vs short articles
- **Newsletter support**: Accept email newsletters via a local SMTP endpoint
- **Theme marketplace**: User-created reading themes (Solarized, Nord, etc.)
- **Podcast support**: Audio feed entries with an inline player
- **API for external tools**: Local REST API so scripts/automations can interact with Feed
- **Cross-device sync**: Optional, via user-managed file sync (Dropbox, Syncthing) of the SQLite file
- **Progressive Web App**: Add PWA manifest for app-like experience

### Additional Feature Ideas (Candidate Backlog)

Reading workflow:
- **Read-later / queue** distinct from unread — snooze-style "save for weekend"
- **Rules engine** — per-feed keyword include/exclude, auto-star on match, auto-mark-read on match (kills repetitive "sponsored" items)
- **Tags** on articles (user-applied), with a tag sidebar
- **Notes overview page** — browse all highlights/notes across all articles, searchable
- **Focus timer / reading session** — pomodoro-style, pairs with existing stats page

Feed management:
- **Paused feeds** — keep subscribed, stop fetching (vacation, noisy feed)
- **Feed discovery bookmarklet** — open Feed with the current site's feed pre-filled (lighter than a browser extension)
- **Bulk feed actions** — multi-select in sidebar for move / delete / pause
- **Import-time dedupe** — detect duplicates when importing OPML

Content quality:
- **Offline mode** — explicitly download full article + images for selected feeds (starred feeds, commute reading)
- **Clean tracking params** in article URLs on export/share (utm_*, fbclid)
- **Markdown export** of a single article (copy or download)
- **Share-as-image** — screenshot of a highlighted passage

Non-RSS sources (scope creep, but users ask for them):
- **Newsletter inbox** — local SMTP receiver or Kill-the-Newsletter bridge, ingest newsletters as feeds
- **Bridge-driven feeds** — YouTube, Reddit, GitHub releases via RSS bridges with first-class UI

---

## Open Proposals

Concrete proposals to evaluate when the relevant phase is active. Each one captures the *why* and the trade-offs so the decision is easy to pick up later.

### Reading time — full-content backfill (follow-up to Phase 3)

**Status:** Partial fix shipped. Reading time is hidden when RSS content is truncated or below 150 words. Most feeds deliver excerpts, so the badge is missing from most articles today.

**Proposal:** Persist a `wordCount Int?` column on `Article`. Populate it during ingestion using the reader-mode extractor (Mozilla Readability) when the stored content looks truncated. Show the estimate everywhere once the column is non-null.

**Trade-offs:**
- Pro: accurate reading time on the list view and header, no runtime recompute cost.
- Pro: groundwork for a future "long/short" filter.
- Con: reader extraction per article at ingest time is network + CPU overhead; must be throttled and failure-tolerant.
- Con: migration touches existing rows; backfill pass needed.

### ~~Retention policy~~ — shipped (see Phase 5)

Default is **off** (not on as originally proposed) to avoid destructive-by-default behavior. Configurable period, dry-run preview, auto-prune during refresh cycle with 23-hour cooldown.

### Background refresher — closing the "app was closed for a week" gap

**Problem:** RSS feeds expose only their last N items. If the browser tab is closed for a week, nothing is polling; when the tab reopens, any articles the publisher has since rotated out of the XML are unrecoverable. This is intrinsic to RSS, not a bug — but the gap can be shrunk dramatically.

#### Execution model

Three layers, ordered smallest-gap to largest. Each is useful on its own.

1. **Interval while app is open (shipped in Phase 2).** `useAutoRefresh` polls `refreshDueFeeds` every 60s while the tab is mounted; the server filters to feeds that are actually due based on per-feed `refreshInterval`. Closes the "long reading session" freshness gap.
2. **On focus / on app open (proposed).** When the tab becomes visible after being idle for more than N minutes, trigger `refreshDueFeeds` once immediately instead of waiting for the next poll tick. Zero extra background cost. Closes the "just opened the app after lunch" gap.
3. **Out-of-process refresher (proposed, opt-in).** For the "closed for a week" case only — needs something running when the app isn't. Options in increasing footprint:
   - **OS cron / systemd timer** — a small script hitting `refreshDueFeeds` hourly. Zero infra, user-installed, documented in `README.md`.
   - **Long-running Node process** — `npm run daemon` that stays up and polls on per-feed intervals. Same process model as `npm run dev` but headless.
   - **Electron-style wrapper** — ships Feed as a menu-bar app so the refresher lives with the user's session. Largest change, best UX.

#### Settings (user control)

Expose in a Settings panel — single-user app, but people still want control over network activity. Defaults chosen to be polite and low-surprise.

| Setting | Default | Notes |
|---|---|---|
| Auto-refresh on focus | On | The main "does the app feel alive" knob. |
| Auto-refresh interval (while open) | 30 min | Choices: off / 15m / 30m / 1h / 6h. "Off" means manual-only. |
| Per-feed override | Inherit | Some feeds update hourly, others weekly — let power users set it. Stored on `Feed`. |
| Out-of-process refresher | Off | Opt-in, with a setup note pointing at the cron/daemon recipe. |

A visible "Last refreshed" timestamp and a manual **Refresh all** button are non-negotiable — users should always be able to verify what happened and force a run.

#### Politeness

Feed servers often blocklist clients that poll blindly. The refresher must:

- Send `If-None-Match` (ETag) and `If-Modified-Since` headers when we have them, and store the values from each response. A `304 Not Modified` is the happy path.
- Respect `Cache-Control: max-age` and `Retry-After` — never poll a feed more often than it asks.
- Stagger requests (jittered, a few in flight at a time) instead of a synchronous burst across all feeds.
- Back off on repeated 4xx/5xx: a feed that 403s three times in a row shouldn't be hit every cycle.

These aren't optional — a naive refresher will get the user rate-limited within a day.

#### UI affordance

Show "Last fetched N days ago — some articles from this period may be unavailable" per feed when the gap exceeds a threshold. Honest signalling beats silent loss.

**Explicitly rejected:** any paid/hosted archiver. Would violate the "no cloud, no accounts" constraint. Users who want deep history can integrate their own third-party account (Feedbin, Inoreader) via a later user-provided-key hook.

