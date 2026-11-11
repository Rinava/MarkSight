# Changelog

All notable changes to MarkSight are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Everything before this file existed was reconstructed from git history.

## [Unreleased]

### Added

- Error boundary: a runtime error now shows a recovery page instead of a
  blank screen
- Placeholder text in the empty markdown editor
- Copy button on code blocks in the preview
- Custom file name for HTML, PDF and Markdown exports
- Skip-to-content link for keyboard users
- Skill inspector shows quality hints (generic description, very long body,
  no instruction-shaped sections) as warnings next to the validation checks
- Images in the preview load lazily
- `NEXT_PUBLIC_GA_ID`: Google Analytics is now opt-in per deployment, so forks
  and self-hosted copies no longer report to the upstream property
- Rate limiting on the public API routes (`/api/mcp`, `/api/skill/improve`)
  with an optional shared Upstash Redis store, plus a request size cap on the
  MCP endpoint
- `npm run typecheck`, and a jsdom test project so hooks and components can be
  tested (`*.test.tsx`)
- README: keyboard-shortcuts table and editor screenshots

### Changed

- MCP route migrated to `mcp-handler` 2.x. The endpoint is still `/api/mcp`;
  the legacy SSE transport is gone
- Node 22 is now the minimum (matches `.nvmrc` and CI)
- The toolbar's formatting logic lives in `src/lib/markdown/format.ts` with
  unit tests
- Code base formatted with Prettier, checked in CI

### Fixed

- Decorative logo icon hidden from the accessibility tree
- GitHub brand icon replaced with a local SVG (lucide dropped brand icons)
- Toolbar tooltips show `Ctrl` shortcuts on Windows and Linux instead of `⌘`
- Toggling a format off from the toolbar no longer throws the caret to the
  wrong place
- Clear message when the browser blocks the export or print popup
- Error toast when copying a code block fails
- External links in the preview open in a new tab
- Theme toggle has an accurate accessible label
- Sitemap `lastmod` no longer changes on every deploy

### Security

- Zip imports are capped in file count and size
- `/api/skill/improve` rejects requests without an `Origin` header
- CSP `script-src` no longer carries the `'unsafe-inline'` / `https:` fallback
  for legacy browsers
- Exported HTML is confirmed sanitized (raw HTML, event handlers and
  `javascript:` links are stripped) and now covered by tests

### Removed

- Unused second export pipeline (`src/lib/export-markdown.tsx`) and the
  unreachable toolbar mode inside the editor component

### Dependencies

- `ai` 6 → 7, `zod` 3 → 4, `typescript` 5.9 → 6.0, `lucide-react` 0.544 → 1.23,
  plus grouped minor/patch updates
- `next` 16.3 → 16.4, `mcp-handler` 1 → 2 (drops `@modelcontextprotocol/sdk`
  for `@modelcontextprotocol/server`), and every other dependency refreshed
  within its range

## [1.0.0] - 2026-07-06

The 1.0. What started as a markdown editor became a tool that turns any
document into an installable Claude Agent Skill, plus an MCP server that
Claude can call directly.

### Added

- Skill Creator: export any document as an [Agent Skill](https://code.claude.com/docs/en/skills)
  (⌘⇧K). One click downloads a validated `.skill` bundle, and an optional
  sidebar panel lets you edit the name and trigger description inline
- Skill import: open a `.skill`/`.zip` bundle or `SKILL.md`, or import
  straight from GitHub-hosted marketplaces (e.g. `anthropics/skills`), edit,
  and re-export with bundled files preserved
- Knowledge mode, quality hints, and a starter template for skills
- MCP server at `/api/mcp` (streamable HTTP) exposing `create_skill`,
  `validate_skill`, `markdown_to_html`, `document_outline`, and
  `document_metrics`, plus a project-scoped `.mcp.json` and an MCP registry
  `server.json`
- AI refinement of skill name and trigger description via Vercel AI
  Gateway (gated behind backend credentials), with a free-tier path using a
  direct Google Gemini API key
- Mermaid diagrams: fenced `mermaid` blocks render as live SVG in the
  preview and in exports, themeable per diagram
- Re-architected PDF/HTML export with unified rendering and reliable print
- Download button for the raw Markdown source ([#34](https://github.com/Rinava/MarkSight/pull/34))
- Word and character count in the editor footer
- Markdown guide overlay reachable from the toolbar
- About page with FAQ schema, community links, and credits
- Live GitHub contributors shown on the About page and workspace footer
- Custom 404 page
- `llms.txt` for AI-assistant discoverability

### Changed

- Upgraded to Next.js 16
- Reset/Clear moved into the toolbar; refreshed button styles
- Skill draft logic factored into a tested pure module
- README restructured around the Skill/MCP workflow

### Fixed

- Keyboard shortcuts scoped to the focused editor
- Outline sidebar staying attached at wide viewports
- PDF print triggered from the opener window (the previous injected script was
  blocked by CSP)
- Markdown metrics counts aligned between footer and MCP tools
- Export actions wrapped in error handling with user-facing feedback
- Load-time layout shift eliminated and client bundle size reduced
- Correctness, accessibility, and SEO/social metadata fixes across the app
- Hydration and react-hooks issues from the Next.js 16 upgrade

### Security

- Content-Security-Policy and security headers added (`src/proxy.ts`)
- Next.js bumped past a critical CVE; `postcss` floored at ≥ 8.5.10
  (Dependabot alert #33)
- API input validation and rate limiting hardened

### Infrastructure

- Contributor infrastructure: CI workflow, issue/PR templates, CONTRIBUTING,
  SECURITY, and Code of Conduct ([#10](https://github.com/Rinava/MarkSight/pull/10))
- Unit tests (Vitest) run in CI before the build

## [0.1.0] - 2025-10-02

The original release: the editor built to end the write-preview-write-preview
tab dance of editing Markdown on GitHub. Everything runs in the browser.

### Added

- CodeMirror editor with instantly rendered live preview (GitHub-flavored
  markdown via `remark-gfm`)
- Smart formatting toolbar and keyboard shortcuts (bold, italic,
  strikethrough, links, code, headings, lists)
- Document outline sidebar with clickable heading navigation
- Reset/Clear with undo via toast notifications
- Light/dark theme, system-aware and persisted
- Automatic document persistence to `localStorage`, so nothing leaves the browser
- Syntax highlighting for fenced code blocks
- Open Graph/Twitter metadata, web manifest, robots.txt, structured data, and
  favicon
- Vercel Analytics and Google Analytics (via `@next/third-parties`)
- Responsive layout and mobile improvements

[Unreleased]: https://github.com/Rinava/MarkSight/compare/29b9c56...HEAD
[1.0.0]: https://github.com/Rinava/MarkSight/compare/1eeefbb...29b9c56
[0.1.0]: https://github.com/Rinava/MarkSight/commits/1eeefbb
