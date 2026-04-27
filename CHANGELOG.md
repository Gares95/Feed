# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-04-27

### Fixed

- `ScrollArea` Root no longer expands to its content height when used as a
  flex child. Added `min-h-0 min-w-0 overflow-hidden` to the Root so the
  flex item can shrink to the available track and the Viewport's
  `size-full` resolves to the constrained box. Without this, the article
  list, sidebar, and reader pane all expanded past the viewport on narrow
  layouts (mouse wheel did nothing because the Viewport's scrollable area
  was zero). Affected both mobile narrow viewports and the reader pane on
  desktop when content was tall enough to overflow.

## [1.0.1] - 2026-04-26

### Security

- Override transitive `postcss` inside `next` to `^8.5.10` to clear
  GHSA-qx2v-qp2m-jg93 (CSS stringify XSS, moderate). Real-world exploit
  surface in Feed is effectively zero — postcss only runs at build time on
  project source CSS, and feed content goes through DOMPurify, never postcss.
  The override keeps `npm audit` clean. `next@15.5.15` is the latest 15.x
  release and ships an unpatched postcss internally; `next@16.x` is a major
  upgrade with breaking changes that is intentionally deferred.

## [1.0.0] - 2026-04-25

First tagged release. Local-first RSS/Atom reader. No cloud, no telemetry,
no third-party requests beyond the feeds you subscribe to.

### Reader

- Three-pane resizable layout (sidebar / article list / reading pane).
- Full article content stored locally in SQLite for instant reads.
- Reader mode powered by Mozilla Readability for clean, distraction-free text.
- Per-article highlights with persistent storage.
- Image proxy to avoid mixed-content issues.
- Reading-time tracking and per-article view metrics.

### Organization

- Folders for grouping feeds.
- Star and read/unread state.
- Full-text search across all stored articles (SQLite FTS5).
- Custom date-range filter with calendar picker, plus presets (today / week / month).

### Feed management

- Add feeds by URL with autodiscovery.
- Per-feed refresh interval, rename, delete with confirmation.
- Feed health dashboard (`/health`) showing fetch errors and last-success times.
- OPML import / export.
- Backup / restore of the full database.
- Configurable retention policy to prune old articles.
- Reading statistics (`/stats`).
- Settings page (`/settings`) for retention and backup.

### Interface

- Dark-mode-first design built on Tailwind v4 and `@base-ui/react` primitives.
- Keyboard-driven command palette and shortcuts throughout.
- Sidebar accessibility: aria-labels on all icon-only controls; no nested
  interactive elements (Health / Stats / Settings render as styled `<Link>`).

### Privacy & security

- Localhost-only binding by default (`127.0.0.1`).
- All outbound HTTP through `lib/safe-fetch.ts` with SSRF protection
  (DNS resolution, RFC1918 / loopback / link-local / cloud-metadata blocking,
  per-redirect revalidation, response-size cap).
- All feed HTML sanitized server-side with DOMPurify before rendering.
- All anchors forced to `rel="noopener noreferrer nofollow"`.
- Upload routes (OPML, backup) cap body size before reading.
