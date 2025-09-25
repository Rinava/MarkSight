import { sendGAEvent } from "@next/third-parties/google";

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

interface DocumentMetrics {
  wordCount: number;
  characterCount: number;
  lineCount: number;
  headingCount: number;
  linkCount: number;
  imageCount: number;
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

export function calculateDocumentMetrics(content: string): DocumentMetrics {
  const lines = content.split('\n');
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const characters = content.length;
  const headings = (content.match(/^#+\s/gm) || []).length;
  const links = (content.match(/\[([^\]]+)\]\([^)]+\)/g) || []).length;
  const images = (content.match(/!\[([^\]]*)\]\([^)]+\)/g) || []).length;

  return {
    wordCount: words.length,
    characterCount: characters,
    lineCount: lines.length,
    headingCount: headings,
    linkCount: links,
    imageCount: images,
  };
}
