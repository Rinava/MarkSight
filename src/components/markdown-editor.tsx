"use client";

import { useCallback, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const extensions = useMemo(function mkExtensions() {
    return [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { fontSize: "14px" },
        ".cm-content": { padding: "12px" },
      }),
    ];
  }, []);

  const handleChange = useCallback(function handle(next: string) {
    onChange(next);
  }, [onChange]);

  return (
    <div className={isFocused ? "ring-2 ring-primary rounded-md" : "rounded-md"}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        onFocus={function onF() { setIsFocused(true); }}
        onBlur={function onB() { setIsFocused(false); }}
        height="100%"
        minHeight="300px"
        theme={undefined}
        extensions={extensions}
        basicSetup={{ lineNumbers: true }}
      />
    </div>
  );
}
