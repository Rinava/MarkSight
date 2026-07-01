"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileDown, Package, PackagePlus, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deriveSkillMeta } from "@/lib/skill/derive";
import { buildSkillMd } from "@/lib/skill/build";
import { validateSkill } from "@/lib/skill/validate";
import { packageSkill } from "@/lib/skill/package";

export interface SkillCreatorDialogProps {
  content: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function SkillCreatorDialog({ content }: SkillCreatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);

  const { meta, skillMd, validation } = useMemo(() => {
    const derived = deriveSkillMeta(content);
    return {
      meta: derived,
      skillMd: buildSkillMd(derived, content),
      validation: validateSkill({
        name: derived.name,
        description: derived.description,
      }),
    };
  }, [content]);

  const disabled = !validation.valid;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(skillMd);
      toast.success("SKILL.md copied", {
        description: "Paste it into Claude or another assistant.",
      });
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  function handleDownloadMarkdown() {
    downloadBlob(new Blob([skillMd], { type: "text/markdown" }), "SKILL.md");
    toast.success("SKILL.md downloaded");
  }

  async function handleDownloadSkill() {
    setIsPackaging(true);
    try {
      const bytes = await packageSkill(meta, content);
      downloadBlob(
        new Blob([bytes as BlobPart], { type: "application/zip" }),
        `${meta.name}.skill`,
      );
      toast.success(`${meta.name}.skill downloaded`, {
        description: "Unzip into ~/.claude/skills/ or upload to claude.ai.",
      });
    } catch {
      toast.error("Couldn't package the skill");
    } finally {
      setIsPackaging(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Create Skill"
            className="h-8 w-8 p-0"
            onClick={() => setOpen(true)}
          >
            <PackagePlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Create Skill
            <span className="ml-2 text-xs text-muted-foreground">⌘⇧K</span>
          </p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Skill</DialogTitle>
          <DialogDescription>
            Package this document as an Agent Skill that Claude and other AIs can
            receive. Metadata is auto-derived from your document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-mono text-muted-foreground">
            {meta.name}/SKILL.md
          </span>
          {validation.valid ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
              <Check className="h-4 w-4" /> Valid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-destructive">
              <TriangleAlert className="h-4 w-4" />
              {validation.errors.length} issue
              {validation.errors.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {!validation.valid && (
          <ul className="list-disc space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 pl-7 text-xs text-destructive">
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        <pre className="max-h-[50vh] overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap break-words">
          {skillMd}
        </pre>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={disabled}
          >
            <Copy className="h-4 w-4" /> Copy SKILL.md
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
            disabled={disabled}
          >
            <FileDown className="h-4 w-4" /> Download SKILL.md
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadSkill}
            disabled={disabled || isPackaging}
          >
            <Package className="h-4 w-4" />
            {isPackaging ? "Packaging…" : "Download .skill"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
