"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Download, FileDown, FileText, Printer, ExternalLink, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { renderMarkdownToHtml } from "@/lib/markdown/to-html";
import { downloadSkillBundle } from "@/lib/skill/download";
import { useSkillMeta } from "@/contexts/skill-meta-context";
import { useAnalytics } from "@/hooks/use-analytics";

export interface ExportToolbarProps {
  content: string;
  filename?: string;
}

export function ExportToolbar({ content, filename = "document" }: ExportToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { trackExportAction, trackSkillAction } = useAnalytics();
  const { meta, validation, mode, extraFiles } = useSkillMeta();

  async function generateHTML(includeStyles = true) {
    return renderMarkdownToHtml(content, {
      styled: includeStyles,
      title: filename,
    });
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function exportSkill() {
    if (!validation.valid) {
      toast.error("Skill metadata needs a fix", {
        description: validation.errors[0],
      });
      return;
    }
    try {
      await downloadSkillBundle({ meta, content, mode, extraFiles });
      trackSkillAction("skill");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }

  // ⌘⇧K / Ctrl+Shift+K — one-click skill export, same as the toolbar button.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        exportSkill();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, validation, mode, extraFiles, content]);

  async function exportHTML() {
    setIsExporting(true);
    setExportProgress(0);
    trackExportAction('html', content);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 20, 90));
    }, 100);

    try {
      const htmlContent = await generateHTML(true);
      setExportProgress(100);

      setTimeout(() => {
        downloadFile(htmlContent, `${filename}.html`, 'text/html');
        clearInterval(progressInterval);
        setIsExporting(false);
        setExportProgress(0);
      }, 300);
    } catch (error) {
      console.error('Export failed:', error);
      clearInterval(progressInterval);
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  async function exportPDF() {
    setIsExporting(true);
    setExportProgress(0);
    trackExportAction('pdf', content);

    const progressInterval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 15, 90));
    }, 150);

    try {
      const htmlContent = await generateHTML(true);
      setExportProgress(100);

      // Create a temporary window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          clearInterval(progressInterval);
          setIsExporting(false);
          setExportProgress(0);
        }, 500);
      }
    } catch (error) {
      console.error('PDF export failed:', error);
      clearInterval(progressInterval);
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  async function previewHTML() {
    try {
      const htmlContent = await generateHTML(true);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  }

  function downloadMarkdown() {
    downloadFile(content, `${filename}.md`, 'text/markdown');
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
    {
      icon: PackagePlus,
      label: "Export as Claude Skill",
      action: exportSkill,
      shortcut: "⌘⇧K",
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
