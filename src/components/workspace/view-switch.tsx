"use client";

import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Pencil, Columns2, Eye, SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export type ViewMode = "edit" | "split" | "preview";

/** Phone-only segment that brings the skill inspector to the front. */
const INSPECTOR = "inspector";

const OPTIONS = [
  { value: "edit", label: "Editor only", Icon: Pencil, className: "" },
  // Side by side doesn't fit a phone, so the segment is desktop-only.
  { value: "split", label: "Split view", Icon: Columns2, className: "max-md:hidden" },
  { value: "preview", label: "Preview only", Icon: Eye, className: "" },
] as const;

const SEGMENT =
  "text-ms-muted-2 hover:text-ms-primary-strong data-[pressed]:bg-ms-surface data-[pressed]:text-ms-primary-ink flex h-7 w-8 items-center justify-center rounded-md transition-colors data-[pressed]:shadow-sm max-md:h-8 max-md:w-9";

export interface ViewSwitchProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  /** Skill mode is on, so phones get an extra "Skill details" segment. */
  showInspector?: boolean;
  inspectorOpen?: boolean;
  onInspectorOpenChange?: (open: boolean) => void;
}

export function ViewSwitch({
  view,
  onChange,
  showInspector = false,
  inspectorOpen = false,
  onInspectorOpenChange,
}: ViewSwitchProps) {
  const isMobile = useIsMobile();

  // On a phone "split" renders as the editor alone, so light up that segment.
  const mobileView = view === "split" ? "edit" : view;
  const active = isMobile ? (showInspector && inspectorOpen ? INSPECTOR : mobileView) : view;

  return (
    <ToggleGroup
      value={[active]}
      onValueChange={(values) => {
        // Single-select: keep one segment always active (ignore deselection).
        const next = values[0] as ViewMode | typeof INSPECTOR | undefined;
        if (!next) return;
        if (next === INSPECTOR) {
          onInspectorOpenChange?.(true);
          return;
        }
        onInspectorOpenChange?.(false);
        onChange(next);
      }}
      aria-label="Editor view"
      className="border-ms-border-2 bg-ms-tint-2 flex flex-none items-center gap-0.5 rounded-lg border p-[3px]"
    >
      {OPTIONS.map(({ value, label, Icon, className }) => (
        <Toggle
          key={value}
          value={value}
          title={label}
          aria-label={label}
          className={`${SEGMENT} ${className}`}
        >
          <Icon className="h-[15px] w-[15px]" />
        </Toggle>
      ))}
      {showInspector && (
        <Toggle
          value={INSPECTOR}
          title="Skill details"
          aria-label="Skill details"
          className={`${SEGMENT} md:hidden`}
        >
          <SlidersHorizontal className="h-[15px] w-[15px]" />
        </Toggle>
      )}
    </ToggleGroup>
  );
}
