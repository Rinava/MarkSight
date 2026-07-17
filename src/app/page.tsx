"use client";

import dynamic from "next/dynamic";

// Client-only: the workspace owns the CodeMirror editor, theme, and
// localStorage document, none of which should run during SSR.
const Workspace = dynamic(
  () => import("@/components/workspace/workspace").then((mod) => mod.Workspace),
  {
    ssr: false,
    loading: () => (
      <div role="status" aria-label="Loading MarkSight" className="bg-ms-app h-dvh w-full" />
    ),
  }
);

export default function Home() {
  return (
    <>
      {/* Server-rendered, screen-reader-only summary: the interactive
          workspace is client-only, so this keeps the page crawlable and
          accessible before hydration. */}
      <div className="sr-only">
        <h1>MarkSight — Markdown editor with live preview and Claude Skill export</h1>
        <p>
          MarkSight is a free, open source markdown workspace. Write markdown on the left and see it
          rendered live on the right, with a formatting toolbar, keyboard shortcuts, a document
          outline, and light/dark themes. Everything stays local in your browser. Turn any document
          into an agent Skill in one click: add a name and description, attach bundled files, and
          export a ready-to-use SKILL.md folder or .skill bundle for Claude and other AI agents.
          Export documents to HTML, PDF, or raw Markdown.
        </p>
      </div>
      <Workspace />
    </>
  );
}
