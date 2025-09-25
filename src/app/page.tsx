"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ExportToolbar } from "@/components/export-toolbar";

const MarkdownEditor = dynamic(() => import("@/components/markdown-editor").then(mod => ({ default: mod.MarkdownEditor })), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-muted animate-pulse rounded-md" />
});

const MarkdownPreview = dynamic(() => import("@/components/markdown-preview").then(mod => ({ default: mod.MarkdownPreview })), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-muted animate-pulse rounded-md" />
});
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLocalStorage } from "@/lib/use-local-storage";
import { useContent } from "@/contexts/content-context";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STARTER =
  ["# Welcome to MarkSight 🌿", ""].join("\n") +
  `

Welcome to the most advanced **open source** Markdown editor with **real-time preview** and **export options!**

### ✨ Key Features

1. **Live Preview** - See changes instantly as you type
2. **Smart Toolbar** - Context-aware formatting buttons
3. **Keyboard Shortcuts** - To speed up your workflow
4. **Document Outline** - Navigate through your document easily
5. **Export Options** - HTML and PDF with beautiful styling
6. **Open Source** - Free to use and contribute to on GitHub
7. **Community Driven** - Anyone can participate and improve the project

### 🚀 Try These Features

#### Keyboard Shortcuts
- **Bold**: ⌘B (Ctrl+B on Windows)
- **Italic**: ⌘I 
- **Strikethrough**: ⌘U
- **Link**: ⌘K
- **Inline Code**: ⌘\`
- **Headings**: ⌘⇧1, ⌘⇧2, ⌘⇧3

#### Smart Formatting
Select text and watch the toolbar **highlight active formatting**! Try selecting this **bold text** or this *italic text*.

#### Code Blocks
\`\`\`typescript
// Beautiful syntax highlighting
function createDocument(content: string): Document {
  return {
    id: generateId(),
    content,
    createdAt: new Date(),
    lastModified: new Date()
  };
}
\`\`\`


#### Tables Are Supported

| Feature | Status | Description |
|---------|--------|-------------|
| Real-time Preview | ✅ | Instant updates |
| Smart Toolbar | ✅ | Context-aware |
| Export | ✅ | HTML & PDF |

### 🎨 Export Your Work

Use the export buttons in the preview pane to:
- **Export HTML** - Clean, styled HTML file
- **Export PDF** - Print-ready document
- **Preview HTML** - See how it looks in browser

### 🌙 Theme Toggle

Click the theme toggle in the header to switch between light and dark modes with smooth animations!

---

**Start typing and experience the magic of real-time collaborative-style editing!**

### 🤝 Open Source & Community

MarkSight is **completely free and open source**! Anyone can:
- **Use it** for free without restrictions
- **Contribute** code, features, and improvements
- **Report bugs** and suggest enhancements
- **Fork the project** and create your own version
- **Collaborate** with other developers on GitHub

Visit our [GitHub repository](https://github.com/rinava/MarkSight) to get involved!
`;

export default function Home() {
  const [value, setValue] = useLocalStorage({
    key: "marksight-markdown-content",
    defaultValue: STARTER,
  });
  const [previousValue, setPreviousValue] = useState<string>(value);
  const debounced = useDebouncedValue(value, { delayMs: 100 });
  const { setContent } = useContent();
  const { trackDocumentChange, trackReset, trackClear } = useAnalytics();

  // Update context content when debounced value changes
  useEffect(() => {
    setContent(debounced);
    trackDocumentChange(debounced);
  }, [debounced, setContent, trackDocumentChange]);

  const handleValueChange = (newValue: string) => {
    setPreviousValue(value);
    setValue(newValue);
  };
  const handleUndo = () => {
    setValue(previousValue);
  };

  const handleReset = () => {
    setPreviousValue(value);
    setValue(STARTER);
    trackReset();
    toast.success("Document reset to default", {
      description:
        "Your previous content has been replaced with the default template.",
      action: {
        label: "Undo",
        onClick: handleUndo,
      },
    });
  };
  const handleClear = () => {
    setPreviousValue(value);
    setValue("");
    trackClear();
    toast.success("Document cleared", {
      description: "All content has been removed from the editor.",
      action: {
        label: "Undo",
        onClick: handleUndo,
      },
    });
  };

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 md:p-8">
          <header className="flex items-center gap-2 mb-6">
            <h1 className="text-2xl font-bold">MarkSight</h1>
            <span className="text-sm text-muted-foreground">- Advanced Markdown Editor</span>
          </header>
          
          <div className="sr-only">
            <h2>Professional Markdown Editor Features</h2>
            <p>
              MarkSight is a powerful, free and open source markdown editor created by laramateo.com. 
              Features include real-time preview, smart toolbar, keyboard shortcuts, 
              document outline navigation, HTML and PDF export capabilities, and 
              dark/light theme support. Anyone can contribute to the project on GitHub. 
              Perfect for writers, developers, and content creators.
            </p>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Markdown Editor</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs"
                  >
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-full rounded-md border bg-card">
                  <MarkdownEditor value={value} onChange={handleValueChange} />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="text-xs"
                >
                  Clear
                </Button>
              </CardFooter>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-2">
                <CardTitle>Live Preview</CardTitle>
                <ExportToolbar
                  content={debounced}
                  filename="marksight-document"
                />
              </CardHeader>
              <CardContent className="overflow-auto">
                <MarkdownPreview value={debounced} />
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
