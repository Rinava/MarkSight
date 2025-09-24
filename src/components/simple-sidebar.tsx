"use client";

import { DocumentOutline } from "@/components/document-outline";
import { MarkdownHints } from "@/components/markdown-hints";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

interface SimpleSidebarProps {
  content: string;
  isOpen: boolean;
  onToggle: () => void;
  onHeadingClick?: (headingId: string) => void;
}

export function SimpleSidebar({ content, isOpen, onToggle, onHeadingClick }: SimpleSidebarProps) {

  return (
    <>
      {/* Toggle Button - Always visible */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed top-4 right-4 z-50"
      >
        {isOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 bg-background border-l border-border shadow-lg z-40
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          md:relative md:translate-x-0 md:shadow-none md:border-l-0 md:border-r md:border-border md:w-full
        `}
      >
        <div className="h-full overflow-y-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">MarkSight</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="md:hidden"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>

          {/* Document Outline */}
          <div className="mb-4">
            <DocumentOutline content={content} onHeadingClick={onHeadingClick} />
          </div>

          {/* Markdown Hints */}
          <div>
            <MarkdownHints />
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
