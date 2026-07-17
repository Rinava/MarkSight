"use client";

import { useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { EditorView, placeholder } from "@codemirror/view";
import { MarkdownToolbar } from "./markdown-toolbar";
import { useAnalytics } from "@/hooks/use-analytics";
import { useTheme } from "next-themes";

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  showToolbar?: boolean;
  /**
   * Workspace variant: transparent background, no line-number gutter, and the
   * design's editor padding. The surrounding pane supplies the chrome, so the
   * card ring/toolbar are dropped.
   */
  bare?: boolean;
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
  function MarkdownEditor({ value, onChange, showToolbar = true, bare = false }, ref) {
    const [isFocused, setIsFocused] = useState(false);
    // Bumped on each CodeMirror selection change so the toolbar re-evaluates active
    // formatting — selection updates don't flow through React's render cycle.
    const [selectionVersion, setSelectionVersion] = useState(0);
    const editorViewRef = useRef<EditorView | null>(null);
    const { trackEditorInteraction } = useAnalytics();
    const { resolvedTheme } = useTheme();

    const extensions = useMemo(
      function mkExtensions() {
        const base = [
          markdown({ base: markdownLanguage }),
          placeholder("Start typing Markdown… try **bold** or # Heading"),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": "Markdown editor" }),
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) setSelectionVersion((v) => v + 1);
          }),
        ];
        if (bare) {
          base.push(
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
            })
          );
          return base;
        }
        base.push(
          EditorView.theme({
            "&": {
              fontSize: "14px",
              backgroundColor: "var(--card)",
              color: "var(--foreground)",
              fontFamily:
                "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            },
            ".cm-content": { padding: "12px" },
            ".cm-placeholder": {
              color: "var(--muted-foreground)",
            },
            ".cm-gutters": {
              backgroundColor: "transparent",
              color: "var(--muted-foreground)",
              borderRight: "1px solid var(--border)",
            },
            ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px" },
            ".cm-activeLine": {
              backgroundColor: "color-mix(in oklch, var(--muted) 100%, transparent)",
            },
            ".cm-selectionBackground": {
              backgroundColor: "color-mix(in oklch, var(--primary) 25%, transparent)",
            },
            "&.cm-focused .cm-selectionBackground": {
              backgroundColor: "color-mix(in oklch, var(--primary) 37.5%, transparent)",
            },
            ".cm-cursor": { borderLeftColor: "var(--accent)" },
          })
        );
        return base;
      },
      [bare]
    );

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

    const handleToolbarInsert = useCallback(
      function handleInsert(
        text: string,
        cursorOffset?: number,
        replaceFrom?: number,
        replaceTo?: number
      ) {
        insertText(text, cursorOffset, replaceFrom, replaceTo);
        trackEditorInteraction("toolbar_insert", text);
      },
      [insertText, trackEditorInteraction]
    );

    const editor = (
      <CodeMirror
        value={value}
        onChange={handleChange}
        onFocus={function onF() {
          setIsFocused(true);
        }}
        onBlur={function onB() {
          setIsFocused(false);
        }}
        onCreateEditor={function onCreate(view) {
          editorViewRef.current = view;
        }}
        height="100%"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        extensions={extensions}
        basicSetup={
          bare
            ? {
                lineNumbers: false,
                foldGutter: false,
                highlightActiveLine: false,
                highlightActiveLineGutter: false,
              }
            : { lineNumbers: true }
        }
        className="h-full [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:overflow-auto"
      />
    );

    if (bare) {
      return <div className="min-h-0 flex-1 overflow-hidden">{editor}</div>;
    }

    return (
      <div
        className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md transition-shadow duration-300 ease-in-out ${
          isFocused
            ? "ring-primary shadow-lg ring-2"
            : "ring-border hover:ring-primary/50 ring-1 hover:ring-2"
        }`}
      >
        {showToolbar && (
          <MarkdownToolbar
            onInsert={handleToolbarInsert}
            getCurrentContext={getCurrentContext}
            selectionVersion={selectionVersion}
          />
        )}
        <div className="min-h-0 flex-1 overflow-hidden">{editor}</div>
      </div>
    );
  }
);

export { MarkdownEditor as default };
