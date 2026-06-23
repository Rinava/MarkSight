"use client";

import { createContext, useContext, useMemo, useState, ReactNode } from "react";

interface ContentContextType {
  content: string;
  setContent: (content: string) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState("");

  const value = useMemo(() => ({ content, setContent }), [content]);

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
