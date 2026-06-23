"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { MotionConfig } from "framer-motion";
import { type ReactNode } from "react";

export interface ThemeProviderProps {
  children: ReactNode;
  nonce?: string;
}

export function ThemeProvider({ children, nonce }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="marksight-theme"
      nonce={nonce}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
