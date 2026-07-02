"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  FileDown,
  FilePlus2,
  FileUp,
  Import,
  Lightbulb,
  ListChecks,
  Loader2,
  Package,
  PackagePlus,
  Terminal,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAnalytics } from "@/hooks/use-analytics";
import { deriveSkillMeta } from "@/lib/skill/derive";
import { buildSkillMd, stripLeadingFrontmatter, parseSkillFrontmatter } from "@/lib/skill/build";
import { validateSkill } from "@/lib/skill/validate";
import { packageSkill } from "@/lib/skill/package";
import { importSkillBundle, importSkillMd, type ImportedSkill } from "@/lib/skill/import";
import { skillQualityHints } from "@/lib/skill/hints";
import {
  buildKnowledgeSkillMd,
  knowledgeDocFile,
  knowledgeSkillBody,
  suggestSkillMode,
  type SkillMode,
} from "@/lib/skill/knowledge";
import { SKILL_TEMPLATE } from "@/lib/skill/template";
import {
  fetchFromGitHub,
  importSkillDir,
  MARKETPLACE_SOURCES,
  type DiscoveredSkill,
  type GitHubRef,
} from "@/lib/skill/marketplace";
import type { SkillMeta } from "@/lib/skill/types";

export interface SkillCreatorDialogProps {
  content: string;
  /** Replace the editor document (used by skill import). */
  onImportDocument?: (markdown: string) => void;
}

interface ExtraFile {
  path: string;
  data: Uint8Array;
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

export function SkillCreatorDialog({
  content,
  onImportDocument,
}: SkillCreatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [extraFiles, setExtraFiles] = useState<ExtraFile[]>([]);
  const [discovered, setDiscovered] = useState<{
    gh: GitHubRef;
    skills: DiscoveredSkill[];
  } | null>(null);
  const [userMode, setUserMode] = useState<SkillMode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { trackSkillAction } = useAnalytics();

  const { meta, skillMd, validation, hints, mode, suggestedMode } = useMemo(() => {
    // Explicit frontmatter in the document wins (preserves imported/hand-written
    // metadata); derivation from H1/first-paragraph is the fallback.
    const { frontmatter } = stripLeadingFrontmatter(content);
    const fm = frontmatter ? parseSkillFrontmatter(frontmatter) : {};
    const derived = deriveSkillMeta(content);

    const merged: SkillMeta = {
      name: fm.name?.trim() || derived.name,
      description: fm.description?.trim() || derived.description,
      license: fm.license,
      allowedTools: fm["allowed-tools"],
      compatibility: fm.compatibility,
    };

    const suggested = suggestSkillMode(content);
    const effectiveMode = userMode ?? suggested;

    return {
      meta: merged,
      mode: effectiveMode,
      suggestedMode: suggested,
      skillMd:
        effectiveMode === "knowledge"
          ? buildKnowledgeSkillMd(merged)
          : buildSkillMd(merged, content),
      validation: validateSkill({
        ...fm,
        name: merged.name,
        description: merged.description,
      }),
      // Body hints apply to what actually becomes the skill body; the generated
      // knowledge pointer is instruction-shaped by construction.
      hints: skillQualityHints(
        merged,
        effectiveMode === "knowledge" ? knowledgeSkillBody() : content,
      ),
    };
  }, [content, userMode]);

  const disabled = !validation.valid;
  const installCommand = `unzip -o ~/Downloads/${meta.name}.skill -d ~/.claude/skills/`;

  // ⌘⇧K / Ctrl+Shift+K opens the dialog (matches the toolbar tooltip).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
      return true;
    } catch {
      toast.error("Couldn't copy to clipboard");
      return false;
    }
  }

  async function handleCopy() {
    const copied = await copyText(
      skillMd,
      "SKILL.md copied — paste it into Claude or another assistant.",
    );
    if (copied) trackSkillAction("copy");
  }

  function handleDownloadMarkdown() {
    downloadBlob(new Blob([skillMd], { type: "text/markdown" }), "SKILL.md");
    toast.success("SKILL.md downloaded");
    trackSkillAction("md");
  }

  async function handleDownloadSkill() {
    setIsPackaging(true);
    try {
      const bytes =
        mode === "knowledge"
          ? await packageSkill(meta, knowledgeSkillBody(), [
              knowledgeDocFile(content),
              ...extraFiles,
            ])
          : await packageSkill(meta, content, extraFiles);
      downloadBlob(
        new Blob([bytes as BlobPart], { type: "application/zip" }),
        `${meta.name}.skill`,
      );
      toast.success(`${meta.name}.skill downloaded`);
      trackSkillAction("skill");
    } catch {
      toast.error("Couldn't package the skill");
    } finally {
      setIsPackaging(false);
    }
  }

  function applyImport(imported: ImportedSkill, sourceLabel: string) {
    if (!onImportDocument) return;
    onImportDocument(imported.markdown);
    setExtraFiles(imported.extraFiles);
    setUserMode("instruction"); // an existing skill is already instruction-shaped
    setDiscovered(null);
    setImportUrl("");
    toast.success(`Imported ${sourceLabel}`, {
      description:
        imported.extraFiles.length > 0
          ? `${imported.extraFiles.length} bundled file(s) will be preserved on export.`
          : undefined,
    });
  }

  async function handleImportFile(file: File) {
    setIsImporting(true);
    try {
      if (/\.(skill|zip)$/i.test(file.name)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        applyImport(await importSkillBundle(bytes), file.name);
      } else {
        applyImport(importSkillMd(await file.text()), file.name);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleImportUrl(url: string) {
    if (!url.trim()) return;
    setIsImporting(true);
    setDiscovered(null);
    try {
      const result = await fetchFromGitHub(url);
      if (result.kind === "skill") {
        applyImport(result.skill, result.skill.rootDir ?? "skill");
      } else {
        setDiscovered({ gh: result.gh, skills: result.skills });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }

  async function handlePickDiscovered(skill: DiscoveredSkill) {
    if (!discovered) return;
    setIsImporting(true);
    try {
      applyImport(await importSkillDir(discovered.gh, skill.path), skill.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
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

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Skill</DialogTitle>
          <DialogDescription>
            Package this document as an Agent Skill that Claude and other AIs can
            receive — or import an existing skill to modify it. Frontmatter in
            the document overrides the auto-derived metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-mono text-muted-foreground">
            {meta.name}/SKILL.md
          </span>
          {validation.valid ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
              <Check className="h-4 w-4" aria-hidden="true" /> Valid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-destructive">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              {validation.errors.length} issue
              {validation.errors.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div
          role="radiogroup"
          aria-label="Skill packaging mode"
          className="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <Button
            role="radio"
            aria-checked={mode === "instruction"}
            variant={mode === "instruction" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setUserMode("instruction")}
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            Instructions
            {suggestedMode === "instruction" ? (
              <span className="text-muted-foreground">· suggested</span>
            ) : null}
          </Button>
          <Button
            role="radio"
            aria-checked={mode === "knowledge"}
            variant={mode === "knowledge" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setUserMode("knowledge")}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Knowledge
            {suggestedMode === "knowledge" ? (
              <span className="text-muted-foreground">· suggested</span>
            ) : null}
          </Button>
          <span className="text-muted-foreground">
            {mode === "knowledge"
              ? `Doc ships as ${"references/document.md"}; SKILL.md points to it.`
              : "Your document is the skill's instructions."}
          </span>
        </div>

        {validation.valid ? null : (
          <ul className="list-disc space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 pl-7 text-xs text-destructive">
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        {hints.length > 0 ? (
          <ul
            aria-label="Skill quality hints"
            className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
          >
            {hints.map((hint) => (
              <li key={hint.id} className="flex gap-1.5">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{hint.message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <pre
          aria-label="Generated SKILL.md preview"
          className="max-h-[30vh] overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap break-words"
        >
          {skillMd}
        </pre>

        {extraFiles.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">Bundled files (preserved):</span>
            {extraFiles.map((file) => (
              <span
                key={file.path}
                className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono"
              >
                {file.path}
              </span>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-xs"
              onClick={() => setExtraFiles([])}
            >
              <X className="h-3 w-3" aria-hidden="true" /> Clear
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={disabled}
          >
            <Copy className="h-4 w-4" aria-hidden="true" /> Copy SKILL.md
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadMarkdown}
            disabled={disabled}
          >
            <FileDown className="h-4 w-4" aria-hidden="true" /> Download SKILL.md
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadSkill}
            disabled={disabled || isPackaging}
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            {isPackaging ? "Packaging…" : "Download .skill"}
          </Button>
        </div>

        {onImportDocument ? (
          <section
            aria-labelledby="import-skill-heading"
            className="space-y-2.5 rounded-md border p-3"
          >
            <h3
              id="import-skill-heading"
              className="inline-flex items-center gap-1.5 text-sm font-medium leading-none"
            >
              <Import className="h-4 w-4" aria-hidden="true" /> Import a skill
            </h3>
            <p className="text-xs text-muted-foreground">
              Open a <span className="font-mono">.skill</span>/
              <span className="font-mono">.zip</span> bundle or a{" "}
              <span className="font-mono">SKILL.md</span>, or fetch from a
              public GitHub repo — edit it here, then re-export. Replaces the
              current document.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                inputMode="url"
                placeholder="https://github.com/anthropics/skills"
                aria-label="GitHub URL of a skill, folder, or repository"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImportUrl(importUrl);
                }}
                className="h-8 flex-1 text-xs"
                disabled={isImporting}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImportUrl(importUrl)}
                  disabled={isImporting || !importUrl.trim()}
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Import className="h-4 w-4" aria-hidden="true" />
                  )}
                  Fetch
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <FileUp className="h-4 w-4" aria-hidden="true" /> Open file
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isImporting}
                      onClick={() => {
                        onImportDocument(SKILL_TEMPLATE);
                        setExtraFiles([]);
                        setUserMode("instruction");
                        toast.success("Skill template loaded", {
                          description: "Replace the placeholders, then export.",
                        });
                      }}
                    >
                      <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Template
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Start a new skill from a well-shaped template</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".skill,.zip,.md,.markdown"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Browse:</span>
              {MARKETPLACE_SOURCES.map((source) => (
                <Button
                  key={source.url}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={isImporting}
                  onClick={() => {
                    setImportUrl(source.url);
                    handleImportUrl(source.url);
                  }}
                >
                  {source.label}
                </Button>
              ))}
            </div>

            {discovered ? (
              <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border bg-muted/20 p-1.5">
                <p className="px-1.5 pb-1 text-xs text-muted-foreground">
                  {discovered.skills.length} skill
                  {discovered.skills.length === 1 ? "" : "s"} found — pick one:
                </p>
                {discovered.skills.map((skill) => (
                  <Button
                    key={skill.path}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-full justify-start px-2 font-mono text-xs"
                    disabled={isImporting}
                    onClick={() => handlePickDiscovered(skill)}
                  >
                    {skill.name}
                    <span className="ml-2 truncate text-muted-foreground">
                      {skill.path}
                    </span>
                  </Button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section
          aria-labelledby="add-to-claude-heading"
          className="space-y-3 rounded-md border p-3"
        >
          <h3
            id="add-to-claude-heading"
            className="text-sm font-medium leading-none"
          >
            Add to Claude
          </h3>

          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Terminal className="h-3.5 w-3.5" aria-hidden="true" /> Claude Code
            </p>
            <div className="flex items-center gap-1.5">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/40 px-2 py-1.5 font-mono text-xs whitespace-nowrap">
                {installCommand}
              </code>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Copy install command"
                    className="h-7 w-7 shrink-0 p-0"
                    onClick={() => copyText(installCommand, "Install command copied")}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy install command</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              Download the <span className="font-mono">.skill</span> first, then run
              this. The skill loads next session (or after{" "}
              <span className="font-mono">/reload-plugins</span>).
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" /> claude.ai
            </p>
            <p className="text-xs text-muted-foreground">
              Settings › Capabilities › Skills › Upload skill →{" "}
              <span className="font-mono">{meta.name}.skill</span>
            </p>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
