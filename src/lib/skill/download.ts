"use client";

import { toast } from "sonner";
import { packageSkillForMode } from "./draft";
import { type SkillMode } from "./knowledge";
import type { SkillExtraFile, SkillMeta } from "./types";

/**
 * One-click skill export shared by the toolbar button and the sidebar panel:
 * package per mode, trigger the browser download, and toast the install steps
 * (with a copy-command action).
 */
export async function downloadSkillBundle({
  meta,
  content,
  mode,
  extraFiles = [],
}: {
  meta: SkillMeta;
  content: string;
  mode: SkillMode;
  extraFiles?: SkillExtraFile[];
}): Promise<void> {
  const bytes = await packageSkillForMode(meta, content, mode, extraFiles);

  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meta.name}.skill`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const installCommand = `unzip -o ~/Downloads/${meta.name}.skill -d ~/.claude/skills/`;
  toast.success(`${meta.name}.skill downloaded`, {
    description:
      "Claude Code: run the install command. claude.ai: Settings › Capabilities › Skills › Upload.",
    action: {
      label: "Copy command",
      onClick: () => {
        navigator.clipboard.writeText(installCommand).catch(() => {});
      },
    },
  });
}
