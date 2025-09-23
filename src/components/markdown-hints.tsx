"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
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
  BookOpen,
} from "lucide-react";

interface HintItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  example: string;
  category: string;
}

interface HintCategory {
  title: string;
  items: HintItem[];
}

export function MarkdownHints() {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    "formatting",
  ]);

  const hintCategories: HintCategory[] = [
    {
      title: "Text Formatting",
      items: [
        {
          icon: Bold,
          title: "Bold Text",
          description: "Make text bold and emphasize importance",
          example: "**This is bold text**",
          category: "formatting",
        },
        {
          icon: Italic,
          title: "Italic Text",
          description: "Make text italic for emphasis",
          example: "*This is italic text*",
          category: "formatting",
        },
        {
          icon: Strikethrough,
          title: "Strikethrough",
          description: "Cross out text to show deletion",
          example: "~~This is crossed out~~",
          category: "formatting",
        },
        {
          icon: Code,
          title: "Inline Code",
          description: "Highlight code or technical terms",
          example: "`console.log('Hello')`",
          category: "formatting",
        },
      ],
    },
    {
      title: "Headings",
      items: [
        {
          icon: Heading1,
          title: "Heading 1",
          description: "Main title or document heading",
          example: "# Welcome to My Document",
          category: "headings",
        },
        {
          icon: Heading2,
          title: "Heading 2",
          description: "Section heading",
          example: "## Getting Started",
          category: "headings",
        },
        {
          icon: Heading3,
          title: "Heading 3",
          description: "Subsection heading",
          example: "### Installation Steps",
          category: "headings",
        },
      ],
    },
    {
      title: "Lists",
      items: [
        {
          icon: List,
          title: "Unordered List",
          description: "Create bullet point lists",
          example: "- First item\n- Second item\n- Third item",
          category: "lists",
        },
        {
          icon: ListOrdered,
          title: "Ordered List",
          description: "Create numbered lists",
          example: "1. First step\n2. Second step\n3. Third step",
          category: "lists",
        },
        {
          icon: CheckSquare,
          title: "Task List",
          description: "Create interactive checkboxes",
          example:
            "- [x] Learn markdown basics\n- [ ] Create amazing documentation\n- [ ] Share with the world!",
          category: "lists",
        },
      ],
    },
    {
      title: "Content Blocks",
      items: [
        {
          icon: Quote,
          title: "Blockquote",
          description: "Quote text or highlight important notes",
          example:
            "> 💡 **Pro tip:** This is how you create\n> beautiful blockquotes for important notes!",
          category: "blocks",
        },
        {
          icon: Code,
          title: "Code Block",
          description: "Display formatted code with syntax highlighting",
          example:
            "```javascript\nfunction hello() {\n  console.log('Hello!');\n}\n```",
          category: "blocks",
        },
        {
          icon: Minus,
          title: "Horizontal Rule",
          description: "Create a horizontal line to separate content",
          example: "---",
          category: "blocks",
        },
      ],
    },
    {
      title: "Links & Media",
      items: [
        {
          icon: Link,
          title: "Link",
          description: "Create clickable links",
          example: "[Visit Google](https://google.com)",
          category: "media",
        },
        {
          icon: Image,
          title: "Image",
          description: "Embed images with alt text",
          example: "![Logo](https://example.com/logo.png)",
          category: "media",
        },
        {
          icon: Table,
          title: "Table",
          description: "Create structured data tables",
          example:
            "| Name | Age |\n|------|-----|\n| John | 25 |\n| Jane | 30 |",
          category: "media",
        },
      ],
    },
  ];

  function toggleCategory(categoryTitle: string) {
    setExpandedCategories((prev) =>
      prev.includes(categoryTitle)
        ? prev.filter((cat) => cat !== categoryTitle)
        : [...prev, categoryTitle]
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5 text-primary" />
          Markdown Hints
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quick reference for markdown syntax
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {hintCategories.map((category) => {
          const isExpanded = expandedCategories.includes(
            category.title.toLowerCase().replace(/\s+/g, "")
          );

          return (
            <div
              key={category.title}
              className="border rounded-lg overflow-hidden"
            >
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto font-medium"
                onClick={() =>
                  toggleCategory(
                    category.title.toLowerCase().replace(/\s+/g, "")
                  )
                }
              >
                <span>{category.title}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="border-t"
                  >
                    <div className="p-3 space-y-4 bg-muted/30">
                      {category.items.map((hint) => (
                        <motion.div
                          key={hint.title}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <hint.icon className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                              {hint.title}
                            </span>
                          </div>

                          <div className="space-y-2 pl-6">
                            <p className="text-xs text-muted-foreground">
                              {hint.description}
                            </p>

                            <div className="space-y-2">
                              <div>
                                <div className="flex mb-1 items-center justify-between">
                                  <div className="text-xs font-medium text-muted-foreground ">
                                    Markdown:
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() =>
                                      copyToClipboard(hint.example)
                                    }
                                  >
                                    Copy
                                  </Button>
                                </div>
                                <div className="text-xs bg-background border rounded px-2 py-1">
                                  <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                                    {hint.example}
                                  </pre>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">
                                  Preview:
                                </div>
                                <div className="text-xs bg-muted/50 border rounded px-2 py-1">
                                  <div className="prose prose-xs dark:prose-invert max-w-none [&>*]:my-0 [&>*]:leading-tight">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        p: ({ children }) => (
                                          <span>{children}</span>
                                        ),
                                        h1: ({ children }) => (
                                          <span className="text-lg font-bold">
                                            {children}
                                          </span>
                                        ),
                                        h2: ({ children }) => (
                                          <span className="text-base font-bold">
                                            {children}
                                          </span>
                                        ),
                                        h3: ({ children }) => (
                                          <span className="text-sm font-bold">
                                            {children}
                                          </span>
                                        ),
                                        strong: ({ children }) => (
                                          <strong className="font-bold">
                                            {children}
                                          </strong>
                                        ),
                                        em: ({ children }) => (
                                          <em className="italic">{children}</em>
                                        ),
                                        del: ({ children }) => (
                                          <del className="line-through">
                                            {children}
                                          </del>
                                        ),
                                        code: ({ children, className }) => {
                                          // Simple inline code styling for hints
                                          return (
                                            <code className="bg-muted px-1 rounded text-xs font-mono border">
                                              {children}
                                            </code>
                                          );
                                        },
                                        blockquote: ({ children }) => (
                                          <blockquote className="border-l-2 border-muted-foreground pl-2 italic">
                                            {children}
                                          </blockquote>
                                        ),
                                        ul: ({ children }) => (
                                          <ul className="list-disc list-inside">
                                            {children}
                                          </ul>
                                        ),
                                        ol: ({ children }) => (
                                          <ol className="list-decimal list-inside">
                                            {children}
                                          </ol>
                                        ),
                                        li: ({ children }) => (
                                          <li className="text-xs">
                                            {children}
                                          </li>
                                        ),
                                        a: ({ children, href }) => (
                                          <a
                                            href={href}
                                            className="text-primary underline"
                                          >
                                            {children}
                                          </a>
                                        ),
                                        pre: ({ children }) => (
                                          <pre className="bg-muted p-1 rounded text-xs overflow-x-auto">
                                            {children}
                                          </pre>
                                        ),
                                        hr: () => (
                                          <hr className="border-muted-foreground my-1" />
                                        ),
                                        table: ({ children }) => (
                                          <table className="border-collapse border border-muted text-xs">
                                            {children}
                                          </table>
                                        ),
                                        th: ({ children }) => (
                                          <th className="border border-muted px-1 py-0.5 bg-muted font-medium">
                                            {children}
                                          </th>
                                        ),
                                        td: ({ children }) => (
                                          <td className="border border-muted px-1 py-0.5">
                                            {children}
                                          </td>
                                        ),
                                      }}
                                    >
                                      {hint.example}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💡 Tip: Use the toolbar buttons or keyboard shortcuts for quick
            formatting
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
