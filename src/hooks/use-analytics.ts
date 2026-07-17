import { useCallback } from "react";
import {
  trackDocumentMetrics,
  calculateDocumentMetrics,
  trackExport,
  trackSkillCreate,
  trackThemeToggle,
  trackEditorAction,
  trackToolbarAction,
  trackKeyboardShortcut,
  trackDocumentReset,
  trackDocumentClear
} from "@/lib/analytics";

export function useAnalytics() {
  const trackDocumentChange = useCallback((content: string) => {
    const metrics = calculateDocumentMetrics(content);
    trackDocumentMetrics(metrics);
  }, []);

  const trackExportAction = useCallback((format: 'html' | 'pdf', content: string) => {
    const metrics = calculateDocumentMetrics(content);
    trackExport(format, metrics.wordCount);
  }, []);

  const trackSkillAction = useCallback((kind: 'copy' | 'md' | 'skill' | 'ai-improve') => {
    trackSkillCreate(kind);
  }, []);

  const trackThemeChange = useCallback((theme: 'light' | 'dark') => {
    trackThemeToggle(theme);
  }, []);

  const trackEditorInteraction = useCallback((action: string, details?: string) => {
    // `details` is accepted for call-site compatibility but intentionally
    // dropped — document text must never reach analytics.
    void details;
    trackEditorAction(action);
  }, []);

  const trackToolbarInteraction = useCallback((action: string) => {
    trackToolbarAction(action);
  }, []);

  const trackShortcut = useCallback((shortcut: string) => {
    trackKeyboardShortcut(shortcut);
  }, []);

  const trackReset = useCallback(() => {
    trackDocumentReset();
  }, []);

  const trackClear = useCallback(() => {
    trackDocumentClear();
  }, []);

  return {
    trackDocumentChange,
    trackExportAction,
    trackSkillAction,
    trackThemeChange,
    trackEditorInteraction,
    trackToolbarInteraction,
    trackShortcut,
    trackReset,
    trackClear,
  };
}
