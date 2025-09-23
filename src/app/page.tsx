"use client";

import { useState } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownPreview } from "@/components/markdown-preview";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STARTER = `# Welcome to MarkSight

Type Markdown on the left.

- Try typing ## for a heading
- Use **Bold** and _Italic_
- Add code blocks:

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`
}
\`\`\`
`;

export default function Home() {
  const [value, setValue] = useState<string>(STARTER);
  const debounced = useDebouncedValue(value, { delayMs: 200 });

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-full rounded-md border bg-secondary">
              <MarkdownEditor value={value} onChange={setValue} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <MarkdownPreview value={debounced} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
