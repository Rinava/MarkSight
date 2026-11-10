"use client";

import { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView, placeholder } from "@codemirror/view";
import { useTheme } from "next-themes";

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
}

export interface MarkdownEditorRef {
  insertText: (
    text: string,
    cursorOffset?: number,
    replaceFrom?: number,
    replaceTo?: number
  ) => void;
  getCurrentContext: () => { text: string; selection: { from: number; to: number } };
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange }, ref) {
    const editorViewRef = useRef<EditorView | null>(null);
    const { resolvedTheme } = useTheme();

    // The surrounding pane supplies the chrome, so the editor itself is
    // transparent, has no line-number gutter, and uses the design's padding.
    const extensions = useMemo(function mkExtensions() {
      return [
        markdown({ base: markdownLanguage }),
        placeholder("Start typing Markdown… try **bold** or # Heading"),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": "Markdown editor" }),
        EditorView.theme({
          "&": {
            fontSize: "14px",
            backgroundColor: "transparent",
            color: "var(--ms-ink-body)",
            height: "100%",
            fontFamily:
              "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          },
          "&.cm-focused": { outline: "none" },
          ".cm-content": {
            padding: "16px 20px",
            lineHeight: "1.75",
            caretColor: "var(--ms-primary)",
          },
          ".cm-placeholder": {
            color: "var(--muted-foreground)",
          },
          ".cm-scroller": { lineHeight: "1.75" },
          ".cm-activeLine": { backgroundColor: "transparent" },
          ".cm-selectionBackground": {
            backgroundColor: "color-mix(in srgb, var(--ms-primary) 22%, transparent)",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: "color-mix(in srgb, var(--ms-primary) 34%, transparent)",
          },
          ".cm-cursor": { borderLeftColor: "var(--ms-primary)" },
        }),
      ];
    }, []);

    const handleChange = useCallback(
      function handle(next: string) {
        onChange(next);
      },
      [onChange]
    );

    const insertText = useCallback(function insert(
      text: string,
      cursorOffset?: number,
      replaceFrom?: number,
      replaceTo?: number
    ) {
      if (!editorViewRef.current) return;

      const view = editorViewRef.current;
      const selection = view.state.selection.main;

      const from = replaceFrom ?? selection.from;
      const to = replaceTo ?? selection.to;

      const changes = {
        from,
        to,
        insert: text,
      };

      const newPosition = from + (cursorOffset ?? text.length);

      view.dispatch({
        changes,
        selection: {
          anchor: newPosition,
          head: newPosition,
        },
      });

      view.focus();
    }, []);

    const getCurrentContext = useCallback(
      function getContext() {
        if (!editorViewRef.current) {
          return { text: value, selection: { from: 0, to: 0 } };
        }

        const view = editorViewRef.current;
        const selection = view.state.selection.main;

        return {
          text: view.state.doc.toString(),
          selection: { from: selection.from, to: selection.to },
        };
      },
      [value]
    );

    useImperativeHandle(
      ref,
      function getRef() {
        return { insertText, getCurrentContext };
      },
      [insertText, getCurrentContext]
    );

    return (
      <div className="min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          value={value}
          onChange={handleChange}
          onCreateEditor={function onCreate(view) {
            editorViewRef.current = view;
          }}
          height="100%"
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          extensions={extensions}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
          }}
          className="h-full [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:overflow-auto"
        />
      </div>
    );
  }
);

export { MarkdownEditor as default };
