"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Download, FileDown, FileText, Printer, ExternalLink } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

export interface ExportToolbarProps {
  content: string;
  filename?: string;
}

const MONO_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Escape a value for safe use inside a CSS string literal (e.g. `content`).
function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ");
}

// Print-on-load + close-on-afterprint, driven from the opener. The page's CSP
// (nonce + strict-dynamic) is inherited by the about:blank print window and
// blocks nonce-less inline scripts, so a <script> injected into the written
// document would never run. Same-origin calls from the opener are not subject
// to the window's script-src, and nothing print-related leaks into saved .html.
function printWhenLoaded(printWindow: Window) {
  const print = () => {
    printWindow.addEventListener("afterprint", () => printWindow.close());
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.readyState === "complete") print();
  else printWindow.addEventListener("load", print);
}

/**
 * Wrap a rendered markdown body in a self-contained, print-ready HTML document:
 * real page geometry (`@page`), page-break control, GFM task-list styling, a
 * running header/footer with the document title and page numbers, and a
 * portable font set.
 */
function buildDocument(body: string, title: string): string {
  const safeTitle = escapeHtml(title);
  const cssTitle = escapeCssString(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <style>
        @page {
            size: A4;
            margin: 18mm 16mm;
            @top-center { content: "${cssTitle}"; font-size: 9pt; color: #94a3b8; }
            @bottom-center { content: "Page " counter(page) " of " counter(pages); font-size: 9pt; color: #94a3b8; }
        }

        * { box-sizing: border-box; }

        body {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.65;
            color: #1f2937;
            max-width: 768px;
            margin: 0 auto;
            padding: 2.5rem 1.5rem;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        h1, h2, h3, h4, h5, h6 {
            color: #111827;
            font-weight: 600;
            line-height: 1.25;
            margin: 1.8em 0 0.6em;
            break-after: avoid;
        }
        h1 { font-size: 2rem; }
        h2 { font-size: 1.6rem; }
        h3 { font-size: 1.3rem; }
        h4 { font-size: 1.1rem; }
        h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }

        p { margin: 0 0 1rem; }

        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }

        code { font-family: ${MONO_STACK}; font-size: 0.875em; }
        code.inline-code {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            padding: 0.1em 0.35em;
            border-radius: 4px;
        }
        pre { break-inside: avoid; overflow-x: auto; font-family: ${MONO_STACK}; }
        pre code { font-family: inherit; }

        blockquote {
            border-left: 4px solid #cbd5e1;
            padding: 0.2rem 0 0.2rem 1rem;
            margin: 1rem 0;
            color: #475569;
            break-inside: avoid;
        }

        ul, ol { margin: 1rem 0; padding-left: 1.6rem; }
        li { margin: 0.3rem 0; }
        li::marker { color: #64748b; }

        /* GFM task lists: aligned checkboxes, no bullets. */
        ul:has(input[type="checkbox"]) { padding-left: 1rem; }
        li:has(input[type="checkbox"]) { list-style: none; }
        input[type="checkbox"] { margin: 0 0.45em 0 0; vertical-align: middle; }

        img, figure { max-width: 100%; height: auto; break-inside: avoid; }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            font-size: 0.95em;
            break-inside: avoid;
        }
        th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
        th { background: #f8fafc; font-weight: 600; }

        hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }

        .mermaid-diagram { display: flex; justify-content: center; margin: 1.5rem 0; break-inside: avoid; }
        .mermaid-diagram svg { max-width: 100%; height: auto; }
        .mermaid-error {
            border: 1px solid #f87171;
            background: #fef2f2;
            color: #b91c1c;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            margin: 1.5rem 0;
        }
        .mermaid-error pre { background: none; padding: 0; margin: 0.5rem 0 0; white-space: pre-wrap; }

        @media print {
            body { max-width: none; margin: 0; padding: 0; }
            a { color: inherit; }
        }
    </style>
</head>
<body>
    ${body}
</body>
</html>`;
}

export function ExportToolbar({ content, filename = "document" }: ExportToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { trackExportAction } = useAnalytics();

  // Render the markdown body (highlighting + mermaid) and wrap it in the print
  // document. The renderer is imported lazily so react-dom/server and the
  // markdown pipeline stay out of the initial bundle.
  async function generateDocument() {
    const { renderExportBody } = await import("@/lib/export-markdown");
    const body = await renderExportBody(content);
    return buildDocument(body, filename);
  }

  function downloadFile(data: string, name: string, mimeType: string) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function exportHTML() {
    setIsExporting(true);
    setExportProgress(10);
    trackExportAction("html", content);

    try {
      const doc = await generateDocument();
      setExportProgress(90);
      downloadFile(doc, `${filename}.html`, "text/html");
      setExportProgress(100);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("HTML export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  async function exportPDF() {
    setIsExporting(true);
    setExportProgress(10);
    trackExportAction("pdf", content);

    // Open the window synchronously inside the click handler so it isn't caught
    // by the pop-up blocker (opening after an await would be).
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setIsExporting(false);
      setExportProgress(0);
      toast.error("Couldn't open the print window", {
        description: "Allow pop-ups for this site, then try again.",
      });
      return;
    }

    try {
      const doc = await generateDocument();
      setExportProgress(90);
      printWindow.document.open();
      printWindow.document.write(doc);
      printWindow.document.close();
      printWhenLoaded(printWindow);
      setExportProgress(100);
    } catch (error) {
      console.error("PDF export failed:", error);
      printWindow.close();
      toast.error("PDF export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  async function previewHTML() {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.error("Couldn't open the preview window", {
        description: "Allow pop-ups for this site, then try again.",
      });
      return;
    }

    try {
      const doc = await generateDocument();
      previewWindow.document.open();
      previewWindow.document.write(doc);
      previewWindow.document.close();
    } catch (error) {
      console.error("Preview failed:", error);
      previewWindow.close();
      toast.error("Preview failed");
    }
  }

  function downloadMarkdown() {
    downloadFile(content, `${filename}.md`, "text/markdown");
  }

  const exportButtons = [
    {
      icon: FileText,
      label: "Export HTML",
      action: exportHTML,
      shortcut: "⌘E",
    },
    {
      icon: Printer,
      label: "Export PDF",
      action: exportPDF,
      shortcut: "⌘P",
    },
    {
      icon: ExternalLink,
      label: "Preview HTML",
      action: previewHTML,
      shortcut: "⌘⇧P",
    },
    {
      icon: FileDown,
      label: "Download Markdown",
      action: downloadMarkdown,
      shortcut: "⌘⇧S",
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          {exportButtons.map((button) => (
            <Tooltip key={button.label}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={button.action}
                  disabled={isExporting}
                  aria-label={button.label}
                  className="h-8 w-8 p-0"
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {button.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {button.shortcut}
                  </span>
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {isExporting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 ml-4"
          >
            <Download className="h-3 w-3 animate-pulse" />
            <Progress value={exportProgress} className="w-24 h-2" />
            <span className="text-xs text-muted-foreground">{Math.round(exportProgress)}%</span>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}
