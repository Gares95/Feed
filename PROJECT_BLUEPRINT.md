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
10. **Dark mode by default** — with light mode toggle

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
| UI Components | **shadcn/ui** (New York style) | Pre-built accessible components, easy to customize, Radix primitives underneath |
| Icons | **Lucide React** | Clean, consistent, tree-shakeable |
| Styling | **Tailwind CSS v4** | Utility-first, CSS variables for theming, fast iteration |
| Layout | **react-resizable-panels** | Proven in UIGen for multi-pane resizable layouts |
| Database | **Prisma 6 + SQLite** | Zero-config local persistence, typed queries, migrations |
| RSS Parsing | **rss-parser** | Battle-tested RSS/Atom parser, handles edge cases |
| HTML Sanitization | **DOMPurify + jsdom** | Secure rendering of feed content (server-side sanitization) |
| Date Handling | **date-fns** | Lightweight, tree-shakeable, relative time formatting |
| Testing | **Vitest + React Testing Library** | Fast, same setup as UIGen |
| Fonts | **Geist Sans + Geist Mono** (via next/font) | Clean, modern, optimized loading |

### Dependencies NOT Needed

- No AI SDK (no `@ai-sdk/anthropic`, no `ai` package)
- No `bcrypt` or `jose` (no auth)
- No `@babel/standalone` (no transpilation)
- No `@monaco-editor/react` (no code editing)
- No `cmdk` in MVP (add in Phase 2 for command palette)

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

model Feed {
  id          String    @id @default(cuid())
  title       String
  url         String    @unique  // The RSS/Atom feed URL
  siteUrl     String?             // The website URL
  description String?
  favicon     String?             // Favicon URL or data URI
  lastFetched DateTime?
  errorCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  articles    Article[]
}

model Article {
  id          String    @id @default(cuid())
  feedId      String
  guid        String                // Unique ID from the feed (link or guid element)
  title       String
  link        String                // Original article URL
  content     String    @default("") // Sanitized HTML content
  summary     String?               // Short excerpt
  author      String?
  imageUrl    String?               // og:image or first image
  publishedAt DateTime
  isRead      Boolean   @default(false)
  isStarred   Boolean   @default(false)
  createdAt   DateTime  @default(now())

  feed        Feed      @relation(fields: [feedId], references: [id], onDelete: Cascade)

  @@unique([feedId, guid])
  @@index([feedId, publishedAt])
  @@index([isRead])
  @@index([isStarred])
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
│   │   └── api/
│   │       └── feeds/
│   │           └── route.ts        # POST: add feed, GET: refresh feeds
│   ├── actions/
│   │   ├── feeds.ts                # addFeed, deleteFeed, refreshFeed, refreshAll
│   │   └── articles.ts             # markRead, markUnread, toggleStar, markAllRead
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
│   │   └── ui/                     # shadcn/ui components
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
│  240-280px   │    300-400px       │   remaining space        │
│  min: 200    │    min: 250        │   min: 400               │
│  collapsible │                    │                          │
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
- [x] `npm run setup` script (install + prisma generate + prisma migrate dev)
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
- [ ] Keyboard shortcuts (j/k/s/m/r) — deferred, not needed for MVP
- [x] Empty states for all panes
- [x] CLAUDE.md for the new repo
- [ ] Dark/light mode toggle — deferred, dark mode is default and sufficient

### Phase 2 — Organization & Search

- [ ] Feed folders / categories (drag feeds into folders)
- [x] OPML import and export
- [x] Full-text search via SQLite FTS5
- [ ] Command palette (`cmdk`) for quick navigation
- [ ] Auto-refresh on configurable interval (per-feed or global)
- [ ] Mark all as read (per feed, per folder, all)
- [ ] Article date range filters
- [ ] Feed settings (custom name, refresh interval)
- [ ] Feed error handling UI (show fetch failures, retry)

### Phase 3 — Reading Experience

- [ ] Content extraction / reader mode (strip ads, nav, extract article body)
- [ ] Reading time estimates
- [ ] Article typography settings (font size, line height, width)
- [ ] Image proxy for broken/blocked images
- [ ] Code block syntax highlighting in articles
- [ ] "Open in browser" action
- [ ] Mobile-responsive layout (collapsible sidebar, stacked panes)
- [ ] Swipe gestures on mobile

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
- [ ] Article annotations / highlights
- [ ] Export starred articles (Markdown, JSON)
- [ ] Feed health dashboard (uptime, error rate, frequency)
- [ ] Statistics (articles read per day/week, reading time)
- [ ] Data backup and restore

---

## Milestone Plan

| Milestone | Target | Deliverable |
|---|---|---|
| **M1: Skeleton** | End of first session | Project scaffolded, DB schema, one-command setup works, dev server runs with empty three-pane layout |
| **M2: Feed Ingestion** | +1 session | Can add a feed URL, fetch articles, see them in the article list |
| **M3: Reading** | +1 session | Click an article → see rendered content in reading pane, mark-read on open |
| **M4: Core Interactions** | +1 session | Star/unstar, mark read/unread, keyboard shortcuts, unread counts |
| **M5: Polish** | +1 session | Empty states, error handling, loading states, visual polish pass |
| **M6: MVP Complete** | +1 session | Add/delete feeds, full reading flow, keyboard nav, dark/light mode toggle |

---

## First Coding Task

**Start with the project skeleton and database:**

1. Initialize a new Next.js 15 project with TypeScript and Tailwind CSS v4
2. Install core dependencies (Prisma, shadcn/ui setup, Lucide, react-resizable-panels, rss-parser, dompurify, isomorphic-dompurify, date-fns)
3. Set up Prisma with SQLite and the Feed + Article schema
4. Create the `npm run setup` script
5. Set up the dark-mode-first CSS variable system
6. Build the three-pane `AppShell` layout with resizable panels
7. Create the CLAUDE.md for the new repo
8. Verify: `npm run setup && npm run dev` shows the empty three-pane layout at localhost:3000

### Exact Commands to Initialize

```bash
# Create project
npx create-next-app@latest feed --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack

cd feed

# Core dependencies
npm install prisma @prisma/client rss-parser isomorphic-dompurify date-fns react-resizable-panels lucide-react class-variance-authority clsx tailwind-merge

# Dev dependencies
npm install -D @types/dompurify vitest @vitejs/plugin-react @testing-library/react @testing-library/dom jsdom vite-tsconfig-paths tw-animate-css

# Initialize Prisma with SQLite
npx prisma init --datasource-provider sqlite

# Initialize shadcn/ui
npx shadcn@latest init
# When prompted: style = New York, base color = Neutral, CSS variables = yes

# Add shadcn components needed for MVP
npx shadcn@latest add button dialog input scroll-area separator

# Add resizable (may need manual copy if not in shadcn registry)
# If not available via CLI, copy from UIGen's src/components/ui/resizable.tsx

# Set up scripts in package.json:
# "setup": "npm install && npx prisma generate && npx prisma migrate dev"
# "dev": "next dev --turbopack"

# Create the schema, run migrations
npx prisma migrate dev --name init

# Verify
npm run dev
```

### Post-Init Checklist

- [ ] `npm run setup` works cleanly from a fresh clone
- [ ] `npm run dev` starts without errors
- [ ] Visiting `http://localhost:3000` shows the app
- [ ] Dark mode is the default appearance
- [ ] Three-pane layout is visible with resizable handles
- [ ] Prisma Studio works: `npx prisma studio`

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
- UI components in `components/ui/` (shadcn primitives)
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

---

## Prompt to Continue in the New Repo

Copy this into a new Claude Code session after creating the empty repository:

```
I'm starting a new project called Feed — a local-first RSS reader.

Read PROJECT_BLUEPRINT.md in this repo. It contains the complete specification, architecture, design system, and implementation plan.

Start with the first coding task described in the blueprint:
1. Set up the project skeleton (Next.js 15, TypeScript, Tailwind v4)
2. Install all dependencies listed in the blueprint
3. Set up Prisma with the Feed + Article schema
4. Create the npm run setup script
5. Build the dark-mode-first CSS variable system from the blueprint
6. Build the three-pane AppShell layout with resizable panels
7. Create the CLAUDE.md
8. Verify everything works: npm run setup && npm run dev should show the empty three-pane dark layout at localhost:3000

Follow the blueprint's tech stack, folder structure, and design tokens exactly. Dark mode is the default. Use the oklch color values specified in the blueprint.
```

---

## CLAUDE.md Template for the New Repo

Include this as `CLAUDE.md` in the new repository:

```markdown
# CLAUDE.md

## Commands

\`\`\`bash
npm run setup       # First-time: install deps, generate Prisma, run migrations
npm run dev         # Dev server with Turbopack on http://localhost:3000
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Vitest test suite
\`\`\`

Run a single test:
\`\`\`bash
npx vitest run src/lib/__tests__/feed-parser.test.ts
\`\`\`

## Architecture

Feed is a local RSS/Atom reader. No auth, no cloud, no API keys. SQLite stores everything.

### Data Flow

\`\`\`
Add feed URL → POST /api/feeds → fetch RSS → parse → sanitize → store in SQLite
Read articles → Server Components query Prisma → render three-pane layout
Mark read/star → Server Actions → update SQLite → optimistic UI update
\`\`\`

### Key Directories

- `src/app/` — Pages and API routes
- `src/actions/` — Server Actions (mutations)
- `src/components/` — React components (layout/, sidebar/, articles/, reader/, ui/)
- `src/lib/` — Business logic (feed-parser, sanitize, prisma, utils)
- `src/hooks/` — Custom React hooks
- `prisma/` — Schema and migrations

### Tech Stack

- Next.js 15 (App Router), React 19, TypeScript 5
- Tailwind CSS v4, shadcn/ui (New York), Lucide icons
- react-resizable-panels for three-pane layout
- Prisma 6 + SQLite
- rss-parser + DOMPurify for feed processing
- Vitest + React Testing Library

### Design

Dark-mode-first. CSS variables use oklch. See globals.css for the full token system.
```
