import { sendGAEvent } from "@next/third-parties/google";
import { documentMetrics, type DocumentMetrics } from "@/lib/markdown/metrics";

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

export function trackEvent(event: AnalyticsEvent) {
  sendGAEvent('event', event.action, {
    event_category: event.category,
    event_label: event.label,
    value: event.value,
  });
}

export function trackDocumentMetrics(metrics: DocumentMetrics) {
  trackEvent({
    action: 'document_metrics',
    category: 'document',
    label: 'metrics_update',
    value: metrics.wordCount,
  });
}

export function trackExport(format: 'html' | 'pdf', wordCount: number) {
  trackEvent({
    action: 'export',
    category: 'document',
    label: format,
    value: wordCount,
  });
}

export function trackSkillCreate(kind: 'copy' | 'md' | 'skill' | 'ai-improve') {
  trackEvent({
    action: 'skill_create',
    category: 'document',
    label: kind,
  });
}

export function trackThemeToggle(theme: 'light' | 'dark') {
  trackEvent({
    action: 'theme_toggle',
    category: 'ui',
    label: theme,
  });
}

export function trackEditorAction(action: string, details?: string) {
  trackEvent({
    action: 'editor_action',
    category: 'editor',
    label: details ? `${action}: ${details}` : action,
  });
}

export function trackToolbarAction(action: string) {
  trackEvent({
    action: 'toolbar_action',
    category: 'editor',
    label: action,
  });
}

export function trackKeyboardShortcut(shortcut: string) {
  trackEvent({
    action: 'keyboard_shortcut',
    category: 'editor',
    label: shortcut,
  });
}

export function trackDocumentReset() {
  trackEvent({
    action: 'document_reset',
    category: 'document',
    label: 'reset_to_default',
  });
}

export function trackDocumentClear() {
  trackEvent({
    action: 'document_clear',
    category: 'document',
    label: 'clear_content',
  });
}

export function trackPreviewToggle() {
  trackEvent({
    action: 'preview_toggle',
    category: 'ui',
    label: 'toggle_preview',
  });
}

export function trackSidebarToggle() {
  trackEvent({
    action: 'sidebar_toggle',
    category: 'ui',
    label: 'toggle_sidebar',
  });
}

export const calculateDocumentMetrics = documentMetrics;
