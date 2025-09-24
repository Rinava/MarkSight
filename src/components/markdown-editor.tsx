"use client";

import { useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { MarkdownToolbar } from "./markdown-toolbar";

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  showToolbar?: boolean;
}

export interface MarkdownEditorRef {
  insertText: (text: string, cursorOffset?: number, replaceFrom?: number, replaceTo?: number) => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange, showToolbar = true }, ref) {
  const [isFocused, setIsFocused] = useState(false);
  const editorViewRef = useRef<EditorView | null>(null);

  const extensions = useMemo(function mkExtensions() {
    return [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { fontSize: "14px", backgroundColor: "var(--secondary)", color: "var(--foreground)", fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
        ".cm-content": { padding: "12px" },
        ".cm-gutters": { backgroundColor: "transparent", color: "var(--muted-foreground)", borderRight: "1px solid var(--border)" },
        ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px" },
        ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--muted) 100%, transparent)" },
        ".cm-selectionBackground": { backgroundColor: "#609B6E40" }, // Primary color with 25% opacity
        "&.cm-focused .cm-selectionBackground": { backgroundColor: "#609B6E60" }, // Primary color with 37.5% opacity
        ".dark .cm-selectionBackground": { backgroundColor: "#76B08540" },
        ".dark &.cm-focused .cm-selectionBackground": { backgroundColor: "#76B08560" },
        ".cm-cursor": { borderLeftColor: "var(--accent)" },
      }),
    ];
  }, []);

  const handleChange = useCallback(function handle(next: string) {
    onChange(next);
  }, [onChange]);

  const insertText = useCallback(function insert(text: string, cursorOffset?: number, replaceFrom?: number, replaceTo?: number) {
    if (!editorViewRef.current) return;
    
    const view = editorViewRef.current;
    const selection = view.state.selection.main;
    
    const from = replaceFrom ?? selection.from;
    const to = replaceTo ?? selection.to;
    
    
    const changes = {
      from,
      to,
      insert: text
    };
    
    const newPosition = from + (cursorOffset ?? text.length);
    
    view.dispatch({
      changes,
      selection: {
        anchor: newPosition,
        head: newPosition
      }
    });
    
    view.focus();
  }, []);

  useImperativeHandle(ref, function getRef() {
    return { insertText };
  }, [insertText]);

  const getCurrentContext = useCallback(function getContext() {
    if (!editorViewRef.current) {
      return { text: value, selection: { from: 0, to: 0 } };
    }
    
    const view = editorViewRef.current;
    const selection = view.state.selection.main;
    
    return {
      text: view.state.doc.toString(),
      selection: { from: selection.from, to: selection.to }
    };
  }, [value]);

  const handleToolbarInsert = useCallback(function handleInsert(text: string, cursorOffset?: number, replaceFrom?: number, replaceTo?: number) {
    insertText(text, cursorOffset, replaceFrom, replaceTo);
  }, [insertText]);

  return (
    <div className={`transition-all duration-300 ease-in-out ${
      isFocused 
        ? "ring-2 ring-primary shadow-lg rounded-md" 
        : "ring-1 ring-border hover:ring-2 hover:ring-primary/50 rounded-md"
    }`}>
      {showToolbar && (
        <MarkdownToolbar 
          onInsert={handleToolbarInsert} 
          getCurrentContext={getCurrentContext}
        />
      )}
      <CodeMirror
        value={value}
        onChange={handleChange}
        onFocus={function onF() { setIsFocused(true); }}
        onBlur={function onB() { setIsFocused(false); }}
        onCreateEditor={function onCreate(view) { editorViewRef.current = view; }}
        height="100%"
        minHeight="300px"
        theme={undefined}
        extensions={extensions}
        basicSetup={{ lineNumbers: true }}
      />
    </div>
  );
});

export { MarkdownEditor as default };
