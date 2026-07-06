"use client";

import { useEffect, useRef } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FileDown,
  FileText,
  Package,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { renderMarkdownToHtml } from "@/lib/markdown/to-html";
import { renderMermaid } from "@/lib/mermaid";
import { buildSkillMdForMode } from "@/lib/skill/draft";
import { downloadSkillBundle } from "@/lib/skill/download";
import { useSkillMeta } from "@/contexts/skill-meta-context";
import { useAnalytics } from "@/hooks/use-analytics";

export interface ExportMenuProps {
  skillMode: boolean;
  content: string;
  filename?: string;
}

const MERMAID_BLOCK =
  /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// remark-html entity-escapes code-block contents; decode so mermaid receives
// the original source (including any frontmatter / %%{init}%% directives).
function decodeHtmlEntities(value: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = value;
  return el.value;
}

function mermaidErrorHTML(error: unknown): string {
  const message = escapeHtml(
    error instanceof Error ? error.message : String(error),
  );
  return `<div class="mermaid-error"><strong>Failed to render Mermaid diagram</strong><pre>${message}</pre></div>`;
}

// Replace each mermaid block with inline SVG so exports are self-contained.
// Light theme matches the export page; sequential because mermaid relies on
// shared global/DOM state. Browser-only — the shared to-html renderer stays
// server-safe for the MCP tool.
async function inlineMermaidDiagrams(html: string): Promise<string> {
  const matches = [...html.matchAll(MERMAID_BLOCK)];
  if (matches.length === 0) return html;

  const replacements: string[] = [];
  for (const match of matches) {
    const code = decodeHtmlEntities(match[1]);
    try {
      const svg = await renderMermaid(code, false);
      replacements.push(`<div class="mermaid-diagram">${svg}</div>`);
    } catch (error) {
      replacements.push(mermaidErrorHTML(error));
    }
  }

  let index = 0;
  return html.replace(MERMAID_BLOCK, () => replacements[index++]);
}

// Styled export document with any mermaid diagrams inlined as SVG.
async function renderExportHtml(
  content: string,
  filename: string,
): Promise<string> {
  const html = await renderMarkdownToHtml(content, {
    styled: true,
    title: filename,
  });
  return inlineMermaidDiagrams(html);
}

const ITEM_CLASS =
  "flex w-full cursor-default items-center gap-[11px] rounded-lg px-2.5 py-[9px] text-left text-ms-ink-2 outline-none transition-colors data-[highlighted]:bg-ms-hover-2 data-[disabled]:opacity-45";

function downloadBlob(data: BlobPart, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  skillMode,
  content,
  filename = "document",
}: ExportMenuProps) {
  const { meta, validation, mode, extraFiles } = useSkillMeta();
  const { trackExportAction, trackSkillAction } = useAnalytics();

  async function exportHTML() {
    try {
      trackExportAction("html", content);
      downloadBlob(
        await renderExportHtml(content, filename),
        `${filename}.html`,
        "text/html",
      );
      toast.success("HTML exported");
    } catch {
      toast.error("Failed to export HTML");
    }
  }

  async function exportPDF() {
    try {
      trackExportAction("pdf", content);
      const html = await renderExportHtml(content, filename);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Allow pop-ups to export as PDF");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    } catch {
      toast.error("Failed to export PDF");
    }
  }

  async function previewHTML() {
    try {
      const html = await renderExportHtml(content, filename);
      const newWindow = window.open("", "_blank");
      if (!newWindow) {
        toast.error("Allow pop-ups to preview HTML");
        return;
      }
      newWindow.document.write(html);
      newWindow.document.close();
    } catch {
      toast.error("Failed to preview HTML");
    }
  }

  function downloadMarkdown() {
    downloadBlob(content, `${filename}.md`, "text/markdown");
    toast.success("Markdown downloaded");
  }

  function ensureValidSkill() {
    if (validation.valid) return true;
    toast.error("Skill metadata needs a fix", {
      description: validation.errors[0],
    });
    return false;
  }

  async function copySkillMd() {
    if (!ensureValidSkill()) return;
    try {
      await navigator.clipboard.writeText(
        buildSkillMdForMode(meta, content, mode),
      );
      trackSkillAction("copy");
      toast.success("SKILL.md copied — paste it into Claude or another agent.");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  function downloadSkillMd() {
    if (!ensureValidSkill()) return;
    downloadBlob(
      buildSkillMdForMode(meta, content, mode),
      "SKILL.md",
      "text/markdown",
    );
    trackSkillAction("md");
    toast.success("SKILL.md downloaded");
  }

  async function downloadSkillZip() {
    if (!ensureValidSkill()) return;
    try {
      await downloadSkillBundle({ meta, content, mode, extraFiles });
      trackSkillAction("skill");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }

  // Keep the latest packaging handler in a ref so the ⌘⇧K listener can register
  // once instead of re-subscribing on every debounced value change.
  const skillZipRef = useRef(downloadSkillZip);
  useEffect(() => {
    skillZipRef.current = downloadSkillZip;
  });

  // ⌘⇧K / Ctrl+Shift+K — one-click skill package, matching the original app.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        skillZipRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const docItems = [
    { label: "Export HTML", sub: "Styled, self-contained", Icon: FileText, action: exportHTML },
    { label: "Export PDF", sub: "Print-ready", Icon: Printer, action: exportPDF },
    { label: "Preview HTML", sub: "Open in new tab", Icon: ExternalLink, action: previewHTML },
    { label: "Download Markdown", sub: "Raw .md source", Icon: FileDown, action: downloadMarkdown },
  ];
  const skillItems = [
    { label: "Copy SKILL.md", sub: "Frontmatter + body", Icon: Copy, action: copySkillMd, gated: true },
    { label: "Download SKILL.md", sub: "Single file", Icon: FileCode2, action: downloadSkillMd, gated: true },
    { label: "Download folder (.zip)", sub: "SKILL.md + bundled files", Icon: Package, action: downloadSkillZip, gated: true },
  ];
  const items = skillMode ? skillItems : docItems;

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        render={
          <button
            type="button"
            className="flex h-[34px] items-center gap-[7px] rounded-[9px] bg-ms-primary px-[13px] text-[13px] font-semibold text-white shadow-[var(--ms-shadow-primary)] transition-[filter] hover:brightness-[1.07] data-[popup-open]:brightness-[1.07]"
          />
        }
      >
        <Download className="h-[15px] w-[15px]" aria-hidden="true" />
        <span>{skillMode ? "Export skill" : "Export"}</span>
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="ms-pop w-[248px] origin-[var(--transform-origin)] rounded-xl border border-ms-border-2 bg-ms-surface p-1.5 shadow-[var(--ms-shadow-menu)] outline-none">
            <div className="px-2.5 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ms-muted">
              {skillMode ? "Package skill" : "Export document"}
            </div>
            {items.map((item) => (
              <Menu.Item
                key={item.label}
                onClick={item.action}
                disabled={"gated" in item && item.gated ? !validation.valid : false}
                className={ITEM_CLASS}
              >
                <span className="flex text-ms-primary-ink">
                  <item.Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-medium">{item.label}</span>
                  <span className="block text-[11px] text-ms-muted-3">{item.sub}</span>
                </span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
