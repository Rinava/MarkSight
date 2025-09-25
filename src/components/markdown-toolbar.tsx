"use client";

import { useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Table,
  CheckSquare,
  Minus,
} from "lucide-react";

export interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset?: number, replaceFrom?: number, replaceTo?: number) => void;
  getCurrentContext?: () => { text: string; selection: { from: number; to: number } };
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  shortcut?: string;
  formatType?: string;
}

interface MarkdownPattern {
  pattern: RegExp;
  type: string;
  before: string;
  after: string;
}

export function MarkdownToolbar({ onInsert, getCurrentContext }: MarkdownToolbarProps) {
  const markdownPatterns = useMemo(() => [
    { pattern: /\*\*([^*]+)\*\*/g, type: 'bold', before: '**', after: '**' },
    { pattern: /\*([^*]+)\*/g, type: 'italic', before: '*', after: '*' },
    { pattern: /~~([^~]+)~~/g, type: 'strikethrough', before: '~~', after: '~~' },
    { pattern: /`([^`]+)`/g, type: 'code', before: '`', after: '`' },
  ], []);

  function getActiveFormatting(): string[] {
    if (!getCurrentContext) return [];
    
    const context = getCurrentContext();
    const { text, selection } = context;
    const cursorPos = selection.from;
    
    const activeFormats: string[] = [];
    
    // Check if cursor is inside any formatting
    for (const patternInfo of markdownPatterns) {
      const matches = [...text.matchAll(patternInfo.pattern)];
      for (const match of matches) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = match.index + match[0].length;
          if (cursorPos >= start && cursorPos <= end) {
            activeFormats.push(patternInfo.type);
          }
        }
      }
    }
    
    // Check for heading at current line
    const lines = text.split('\n');
    let currentLine = 0;
    let charCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (charCount + lines[i].length >= cursorPos) {
        currentLine = i;
        break;
      }
      charCount += lines[i].length + 1; // +1 for newline
    }
    
    const lineText = lines[currentLine];
    const headingMatch = lineText.match(/^(#{1,6})\s/);
    if (headingMatch) {
      activeFormats.push(`heading${headingMatch[1].length}`);
    }
    
    return activeFormats;
  }


  const findSurroundingMarkdown = useCallback((text: string, position: number): MarkdownPattern | null => {
    for (const patternInfo of markdownPatterns) {
      const matches = [...text.matchAll(patternInfo.pattern)];
      for (const match of matches) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = match.index + match[0].length;
          if (position >= start && position <= end) {
            return patternInfo;
          }
        }
      }
    }
    return null;
  }, [markdownPatterns]);

  const canNest = (currentType: string, newType: string): boolean => {
    const nestingRules: Record<string, string[]> = {
      'bold': ['italic', 'strikethrough', 'code'],
      'italic': ['bold', 'strikethrough', 'code'],
      'strikethrough': ['bold', 'italic', 'code'],
      'code': [], // Code cannot nest other formatting
    };
    return nestingRules[currentType]?.includes(newType) ?? false;
  };

  const insertText = useCallback((before: string, after: string = "", placeholder: string = "") => {
    if (getCurrentContext) {
      const context = getCurrentContext();
      const { selection } = context;
      const hasSelection = selection.from !== selection.to;
      
      if (hasSelection) {
        // Wrap selected text
        const selectedText = context.text.substring(selection.from, selection.to);
        const wrappedText = `${before}${selectedText}${after}`;
        const cursorOffset = before.length + selectedText.length + after.length;
        onInsert(wrappedText, cursorOffset, selection.from, selection.to);
        return;
      }
    }
    
    // Normal insertion with placeholder
    const text = placeholder ? `${before}${placeholder}${after}` : `${before}${after}`;
    const cursorOffset = placeholder ? before.length : before.length + after.length;
    onInsert(text, cursorOffset);
  }, [getCurrentContext, onInsert]);

  const removeFormatting = useCallback((text: string, selection: { from: number; to: number }, pattern: MarkdownPattern) => {
    const matches = [...text.matchAll(pattern.pattern)];
    for (const match of matches) {
      if (match.index !== undefined) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (selection.from >= start && selection.from <= end) {
          const innerText = match[1];
          const newCursorPos = selection.from - start - pattern.before.length;
          
          // Replace the entire matched text with just the inner content
          onInsert(innerText, newCursorPos + innerText.length, start, end);
          return;
        }
      }
    }
  }, [onInsert]);

  const replaceFormatting = useCallback((text: string, selection: { from: number; to: number }, oldPattern: MarkdownPattern, newBefore: string, newAfter: string, placeholder: string) => {
    const matches = [...text.matchAll(oldPattern.pattern)];
    for (const match of matches) {
      if (match.index !== undefined) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (selection.from >= start && selection.from <= end) {
          const innerText = match[1];
          const newText = placeholder && !innerText ? `${newBefore}${placeholder}${newAfter}` : `${newBefore}${innerText}${newAfter}`;
          const cursorOffset = newBefore.length + (placeholder && !innerText ? 0 : innerText.length);
          
          onInsert(newText, cursorOffset, start, end);
          return;
        }
      }
    }
  }, [onInsert]);

  const smartInsert = useCallback((before: string, after: string, placeholder: string, elementType: string) => {
    if (!getCurrentContext) {
      insertText(before, after, placeholder);
      return;
    }

    const context = getCurrentContext();
    const { text, selection } = context;
    const hasSelection = selection.from !== selection.to;
    
    if (hasSelection) {
      // Handle text selection - check if selection is already formatted
      const selectedText = text.substring(selection.from, selection.to);
      
      // Check if the selected text exactly matches a markdown pattern
      const selectedPattern = markdownPatterns.find(pattern => {
        const match = selectedText.match(new RegExp(`^${pattern.before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.+)${pattern.after.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
        return match && pattern.type === elementType;
      });
      
      if (selectedPattern) {
        // Remove formatting from selected text
        const innerMatch = selectedText.match(new RegExp(`^${selectedPattern.before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.+)${selectedPattern.after.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
        if (innerMatch) {
          const innerText = innerMatch[1];
          onInsert(innerText, innerText.length, selection.from, selection.to);
        }
      } else {
        // Wrap selected text with formatting
        const wrappedText = `${before}${selectedText}${after}`;
        const cursorOffset = before.length + selectedText.length + after.length;
        onInsert(wrappedText, cursorOffset, selection.from, selection.to);
      }
      return;
    }
    
    // Handle cursor position (no selection)
    const cursorPos = selection.from;
    const surroundingMarkdown = findSurroundingMarkdown(text, cursorPos);
    
    if (surroundingMarkdown) {
      if (surroundingMarkdown.type === elementType) {
        // Same type - remove the formatting
        removeFormatting(text, selection, surroundingMarkdown);
      } else if (canNest(surroundingMarkdown.type, elementType)) {
        // Different type that can be nested
        insertText(before, after, placeholder);
      } else {
        // Cannot nest - replace
        replaceFormatting(text, selection, surroundingMarkdown, before, after, placeholder);
      }
    } else {
      // No surrounding markdown - normal insert
      insertText(before, after, placeholder);
    }
  }, [getCurrentContext, onInsert, insertText, findSurroundingMarkdown, markdownPatterns, removeFormatting, replaceFormatting]);

  const insertLine = useCallback((prefix: string, placeholder: string = "") => {
    const text = placeholder ? `${prefix}${placeholder}` : prefix;
    const cursorOffset = prefix.length;
    onInsert(`\n${text}\n`, cursorOffset + 1);
  }, [onInsert]);

  const smartHeading = useCallback((level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    const placeholder = `Heading ${level}`;
    
    if (!getCurrentContext) {
      insertLine(prefix, placeholder);
      return;
    }

    const context = getCurrentContext();
    const { text, selection } = context;
    const hasSelection = selection.from !== selection.to;
    
    if (hasSelection) {
      const selectedText = text.substring(selection.from, selection.to);
      
      const lines = selectedText.split('\n');
      if (lines.length > 1) {
        const firstLine = lines[0];
        const restLines = lines.slice(1);
        
        const cleanFirstLine = firstLine.replace(/^#+\s*/, '');
        const newText = `${prefix}${cleanFirstLine}${restLines.length > 0 ? '\n' + restLines.join('\n') : ''}`;
        const cursorOffset = newText.length;
        
        onInsert(newText, cursorOffset, selection.from, selection.to);
      } else {
        // Single line selection: convert to heading
        const cleanText = selectedText.replace(/^#+\s*/, '');
        const headingText = `${prefix}${cleanText}`;
        const cursorOffset = headingText.length;
        
        onInsert(headingText, cursorOffset, selection.from, selection.to);
      }
      return;
    }
    
    const lines = text.split('\n');
    let currentLineIndex = 0;
    let lineStart = 0;
    
    // Find which line the cursor is on
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = lineStart + lines[i].length;
      if (selection.from >= lineStart && selection.from <= lineEnd) {
        currentLineIndex = i;
        break;
      }
      lineStart = lineEnd + 1; // +1 for newline character
    }
    
    const currentLine = lines[currentLineIndex];
    const lineEnd = lineStart + currentLine.length;
    
    // Remove existing heading markers
    const cleanLine = currentLine.replace(/^#+\s*/, '');
    const newHeading = cleanLine ? `${prefix}${cleanLine}` : `${prefix}${placeholder}`;
    const cursorOffset = prefix.length + (cleanLine ? cleanLine.length : 0);
    
    onInsert(newHeading, cursorOffset, lineStart, lineEnd);
  }, [getCurrentContext, onInsert, insertLine]);

  const buttons: ToolbarButton[] = [
    {
      icon: Bold,
      label: "Bold",
      shortcut: "⌘B",
      formatType: "bold",
      action: () => smartInsert("**", "**", "bold text", "bold"),
    },
    {
      icon: Italic,
      label: "Italic",
      shortcut: "⌘I",
      formatType: "italic",
      action: () => smartInsert("*", "*", "italic text", "italic"),
    },
    {
      icon: Strikethrough,
      label: "Strikethrough",
      shortcut: "⌘U",
      formatType: "strikethrough",
      action: () => smartInsert("~~", "~~", "strikethrough text", "strikethrough"),
    },
    {
      icon: Heading1,
      label: "Heading 1",
      shortcut: "⌘⇧1",
      formatType: "heading1",
      action: () => smartHeading(1),
    },
    {
      icon: Heading2,
      label: "Heading 2",
      shortcut: "⌘⇧2",
      formatType: "heading2",
      action: () => smartHeading(2),
    },
    {
      icon: Heading3,
      label: "Heading 3",
      shortcut: "⌘⇧3",
      formatType: "heading3",
      action: () => smartHeading(3),
    },
    {
      icon: List,
      label: "Unordered List",
      shortcut: "⌘⇧L",
      action: () => insertLine("- ", "List item"),
    },
    {
      icon: ListOrdered,
      label: "Ordered List",
      shortcut: "⌘⇧O",
      action: () => insertLine("1. ", "List item"),
    },
    {
      icon: CheckSquare,
      label: "Task List",
      action: () => insertLine("- [ ] ", "Task item"),
    },
    {
      icon: Quote,
      label: "Blockquote",
      action: () => insertLine("> ", "Quote"),
    },
    {
      icon: Code,
      label: "Inline Code",
      shortcut: "⌘`",
      formatType: "code",
      action: () => smartInsert("`", "`", "code", "code"),
    },
    {
      icon: Code,
      label: "Code Block",
      action: () => insertText("\n```\n", "\n```\n", "language\ncode"),
    },
    {
      icon: Link,
      label: "Link",
      shortcut: "⌘K",
      action: () => insertText("[", "](url)", "link text"),
    },
    {
      icon: Image,
      label: "Image",
      action: () => insertText("![", "](url)", "alt text"),
    },
    {
      icon: Table,
      label: "Table",
      action: () => insertText("\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n"),
    },
    {
      icon: Minus,
      label: "Horizontal Rule",
      action: () => insertLine("---"),
    },
  ];

  const formatButtons = buttons.slice(0, 3);
  const headingButtons = buttons.slice(3, 6);
  const listButtons = buttons.slice(6, 9);
  const blockButtons = buttons.slice(9, 12);
  const linkButtons = buttons.slice(12, 14);
  const miscButtons = buttons.slice(14);

  const renderButtonGroup = (buttonGroup: ToolbarButton[]) => {
    const activeFormats = getActiveFormatting();
    
    return buttonGroup.map((button) => {
      const isActive = button.formatType ? activeFormats.includes(button.formatType) : false;
      
      return (
        <Tooltip key={button.label}>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={button.action}
              className={`h-8 w-8 p-0 transition-all duration-200 ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <button.icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {button.label}
              {button.shortcut && (
                <span className="ml-2 text-xs text-muted-foreground">
                  {button.shortcut}
                </span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    });
  };

  // Keyboard shortcuts
  useEffect(function setupKeyboardShortcuts() {
    function handleKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      if (!isCtrlOrCmd) return;

      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          smartInsert("**", "**", "bold text", "bold");
          break;
        case 'i':
          event.preventDefault();
          smartInsert("*", "*", "italic text", "italic");
          break;
        case 'u':
          event.preventDefault();
          smartInsert("~~", "~~", "strikethrough text", "strikethrough");
          break;
        case 'k':
          event.preventDefault();
          insertText("[", "](url)", "link text");
          break;
        case '`':
          event.preventDefault();
          smartInsert("`", "`", "code", "code");
          break;
        case '1':
          if (event.shiftKey) {
            event.preventDefault();
            smartHeading(1);
          }
          break;
        case '2':
          if (event.shiftKey) {
            event.preventDefault();
            smartHeading(2);
          }
          break;
        case '3':
          if (event.shiftKey) {
            event.preventDefault();
            smartHeading(3);
          }
          break;
        case 'l':
          if (event.shiftKey) {
            event.preventDefault();
            insertLine("- ", "List item");
          }
          break;
        case 'o':
          if (event.shiftKey) {
            event.preventDefault();
            insertLine("1. ", "List item");
          }
          break;
        default:
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return function cleanup() {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [insertLine, insertText, smartHeading, smartInsert]);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-1">
          {renderButtonGroup(formatButtons)}
        </div>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <div className="flex items-center gap-1">
          {renderButtonGroup(headingButtons)}
        </div>
        <Separator orientation="vertical" className="h-6 hidden sm:block" />
        <div className="flex items-center gap-1">
          {renderButtonGroup(listButtons)}
        </div>
        <Separator orientation="vertical" className="h-6 hidden md:block" />
        <div className="flex items-center gap-1">
          {renderButtonGroup(blockButtons)}
        </div>
        <Separator orientation="vertical" className="h-6 hidden md:block" />
        <div className="flex items-center gap-1">
          {renderButtonGroup(linkButtons)}
        </div>
        <Separator orientation="vertical" className="h-6 hidden lg:block" />
        <div className="flex items-center gap-1">
          {renderButtonGroup(miscButtons)}
        </div>
      </div>
    </TooltipProvider>
  );
}
