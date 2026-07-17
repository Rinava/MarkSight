"use client";

import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Pencil, Columns2, Eye } from "lucide-react";

export type ViewMode = "edit" | "split" | "preview";

const OPTIONS = [
  { value: "edit", label: "Editor only", Icon: Pencil },
  { value: "split", label: "Split view", Icon: Columns2 },
  { value: "preview", label: "Preview only", Icon: Eye },
] as const;

export function ViewSwitch({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  return (
    <ToggleGroup
      value={[view]}
      onValueChange={(values) => {
        // Single-select: keep one segment always active (ignore deselection).
        const next = values[0] as ViewMode | undefined;
        if (next) onChange(next);
      }}
      aria-label="Editor view"
      className="border-ms-border-2 bg-ms-tint-2 flex items-center gap-0.5 rounded-lg border p-[3px]"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <Toggle
          key={value}
          value={value}
          title={label}
          aria-label={label}
          className="text-ms-muted-2 hover:text-ms-primary-strong data-[pressed]:bg-ms-surface data-[pressed]:text-ms-primary-ink flex h-7 w-8 items-center justify-center rounded-md transition-colors data-[pressed]:shadow-sm"
        >
          <Icon className="h-[15px] w-[15px]" />
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
