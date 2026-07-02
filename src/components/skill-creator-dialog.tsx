"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  FileDown,
  FilePlus2,
  FileText,
  FileUp,
  Import,
  Lightbulb,
  ListChecks,
  Loader2,
  Package,
  PackagePlus,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAnalytics } from "@/hooks/use-analytics";
import { deriveSkillMeta } from "@/lib/skill/derive";
import {
  buildSkillMd,
  parseSkillFrontmatter,
  stripLeadingFrontmatter,
} from "@/lib/skill/build";
import { validateSkill } from "@/lib/skill/validate";
import { packageSkill } from "@/lib/skill/package";
import {
  importSkillBundle,
  importSkillMd,
  type ImportedSkill,
} from "@/lib/skill/import";
import { skillQualityHints } from "@/lib/skill/hints";
import {
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

export interface SkillCreatorDialogProps {
  content: string;
  /** Replace the editor document (used by skill import / template). */
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

/** Seed metadata: explicit document frontmatter wins, derivation is fallback. */
function seedMeta(content: string) {
  const { frontmatter } = stripLeadingFrontmatter(content);
  const fm = frontmatter ? parseSkillFrontmatter(frontmatter) : {};
  const derived = deriveSkillMeta(content);
  return {
    name: fm.name?.trim() || derived.name,
    description: fm.description?.trim() || derived.description,
  };
}

export function SkillCreatorDialog({
  content,
  onImportDocument,
}: SkillCreatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const dirtyRef = useRef(false);

  const [userMode, setUserMode] = useState<SkillMode | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [extraFiles, setExtraFiles] = useState<ExtraFile[]>([]);

  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [discovered, setDiscovered] = useState<{
    gh: GitHubRef;
    skills: DiscoveredSkill[];
  } | null>(null);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { trackSkillAction } = useAnalytics();

  // Reseed the editable fields from the document until the user edits them.
  useEffect(() => {
    if (dirtyRef.current) return;
    const seeded = seedMeta(content);
    setName(seeded.name);
    setDescription(seeded.description);
  }, [content]);

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

  // Feature-detect the AI backend once per dialog open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/skill/improve")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => {
        if (!cancelled) setAiEnabled(Boolean(d.enabled));
      })
      .catch(() => {
        if (!cancelled) setAiEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setStep(1);
      setShowImport(false);
      setDiscovered(null);
      setDownloaded(false);
    }
  }

  const meta = useMemo(
    () => ({ name: name.trim(), description: description.trim() }),
    [name, description],
  );

  const validation = useMemo(() => validateSkill({ ...meta }), [meta]);
  const nameErrors = validation.errors.filter((e) => /name/i.test(e));
  const descriptionErrors = validation.errors.filter((e) =>
    /description/i.test(e),
  );

  const suggestedMode = useMemo(() => suggestSkillMode(content), [content]);
  const mode = userMode ?? suggestedMode;

  const hints = useMemo(
    () =>
      skillQualityHints(
        meta,
        mode === "knowledge" ? knowledgeSkillBody() : content,
      ),
    [meta, mode, content],
  );
  const descriptionHint = hints.find(
    (h) => h.id === "no-use-when" || h.id === "generic-description",
  );
  const bodyHints = hints.filter(
    (h) => h.id !== "no-use-when" && h.id !== "generic-description",
  );

  const skillMd = useMemo(
    () =>
      mode === "knowledge"
        ? buildSkillMd(meta, knowledgeSkillBody())
        : buildSkillMd(meta, content),
    [meta, mode, content],
  );

  const installCommand = `unzip -o ~/Downloads/${meta.name}.skill -d ~/.claude/skills/`;

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

  async function handleImproveWithAi() {
    setIsImproving(true);
    try {
      const response = await fetch("/api/skill/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok || data.enabled === false || !data.name) {
        toast.error(data.error ?? "AI refinement unavailable");
        return;
      }
      dirtyRef.current = true;
      setName(data.name);
      setDescription(data.description);
      trackSkillAction("ai-improve");
      toast.success("Name and description refined");
    } catch {
      toast.error("AI refinement failed");
    } finally {
      setIsImproving(false);
    }
  }

  function applyImport(imported: ImportedSkill, sourceLabel: string) {
    if (!onImportDocument) return;
    onImportDocument(imported.markdown);
    const fm = imported.frontmatter;
    const derived = deriveSkillMeta(imported.markdown);
    dirtyRef.current = true;
    setName(fm.name?.trim() || derived.name);
    setDescription(fm.description?.trim() || derived.description);
    setExtraFiles(imported.extraFiles);
    setUserMode("instruction"); // an existing skill is already instruction-shaped
    setDiscovered(null);
    setImportUrl("");
    setShowImport(false);
    setStep(2);
    toast.success(`Imported ${sourceLabel}`, {
      description:
        imported.extraFiles.length > 0
          ? `${imported.extraFiles.length} bundled file(s) will be kept on export.`
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

  function handleUseTemplate() {
    if (!onImportDocument) return;
    onImportDocument(SKILL_TEMPLATE);
    dirtyRef.current = false; // template fields derive normally
    setExtraFiles([]);
    setUserMode("instruction");
    setStep(2);
    toast.success("Template loaded into the editor", {
      description: "Tweak the document, then adjust name and description here.",
    });
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
      setDownloaded(true);
      toast.success(`${meta.name}.skill downloaded`);
      trackSkillAction("skill");
    } catch {
      toast.error("Couldn't package the skill");
    } finally {
      setIsPackaging(false);
    }
  }

  async function handleCopy() {
    const copied = await copyText(skillMd, "SKILL.md copied");
    if (copied) trackSkillAction("copy");
  }

  function handleDownloadMarkdown() {
    downloadBlob(new Blob([skillMd], { type: "text/markdown" }), "SKILL.md");
    toast.success("SKILL.md downloaded");
    trackSkillAction("md");
  }

  const stepTitle =
    step === 1
      ? "What do you want to do?"
      : step === 2
        ? "Name it and say when Claude should use it"
        : "Get your skill";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Create Skill"
            className="h-8 w-8 p-0"
            onClick={() => handleOpenChange(true)}
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

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Skill</DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>{stepTitle}</span>
            <span className="text-xs tabular-nums">Step {step} of 3</span>
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-auto justify-start gap-3 p-3 text-left"
              onClick={() => setStep(2)}
            >
              <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-medium">Package this document</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  Turn what&apos;s in the editor into a skill for Claude
                </span>
              </span>
            </Button>

            {onImportDocument ? (
              <>
                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 p-3 text-left"
                  onClick={() => setShowImport((v) => !v)}
                >
                  <Import className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-medium">Import a skill to edit</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      From a .skill file or a GitHub marketplace — replaces the
                      current document
                    </span>
                  </span>
                  <ChevronDown
                    className={`ml-auto h-4 w-4 shrink-0 transition-transform ${showImport ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </Button>

                {showImport ? (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder="Paste a GitHub link (repo, folder, or SKILL.md)"
                        aria-label="GitHub URL of a skill, folder, or repository"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleImportUrl(importUrl);
                        }}
                        className="h-8 flex-1 text-xs"
                        disabled={isImporting}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleImportUrl(importUrl)}
                        disabled={isImporting || !importUrl.trim()}
                      >
                        {isImporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          "Fetch"
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                      >
                        <FileUp className="h-3.5 w-3.5" aria-hidden="true" /> Open a file…
                      </Button>
                      <span className="text-muted-foreground">or browse:</span>
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
                    {discovered ? (
                      <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-md border bg-muted/20 p-1.5">
                        <p className="px-1.5 pb-1 text-xs text-muted-foreground">
                          Pick a skill ({discovered.skills.length} found):
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
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <Button
                  variant="outline"
                  className="h-auto justify-start gap-3 p-3 text-left"
                  onClick={handleUseTemplate}
                >
                  <FilePlus2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-medium">Start from a template</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      A well-shaped starter skill — replaces the current document
                    </span>
                  </span>
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label htmlFor="skill-name" className="text-sm font-medium">
                Skill name
              </label>
              <Input
                id="skill-name"
                value={name}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setName(e.target.value);
                }}
                aria-invalid={nameErrors.length > 0}
                className="font-mono text-sm"
                placeholder="my-skill-name"
              />
              {nameErrors.map((error) => (
                <p key={error} className="text-xs text-destructive">
                  {error}
                </p>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="skill-description" className="text-sm font-medium">
                  What it does &amp; when Claude should use it
                </label>
                {aiEnabled ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleImproveWithAi}
                    disabled={isImproving}
                  >
                    {isImproving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Improve with AI
                  </Button>
                ) : null}
              </div>
              <Textarea
                id="skill-description"
                value={description}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setDescription(e.target.value);
                }}
                aria-invalid={descriptionErrors.length > 0}
                className="min-h-20 text-sm"
                placeholder="Use this skill when the user asks to…"
              />
              {descriptionErrors.map((error) => (
                <p key={error} className="text-xs text-destructive">
                  {error}
                </p>
              ))}
              {!descriptionErrors.length && descriptionHint ? (
                <p className="flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {descriptionHint.message}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowOptions((v) => !v)}
              aria-expanded={showOptions}
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
              Options
            </button>

            {showOptions ? (
              <div className="space-y-3 rounded-md border p-3">
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
                  </Button>
                  <span className="text-muted-foreground">
                    {mode === "knowledge"
                      ? "Doc ships as a reference file the skill points to."
                      : "The document itself is the skill's instructions."}
                    {suggestedMode === mode ? " (suggested)" : ""}
                  </span>
                </div>

                {bodyHints.map((hint) => (
                  <p
                    key={hint.id}
                    className="flex gap-1.5 text-xs text-amber-700 dark:text-amber-400"
                  >
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {hint.message}
                  </p>
                ))}

                {extraFiles.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium">Kept files:</span>
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
              </div>
            ) : null}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(3)}
                disabled={!validation.valid}
              >
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/20 p-3 text-sm">
              <span className="font-mono">{meta.name}.skill</span>
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
                <Check className="h-4 w-4" aria-hidden="true" /> Ready
              </span>
            </div>

            <Button onClick={handleDownloadSkill} disabled={isPackaging}>
              <Package className="h-4 w-4" aria-hidden="true" />
              {isPackaging ? "Packaging…" : "Download .skill"}
            </Button>

            <div
              className={`space-y-2 rounded-md border p-3 text-xs ${downloaded ? "" : "opacity-70"}`}
            >
              <p className="font-medium">Then add it to Claude:</p>
              <ol className="list-decimal space-y-2 pl-4 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Claude Code:</span>{" "}
                  run this in a terminal
                  <span className="mt-1 flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/40 px-2 py-1.5 font-mono whitespace-nowrap">
                      {installCommand}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Copy install command"
                      className="h-7 w-7 shrink-0 p-0"
                      onClick={() => copyText(installCommand, "Command copied")}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </span>
                </li>
                <li>
                  <span className="font-medium text-foreground">claude.ai:</span>{" "}
                  Settings › Capabilities › Skills › Upload →{" "}
                  <span className="font-mono">{meta.name}.skill</span>
                </li>
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
              </Button>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy SKILL.md
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownloadMarkdown}>
                  <FileDown className="h-3.5 w-3.5" aria-hidden="true" /> SKILL.md only
                </Button>
              </div>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Preview SKILL.md
              </summary>
              <pre className="mt-2 max-h-[30vh] overflow-auto rounded-md border bg-muted/40 p-3 leading-relaxed whitespace-pre-wrap break-words">
                {skillMd}
              </pre>
            </details>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
