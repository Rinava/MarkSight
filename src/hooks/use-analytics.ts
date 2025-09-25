import { useCallback } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { 
  trackDocumentMetrics, 
  calculateDocumentMetrics,
  trackExport,
  trackThemeToggle,
  trackEditorAction,
  trackToolbarAction,
  trackKeyboardShortcut,
  trackDocumentReset,
  trackDocumentClear,
  trackPreviewToggle,
  trackSidebarToggle
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

  const trackThemeChange = useCallback((theme: 'light' | 'dark') => {
    trackThemeToggle(theme);
  }, []);

  const trackEditorInteraction = useCallback((action: string, details?: string) => {
    trackEditorAction(action, details);
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

  const trackPreview = useCallback(() => {
    trackPreviewToggle();
  }, []);

  const trackSidebar = useCallback(() => {
    trackSidebarToggle();
  }, []);

  return {
    trackDocumentChange,
    trackExportAction,
    trackThemeChange,
    trackEditorInteraction,
    trackToolbarInteraction,
    trackShortcut,
    trackReset,
    trackClear,
    trackPreview,
    trackSidebar,
  };
}

export function useDocumentAnalytics(content: string, debounceMs: number = 2000) {
  const debouncedContent = useDebouncedValue(content, { delayMs: debounceMs });
  
  const trackDocumentChange = useCallback((content: string) => {
    const metrics = calculateDocumentMetrics(content);
    trackDocumentMetrics(metrics);
  }, []);

  // Track document changes with debouncing
  useCallback(() => {
    if (debouncedContent && debouncedContent !== content) {
      trackDocumentChange(debouncedContent);
    }
  }, [debouncedContent, content, trackDocumentChange])();

  return {
    trackDocumentChange,
  };
}
