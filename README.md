# MarkSight

An open source markdown editor with real-time preview, a smart formatting toolbar, keyboard shortcuts, a document outline, and Markdown/HTML/PDF export.

🔗 **Live:** [marksight.laramateo.com](https://marksight.laramateo.com)

## Features

- **Live preview** — CodeMirror editor with an instantly-rendered preview pane
- **Smart toolbar** — context-aware formatting that detects and toggles existing markdown
- **Keyboard shortcuts** — bold (⌘B), italic (⌘I), strikethrough (⌘U), link (⌘K), inline code (⌘`), headings (⌘⇧1–3), lists, and more
- **Document outline** — auto-generated, clickable heading navigation that scrolls the preview
- **Export** — download the raw Markdown source or styled HTML, print to PDF, or preview the HTML in a new tab
- **Skill Creator** — package your document as an [Agent Skill](https://code.claude.com/docs/en/skills) (⌘⇧K) that Claude and other AIs can receive: copy the generated `SKILL.md` or download a ready-to-install `.skill` bundle. Import existing skills from a `.skill`/`.zip` file or straight from GitHub-hosted marketplaces (like [anthropics/skills](https://github.com/anthropics/skills)), modify them, and re-export with bundled files preserved
- **GitHub-flavored markdown** — tables, task lists, strikethrough (via `remark-gfm`)
- **Syntax highlighting** — fenced code blocks rendered with Prism
- **Light / dark theme** — system-aware, persisted across sessions
- **Local persistence** — your document is saved to `localStorage` automatically

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) primitives
- [CodeMirror](https://codemirror.net/) (`@uiw/react-codemirror`) for editing
- [react-markdown](https://github.com/remarkjs/react-markdown) + `remark-gfm` for rendering
- [next-themes](https://github.com/pacocoursey/next-themes) for theming

## Getting started

```bash
npm install
npm run dev      # start the dev server at http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # run ESLint
```

### Exporting a document as an Agent Skill

Click the package icon in the preview toolbar (or press ⌘⇧K) to open the
**Create Skill** dialog. MarkSight derives the skill's `name` from your first
H1 and its `description` from the first paragraph, validates the result
against the Agent Skill spec, and shows a live `SKILL.md` preview. From there
you can copy the `SKILL.md`, download it, or download a packaged
`<name>.skill` bundle — everything runs locally in your browser.

To add the skill to Claude Code:

```bash
unzip -o ~/Downloads/<name>.skill -d ~/.claude/skills/
```

It loads on the next session (or after `/reload-plugins`). On claude.ai,
upload the `.skill` file under **Settings › Capabilities › Skills**.

Optionally, an **Improve with AI** button refines the skill's name and trigger
description (via Vercel AI Gateway). It appears only when the backend has
gateway credentials — see [`.env.example`](./.env.example); without them the
whole Skill Creator keeps working offline.

You can also **import an existing skill** from the same dialog: open a
`.skill`/`.zip` bundle or `SKILL.md` file, or paste a GitHub URL (a repo, a
folder, or a `SKILL.md` link — e.g. the official
[anthropics/skills](https://github.com/anthropics/skills) collection). The
skill's frontmatter is preserved (frontmatter always overrides auto-derived
metadata), bundled files like `references/` are carried through untouched, and
you can edit the body and re-export.

### Regenerating brand assets

App icons and social images are generated from inline SVG with `sharp`:

```bash
node scripts/generate-assets.mjs
```

This writes the manifest icons (`public/icon*.png`) and the Next.js
metadata images (`src/app/apple-icon.png`, `opengraph-image.png`, `twitter-image.png`).

## Project structure

```
src/
├── app/              # App Router entry (layout, page, metadata, route assets)
├── components/       # UI components (editor, preview, toolbar, sidebar, …)
│   └── ui/           # shadcn/ui primitives
├── contexts/         # React context providers
├── hooks/            # custom hooks
└── lib/              # utilities (slugify, local storage, syntax highlighter, …)
```

## Contributing

Contributions are welcome — whether it's a bug report, a feature idea, a docs
fix, or a pull request. See the [contributing guide](./CONTRIBUTING.md) for how
to set up the project and submit changes, and please follow our
[Code of Conduct](./CODE_OF_CONDUCT.md).

New here? Look for issues labelled
[`good first issue`](https://github.com/Rinava/MarkSight/issues?q=is%3Aopen+label%3A%22good+first+issue%22).

## License

See [LICENSE](./LICENSE).
