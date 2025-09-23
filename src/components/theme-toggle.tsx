"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface ThemeToggleProps {}

export function ThemeToggle({}: ThemeToggleProps) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(function mount() {
    setMounted(true);
  }, []);

  const next = useCallback(function nextTheme() {
    const current = theme === "system" ? systemTheme ?? "light" : theme ?? "light";
    const target = current === "dark" ? "light" : "dark";
    setTheme(target);
  }, [theme, systemTheme, setTheme]);

  if (!mounted) return null;

  return (
    <Button variant="ghost" onClick={next} aria-label="Toggle theme">
      {theme === "dark" || (theme === "system" && systemTheme === "dark") ? "🌙" : "☀️"}
    </Button>
  );
}
