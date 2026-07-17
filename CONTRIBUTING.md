# Contributing to MarkSight

Thanks for taking the time to contribute! 🎉 MarkSight is an open source
markdown editor, and contributions of every size are welcome, from fixing a
typo to building a new feature.

This guide explains how to get set up and how to land a change. If anything
here is unclear or out of date, that's a bug too: open an issue or PR.

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Project structure](#project-structure)
- [Coding guidelines](#coding-guidelines)
- [Commit messages](#commit-messages)
- [Opening a pull request](#opening-a-pull-request)
- [Reporting bugs & requesting features](#reporting-bugs--requesting-features)
- [Code of Conduct](#code-of-conduct)

## Ways to contribute

You don't have to write code to help:

- 🐛 **Report a bug** — open a [bug report](https://github.com/Rinava/MarkSight/issues/new?template=bug_report.md).
- 💡 **Suggest a feature** — open a [feature request](https://github.com/Rinava/MarkSight/issues/new?template=feature_request.md).
- 📖 **Improve the docs** — fix a typo, clarify a step, add an example.
- 🧹 **Pick up an issue** — look for issues labelled
  [`good first issue`](https://github.com/Rinava/MarkSight/issues?q=is%3Aopen+label%3A%22good+first+issue%22)
  or [`help wanted`](https://github.com/Rinava/MarkSight/issues?q=is%3Aopen+label%3A%22help+wanted%22).

If you're planning a larger change, please open an issue first so we can agree
on the approach before you invest time in it.

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 20 or newer (the project is
developed on Node 22) and npm (bundled with Node).

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/MarkSight.git
cd MarkSight

# 2. Install dependencies
npm install

# 3. Start the dev server at http://localhost:3000
npm run dev
```

That's it. Edit a file under `src/` and the page hot-reloads.

### Available scripts

| Command         | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the dev server with Turbopack   |
| `npm run build` | Production build                      |
| `npm run start` | Serve the production build            |
| `npm run lint`  | Run ESLint                            |
| `npm test`      | Run the unit tests (Vitest)           |

Brand assets (icons, social images) are generated from inline SVG:

```bash
node scripts/generate-assets.mjs
```

## Development workflow

1. Create a branch off `main` with a descriptive, prefixed name:

   ```bash
   git checkout -b fix/preview-scroll-jump
   # or feat/…, docs/…, perf/…, refactor/…, chore/…
   ```

2. Make your change in small, focused commits.
3. Before pushing, make sure the project still lints, tests, and builds cleanly:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

4. Push to your fork and [open a pull request](#opening-a-pull-request).

## Project structure

```
src/
├── app/              # App Router entry (layout, page, metadata, route assets)
│   └── api/          # route handlers (MCP server, AI skill improvement)
├── components/       # UI components (editor, preview, toolbar, sidebar, …)
│   └── ui/           # shadcn/ui primitives — avoid hand-editing; re-add via the CLI
├── contexts/         # React context providers
├── hooks/            # custom hooks
├── lib/              # utilities (slugify, local storage, syntax highlighter, …)
└── proxy.ts          # security headers / CSP
```

## Coding guidelines

- **Language:** TypeScript and React 19 (App Router). Prefer Server Components;
  add `"use client"` only when a component needs interactivity or browser APIs.
- **Styling:** Tailwind CSS v4 utility classes and the
  [shadcn/ui](https://ui.shadcn.com/) primitives in `src/components/ui`. Add new
  primitives with the shadcn CLI rather than copying files by hand.
- **Formatting:** an [`.editorconfig`](./.editorconfig) defines the basics
  (2-space indent, LF line endings). Keep the diff small: match the style of
  the surrounding code and let ESLint guide you.
- **Linting:** `npm run lint` must pass with no errors. Fix warnings you
  introduce.
- **Accessibility:** keep it keyboard-navigable and screen-reader friendly.
  Label interactive controls, preserve focus order, and don't remove focus
  outlines.
- **Dependencies:** avoid adding a dependency for something small. If a new
  package is genuinely needed, mention why in the PR.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/). Start
each message with a type, then a short imperative summary:

```
feat: add word-count to the status bar
fix: stop the preview pane jumping on first render
docs: document the asset-generation script
perf: shrink the client bundle
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`chore`, `build`, `security`.

## Opening a pull request

1. Target the `main` branch.
2. Fill in the PR template: describe **what** changed and **why**, and link any
   related issue (e.g. `Closes #12`).
3. Add before/after screenshots or a short clip for any visible UI change.
4. If your change is user-facing, add a line to the **Unreleased** section of
   [`CHANGELOG.md`](./CHANGELOG.md).
5. Confirm `npm run lint`, `npm test`, and `npm run build` pass locally.
6. Keep the PR focused. One logical change per PR is much easier to review.

A maintainer aims to give every pull request a first response within a few days.
They'll review your PR, may suggest changes, and will merge it once it's ready.
Don't be discouraged by review feedback; it's how we keep the codebase healthy.

## Reporting bugs & requesting features

Use the issue templates so we get the details we need:

- **Bugs:** include steps to reproduce, what you expected, what happened, and
  your browser/OS. A screenshot or console error helps a lot.
- **Features:** describe the problem you're trying to solve, not just the
  solution. It helps us find the best fit for the project.

Please search [existing issues](https://github.com/Rinava/MarkSight/issues)
first to avoid duplicates.

## Code of Conduct

This project is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By
participating, you're expected to uphold it. Please report unacceptable
behavior to the maintainer.

---

Happy hacking, and thank you for helping make MarkSight better! 💛
