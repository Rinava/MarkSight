"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Tip } from "@/components/ui/base/tooltip";
import { useAnalytics } from "@/hooks/use-analytics";

const BTN =
  "flex h-9 w-9 items-center justify-center rounded-[9px] border border-ms-border-2 bg-ms-surface text-ms-label transition-colors hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { trackThemeChange } = useAnalytics();

  useEffect(function mount() {
    setMounted(true);
  }, []);

  const next = useCallback(
    function nextTheme() {
      const current =
        theme === "system" ? systemTheme ?? "light" : theme ?? "light";
      const target = current === "dark" ? "light" : "dark";
      setTheme(target);
      trackThemeChange(target as "light" | "dark");
    },
    [theme, systemTheme, setTheme, trackThemeChange],
  );

  if (!mounted) return <div className={BTN} aria-hidden="true" />;

  const isDark =
    theme === "dark" || (theme === "system" && systemTheme === "dark");

  return (
    <Tip label="Toggle theme">
      <button type="button" onClick={next} aria-label="Toggle theme" className={BTN}>
        {isDark ? (
          <Moon className="h-[17px] w-[17px]" />
        ) : (
          <Sun className="h-[17px] w-[17px]" />
        )}
      </button>
    </Tip>
  );
}
