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
  trackDocumentClear,
} from "@/lib/analytics";

// Module-level, so every caller gets the same function identities and they
// are safe to list in effect/callback dependency arrays without useCallback.
const analytics = {
  trackDocumentChange(content: string) {
    trackDocumentMetrics(calculateDocumentMetrics(content));
  },
  trackExportAction(format: "html" | "pdf", content: string) {
    trackExport(format, calculateDocumentMetrics(content).wordCount);
  },
  trackSkillAction(kind: "copy" | "md" | "skill" | "ai-improve") {
    trackSkillCreate(kind);
  },
  trackThemeChange(theme: "light" | "dark") {
    trackThemeToggle(theme);
  },
  // `details` is accepted for call-site compatibility but intentionally
  // dropped: document text must never reach analytics.
  trackEditorInteraction(action: string, details?: string) {
    void details;
    trackEditorAction(action);
  },
  trackToolbarInteraction(action: string) {
    trackToolbarAction(action);
  },
  trackShortcut(shortcut: string) {
    trackKeyboardShortcut(shortcut);
  },
  trackReset() {
    trackDocumentReset();
  },
  trackClear() {
    trackDocumentClear();
  },
};

export function useAnalytics() {
  return analytics;
}
