# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup       # First-time: install deps, generate Prisma client, run migrations
npm run dev         # Dev server with Turbopack on http://localhost:3000
npm run build       # Production build
npm run lint        # ESLint
npm run test        # Vitest test suite
npm run test:watch  # Vitest in watch mode
npx vitest run path/to/test.ts  # Run a single test file
npx prisma studio   # Browse database in GUI
npx prisma migrate dev --name <name>  # Create a new migration after schema changes
```

## Architecture

Feed is a local-first RSS/Atom reader. No auth, no cloud, no API keys. SQLite stores everything. Single-user, localhost only.

### Data Flow

```
Add feed URL -> POST /api/feeds -> server-side fetch RSS -> parse XML -> sanitize HTML -> store in SQLite
Read articles -> Server Components query Prisma -> render three-pane layout
Single article -> GET /api/articles/[id] -> full content for reading pane
Mutations (mark read/star) -> Server Actions -> update SQLite -> optimistic UI update
```

### Key Directories

- `src/app/` — Pages and API routes (App Router)
- `src/actions/` — Server Actions for mutations (feeds.ts, articles.ts)
- `src/components/` — React components organized by feature (layout/, sidebar/, articles/, reader/, ui/)
- `src/lib/` — Business logic (feed-parser, sanitize, prisma singleton, utils)
- `src/hooks/` — Custom React hooks (keyboard shortcuts)
- `prisma/` — Schema and migrations

### Tech Stack

- Next.js 15 (App Router), React 19, TypeScript 5 (strict mode)
- Tailwind CSS v4, shadcn/ui (New York style), Lucide icons
- react-resizable-panels for three-pane layout
- Prisma 6 + SQLite (single file DB at prisma/dev.db)
- rss-parser for RSS/Atom parsing, dompurify + jsdom for server-side HTML sanitization
- date-fns for date formatting
- Vitest + React Testing Library

### Key Architectural Decisions

- **Server Components by default** — only add `"use client"` when interactivity or hooks are needed
- **Server Actions for mutations** — prefer over API routes; API routes are for complex operations like feed fetching/parsing
- **Server-side feed fetching only** — never fetch RSS from client (CORS/security)
- **Full article content stored in SQLite** — reading is instant, no network request needed
- **No client state management library** — React Context for UI state, Server Components for data
- **All feed HTML sanitized with DOMPurify before rendering** — never use `dangerouslySetInnerHTML` without prior sanitization

### Design

Dark-mode-first. CSS variables use oklch color space. See `globals.css` for the full token system. Light mode is secondary.

Three-pane resizable layout: sidebar (feeds, 240-280px) | article list (300-400px) | reading pane (remaining).

## Hooks

PostToolUse hooks run automatically after every file edit:
- **Prettier** — auto-formats the changed file (no need to format manually)
- **TypeScript type checker** — runs `tsc` and reports errors immediately

## Code Conventions

- Named exports (not default), except `page.tsx` as required by Next.js
- `cn()` utility (clsx + tailwind-merge) for conditional classes
- Props interfaces defined in the same file as the component
- No prop drilling beyond 2 levels — use Context or Server Components
- Prisma client singleton in `lib/prisma.ts` — import from `@/generated/prisma` (custom output path)

## Git Workflow

### Branching Strategy

Always work on a dedicated branch — never commit directly to `main`.

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New functionality | `feature/add-feed-dialog` |
| `fix/` | Bug fixes | `fix/unread-count-off-by-one` |
| `hotfix/` | Urgent production fixes | `hotfix/crash-on-empty-feed` |
| `refactor/` | Code improvements (no behavior change) | `refactor/extract-feed-parser` |
| `chore/` | Tooling, config, deps | `chore/update-prisma-6` |

Merge to `main` when the branch work is complete and verified. Use `--no-ff` merges to preserve branch history.

### Commit Practices

- **Commit early, commit often** — each commit should represent one logical change
- **Stage and commit after each meaningful step** — don't batch unrelated changes
- Keep commits small and focused: separate new features, bug fixes, refactors, and config changes
- Write descriptive messages in imperative mood: "Add feed parser" not "Added feed parser"
- Format: short summary line (≤72 chars), blank line, optional body explaining *why*
- Never commit generated files (node_modules/, .next/, prisma/dev.db), secrets, or build artifacts

### Typical Flow

```bash
git checkout -b feature/my-feature    # Branch from main
# ... work and commit incrementally ...
git checkout main
git merge --no-ff feature/my-feature  # Merge when complete
git push
git branch -d feature/my-feature      # Clean up local branch
```

## Reference

See `PROJECT_BLUEPRINT.md` for full specification: phased roadmap, detailed design tokens, database schema, keyboard shortcuts, and UI/UX direction.
