"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Download, FileDown, FileText, Printer, ExternalLink } from "lucide-react";
import { renderMarkdownToHtml } from "@/lib/markdown/to-html";
import { useAnalytics } from "@/hooks/use-analytics";
import { SkillCreatorDialog } from "@/components/skill-creator-dialog";

export interface ExportToolbarProps {
  content: string;
  filename?: string;
  /** Replace the editor document (used by skill import). */
  onImportDocument?: (markdown: string) => void;
}

export function ExportToolbar({ content, filename = "document", onImportDocument }: ExportToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { trackExportAction } = useAnalytics();

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
          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <SkillCreatorDialog content={content} onImportDocument={onImportDocument} />
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
