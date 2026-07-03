"use client";

import { useTheme } from "next-themes";
import { useCallback, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

// Server renders false, client renders true after hydration — gates theme UI
// until we can read the resolved theme without a hydration mismatch.
const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const { trackThemeChange } = useAnalytics();

  const next = useCallback(function nextTheme() {
    const current = theme === "system" ? systemTheme ?? "light" : theme ?? "light";
    const target = current === "dark" ? "light" : "dark";
    setTheme(target);
    trackThemeChange(target as 'light' | 'dark');
  }, [theme, systemTheme, setTheme, trackThemeChange]);

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
