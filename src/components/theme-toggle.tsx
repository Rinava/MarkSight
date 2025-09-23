"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

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

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  return (
    <Button variant="ghost" onClick={next} aria-label="Toggle theme" className="relative overflow-hidden">
      <motion.div
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </motion.div>
    </Button>
  );
}
