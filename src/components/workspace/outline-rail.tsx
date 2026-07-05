"use client";

import { useEffect, useMemo, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { buildOutline } from "@/lib/markdown/outline";

const COLLAPSE_KEY = "ms-outline-collapsed";

const HINTS = [
  { label: "Bold", syntax: "**text**" },
  { label: "Italic", syntax: "*text*" },
  { label: "Heading", syntax: "# H1" },
  { label: "Link", syntax: "[t](url)" },
  { label: "Code", syntax: "`code`" },
  { label: "Quote", syntax: "> text" },
];

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const overflowY = getComputedStyle(parent).overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

/** Scroll the preview pane to the heading whose id matches the outline entry. */
function jumpToHeading(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const scroller = getScrollParent(element);
  if (scroller) {
    const top =
      element.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      8;
    scroller.scrollTo({ top, behavior: "smooth" });
  } else {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function OutlineRail({
  content,
  onOpenGuide,
}: {
  content: string;
  onOpenGuide?: () => void;
}) {
  const outline = useMemo(() => buildOutline(content), [content]);
  // Read the persisted preference after mount to avoid an SSR hydration mismatch.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage failures (private mode / quota); collapse still works this session.
      }
      return next;
    });
  }

  if (collapsed) {
    return (
      <aside className="flex w-[42px] flex-none flex-col items-center border-l border-ms-border bg-ms-surface-2 py-4">
        <button
          type="button"
          onClick={toggle}
          aria-label="Show outline"
          title="Show outline"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-ms-border-2 bg-ms-surface text-ms-label transition-colors hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink"
        >
          <PanelRightOpen className="h-[16px] w-[16px]" aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[258px] flex-none flex-col border-l border-ms-border bg-ms-surface-2">
      <div className="ms-scroll min-h-0 flex-1 overflow-y-auto px-3.5 py-4">
        <div className="flex items-center justify-between px-1.5 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
            Outline
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label="Hide outline"
            title="Hide outline"
            className="flex h-6 w-6 items-center justify-center rounded-md text-ms-muted transition-colors hover:bg-ms-hover-2 hover:text-ms-primary-ink"
          >
            <PanelRightClose className="h-[15px] w-[15px]" aria-hidden="true" />
          </button>
        </div>

        {outline.length === 0 ? (
          <p className="px-1.5 text-[12.5px] text-ms-muted-2">No headings yet.</p>
        ) : (
          outline.map((heading, index) => (
            <a
              key={`${heading.id}-${index}`}
              href={`#${heading.id}`}
              onClick={(event) => {
                event.preventDefault();
                jumpToHeading(heading.id);
              }}
              style={{ paddingLeft: `${6 + (heading.level - 1) * 13}px` }}
              className={`block truncate rounded-md py-[5px] pr-1.5 no-underline transition-colors hover:bg-ms-tint-2 ${
                heading.level === 1
                  ? "text-[13px] font-semibold text-ms-primary-strong"
                  : "text-[12.5px] font-normal text-ms-muted-3"
              }`}
            >
              {heading.text}
            </a>
          ))
        )}

        <div className="mx-1 my-4 h-px bg-ms-border" />

        <div className="flex items-center justify-between px-1.5 pb-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
            Cheat sheet
          </span>
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-[11px] font-medium text-ms-primary-ink transition-colors hover:underline"
            >
              Full guide →
            </button>
          )}
        </div>
        {HINTS.map((hint) => (
          <div
            key={hint.label}
            className="flex items-center justify-between gap-2.5 px-1.5 py-1.5"
          >
            <span className="text-[12.5px] text-ms-label">{hint.label}</span>
            <code className="rounded-[5px] border border-ms-border-2 bg-ms-tint px-1.5 py-0.5 font-mono text-[11px] text-ms-ink-3">
              {hint.syntax}
            </code>
          </div>
        ))}
      </div>
    </aside>
  );
}
