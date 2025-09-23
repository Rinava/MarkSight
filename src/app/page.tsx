"use client";

import { useEffect } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownPreview } from "@/components/markdown-preview";
import { DocumentOutline } from "@/components/document-outline";
import { MarkdownHints } from "@/components/markdown-hints";
import { ExportToolbar } from "@/components/export-toolbar";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLocalStorage } from "@/lib/use-local-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STARTER = [
  "# Welcome to MarkSight 🌿",
  "",
  "This is a simple test with `inline code` here.",
  "",
  "And **bold text** works fine."
].join('\n') + `

## Real-Time Google Docs-Like Experience

Welcome to the most advanced Markdown editor with **real-time preview** and Google Docs-inspired features!

### ✨ Key Features

1. **Live Preview** - See changes instantly as you type
2. **Smart Toolbar** - Context-aware formatting buttons
3. **Keyboard Shortcuts** - Just like Google Docs
4. **Document Outline** - Navigate through your document easily
5. **Export Options** - HTML and PDF with beautiful styling
6. **Nature-Inspired Themes** - Calm and professional design

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

### 📝 More Examples

> This is a beautiful blockquote that showcases the nature-inspired theme

#### Lists Work Perfectly
- Unordered lists
- With multiple items
- And proper indentation

1. Numbered lists too
2. With automatic numbering
3. And clean formatting

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
`;

export default function Home() {
  const [value, setValue] = useLocalStorage({ 
    key: "marksight-markdown-content", 
    defaultValue: STARTER 
  });
  const debounced = useDebouncedValue(value, { delayMs: 100 });

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <CardTitle>Editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-full rounded-md border bg-secondary">
                  <MarkdownEditor value={value} onChange={setValue} />
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-2">
                <CardTitle>Preview</CardTitle>
                <ExportToolbar content={debounced} filename="marksight-document" />
              </CardHeader>
              <CardContent className="overflow-auto">
                <MarkdownPreview value={debounced} />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="lg:col-span-1 space-y-4">
          <DocumentOutline content={debounced} />
          <MarkdownHints />
        </div>
      </div>
    </div>
  );
}
