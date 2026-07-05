"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

interface ContentContextType {
  content: string;
  setContent: (content: string) => void;
  /** Replace the editor document (no-op until the editor registers a handler). */
  replaceDocument: (markdown: string) => void;
  /** Called by the editor page to receive document replacements (import, template). */
  registerDocumentReplacer: (handler: ((markdown: string) => void) | null) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState("");
  const replacerRef = useRef<((markdown: string) => void) | null>(null);

  const replaceDocument = useCallback((markdown: string) => {
    replacerRef.current?.(markdown);
  }, []);

  const registerDocumentReplacer = useCallback(
    (handler: ((markdown: string) => void) | null) => {
      replacerRef.current = handler;
    },
    [],
  );

  const value = useMemo(
    () => ({ content, setContent, replaceDocument, registerDocumentReplacer }),
    [content, replaceDocument, registerDocumentReplacer],
  );

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error("useContent must be used within a ContentProvider");
  }
  return context;
}
