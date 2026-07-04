"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Share2,
  Strikethrough,
  Table as TableIcon,
  X,
} from "lucide-react";
import { MarkdownPreview } from "@/components/markdown-preview";

interface GuideItem {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  syntax: string;
}

interface GuideCategory {
  title: string;
  items: GuideItem[];
}

const CATEGORIES: GuideCategory[] = [
  {
    title: "Text formatting",
    items: [
      { Icon: Bold, title: "Bold", description: "Emphasize important words.", syntax: "**bold text**" },
      { Icon: Italic, title: "Italic", description: "Lightly emphasize a phrase.", syntax: "*italic text*" },
      { Icon: Strikethrough, title: "Strikethrough", description: "Mark text as removed.", syntax: "~~crossed out~~" },
      { Icon: Code, title: "Inline code", description: "Highlight a command or term.", syntax: "Run `npm install` first" },
    ],
  },
  {
    title: "Headings",
    items: [
      { Icon: Heading1, title: "Headings", description: "One to six #'s set the level.", syntax: "# Title\n## Section\n### Subsection" },
    ],
  },
  {
    title: "Lists",
    items: [
      { Icon: List, title: "Bulleted list", description: "Start each line with a dash.", syntax: "- First\n- Second\n- Third" },
      { Icon: ListOrdered, title: "Numbered list", description: "Start each line with a number.", syntax: "1. First\n2. Second\n3. Third" },
      { Icon: CheckSquare, title: "Task list", description: "Track to-dos with checkboxes.", syntax: "- [x] Done\n- [ ] Todo" },
    ],
  },
  {
    title: "Blocks",
    items: [
      { Icon: Quote, title: "Blockquote", description: "Call out a quote or note.", syntax: "> A calm workspace." },
      { Icon: Code, title: "Code block", description: "Fence code with a language.", syntax: "```js\nconsole.log(\"hi\");\n```" },
      { Icon: Minus, title: "Divider", description: "Three dashes on their own line.", syntax: "---" },
    ],
  },
  {
    title: "Links & media",
    items: [
      { Icon: LinkIcon, title: "Link", description: "Text in [ ], URL in ( ).", syntax: "[MarkSight](https://marksight.laramateo.com)" },
      { Icon: ImageIcon, title: "Image", description: "Like a link, prefixed with !.", syntax: "![Alt text](https://picsum.photos/240/80)" },
    ],
  },
  {
    title: "Tables & diagrams",
    items: [
      { Icon: TableIcon, title: "Table", description: "Pipes for columns, dashes for the header row.", syntax: "| Feature | Status |\n|---------|--------|\n| Preview | Live   |\n| Export  | HTML   |" },
      { Icon: Share2, title: "Mermaid diagram", description: "Fenced `mermaid` blocks render as diagrams.", syntax: "```mermaid\ngraph LR\n  A[Write] --> B[Preview]\n```" },
    ],
  },
];

export function MarkdownGuide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-[rgba(20,32,16,0.42)] backdrop-blur-[2px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[61] flex max-h-[86vh] w-[min(780px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-ms-border-2 bg-ms-surface text-ms-ink shadow-[var(--ms-shadow-menu)] outline-none transition-[transform,opacity] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
          <header className="flex flex-none items-start justify-between gap-4 border-b border-ms-border px-6 py-[18px]">
            <div>
              <Dialog.Title className="text-[16px] font-semibold text-ms-primary-ink">
                Markdown guide
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12.5px] text-ms-muted-3">
                Everything you can write on the left — with a live preview of each.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close guide"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-ms-border-2 bg-ms-surface text-ms-label transition-colors hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink"
            >
              <X className="h-[17px] w-[17px]" aria-hidden="true" />
            </Dialog.Close>
          </header>

          <div className="ms-scroll min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {CATEGORIES.map((category) => (
              <section key={category.title} className="mb-6 last:mb-0">
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
                  {category.title}
                </h3>
                <div className="grid gap-2.5">
                  {category.items.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-ms-border-2 bg-ms-surface-2 p-3"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex text-ms-primary-ink">
                          <item.Icon className="h-[15px] w-[15px]" aria-hidden="true" />
                        </span>
                        <span className="text-[13px] font-semibold">{item.title}</span>
                        <span className="text-[12px] text-ms-muted-3">— {item.description}</span>
                      </div>
                      <div className="grid gap-2.5 md:grid-cols-2">
                        <pre className="ms-scroll overflow-x-auto rounded-lg border border-ms-border-2 bg-ms-tint px-3 py-2 font-mono text-[12px] leading-relaxed text-ms-ink-3">
                          {item.syntax}
                        </pre>
                        <div className="rounded-lg border border-ms-border-2 bg-ms-surface px-3 py-2">
                          <MarkdownPreview
                            value={item.syntax}
                            className="ms-prose text-[13px] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
