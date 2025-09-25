"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Download, FileText, Printer, ExternalLink } from "lucide-react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export interface ExportToolbarProps {
  content: string;
  filename?: string;
}

export function ExportToolbar({ content, filename = "document" }: ExportToolbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  async function generateHTML(includeStyles = true) {
    const result = await remark()
      .use(remarkGfm)
      .use(remarkHtml)
      .process(content);

    const htmlContent = result.toString();

    if (!includeStyles) return htmlContent;

    // Include CSS styles for better formatting
    const styledHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #fff;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #2d3748;
            margin-top: 2rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        
        h1 { font-size: 2.25rem; }
        h2 { font-size: 1.875rem; }
        h3 { font-size: 1.5rem; }
        
        p {
            margin-bottom: 1rem;
        }
        
        code {
            background: #f7fafc;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            font-size: 0.875em;
        }
        
        pre {
            background: #2d3748;
            color: #fff;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
            margin: 1rem 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        
        blockquote {
            border-left: 4px solid #e2e8f0;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #718096;
        }
        
        ul, ol {
            margin: 1rem 0;
            padding-left: 2rem;
        }
        
        li {
            margin: 0.5rem 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }
        
        th, td {
            border: 1px solid #e2e8f0;
            padding: 0.5rem 1rem;
            text-align: left;
        }
        
        th {
            background: #f7fafc;
            font-weight: 600;
        }
        
        a {
            color: #3182ce;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        @media print {
            body {
                max-width: none;
                margin: 0;
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;

    return styledHTML;
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
