"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  FileDown,
  FileUp,
  Lightbulb,
  ListChecks,
  Loader2,
  Package,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useContent } from "@/contexts/content-context";
import { useSkillMeta } from "@/contexts/skill-meta-context";
import { downloadSkillBundle } from "@/lib/skill/download";
import { buildSkillMdForMode, effectiveSkillBody } from "@/lib/skill/draft";
import { skillQualityHints } from "@/lib/skill/hints";
import { SKILL_TEMPLATE } from "@/lib/skill/template";
import {
  importSkillBundle,
  importSkillMd,
  type ImportedSkill,
} from "@/lib/skill/import";
import {
  fetchFromGitHub,
  importSkillDir,
  MARKETPLACE_SOURCES,
  type DiscoveredSkill,
  type GitHubRef,
} from "@/lib/skill/marketplace";
import { useAnalytics } from "@/hooks/use-analytics";

/**
 * Sidebar card for the Agent Skill: live editable metadata, mode, AI refine,
 * and import — the one-click export in the toolbar reads the same state.
 */
export function SkillPanel() {
  const { content, replaceDocument } = useContent();
  const {
    meta,
    validation,
    mode,
    suggestedMode,
    extraFiles,
    setName,
    setDescription,
    setMetaOverride,
    resetToDerived,
    setUserMode,
    setExtraFiles,
  } = useSkillMeta();
  const { trackSkillAction } = useAnalytics();

  const [aiEnabled, setAiEnabled] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [discovered, setDiscovered] = useState<{
    gh: GitHubRef;
    skills: DiscoveredSkill[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
  }, []);

  const nameErrors = validation.errors.filter((e) => /name/i.test(e));
  const descriptionErrors = validation.errors.filter((e) =>
    /description/i.test(e),
  );
  const hints = skillQualityHints(meta, effectiveSkillBody(content, mode));
  const skillMd = buildSkillMdForMode(meta, content, mode);
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

  async function handleCopySkillMd() {
    const copied = await copyText(
      skillMd,
      "SKILL.md copied — paste it into Claude or another assistant.",
    );
    if (copied) trackSkillAction("copy");
  }

  function handleDownloadSkillMd() {
    const url = URL.createObjectURL(
      new Blob([skillMd], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "SKILL.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("SKILL.md downloaded");
    trackSkillAction("md");
  }

  async function handleDownload() {
    setIsPackaging(true);
    try {
      await downloadSkillBundle({ meta, content, mode, extraFiles });
      trackSkillAction("skill");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsPackaging(false);
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
      setMetaOverride({ name: data.name, description: data.description });
      trackSkillAction("ai-improve");
      toast.success("Name and description refined");
    } catch {
      toast.error("AI refinement failed");
    } finally {
      setIsImproving(false);
    }
  }

  function applyImport(imported: ImportedSkill, sourceLabel: string) {
    replaceDocument(imported.markdown);
    const fm = imported.frontmatter;
    if (fm.name || fm.description) {
      setMetaOverride({
        name: fm.name?.trim() || meta.name,
        description: fm.description?.trim() || meta.description,
      });
    } else {
      resetToDerived();
    }
    setExtraFiles(imported.extraFiles);
    setUserMode("instruction");
    setDiscovered(null);
    setImportUrl("");
    setShowImport(false);
    toast.success(`Imported ${sourceLabel}`, {
      description:
        imported.extraFiles.length > 0
          ? `${imported.extraFiles.length} bundled file(s) will be kept on export.`
          : "You can undo from the editor.",
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
    <Card className="h-fit transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          Agent Skill
          {validation.valid ? (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-green-600 dark:text-green-500">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> valid
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-destructive">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> fix
              below
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="space-y-1">
          <label htmlFor="skill-panel-name" className="text-xs text-muted-foreground">
            Name
          </label>
          <Input
            id="skill-panel-name"
            value={meta.name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={nameErrors.length > 0}
            className="h-8 font-mono text-xs"
            placeholder="my-skill-name"
          />
          {nameErrors.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="skill-panel-description"
              className="text-xs text-muted-foreground"
            >
              When should Claude use it?
            </label>
            {aiEnabled ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs"
                onClick={handleImproveWithAi}
                disabled={isImproving}
                aria-label="Improve name and description with AI"
              >
                {isImproving ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                )}
                AI
              </Button>
            ) : null}
          </div>
          <Textarea
            id="skill-panel-description"
            value={meta.description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={descriptionErrors.length > 0}
            className="min-h-14 text-xs"
            placeholder="Use this skill when…"
          />
          {descriptionErrors.map((error) => (
            <p key={error} className="text-xs text-destructive">
              {error}
            </p>
          ))}
          {!descriptionErrors.length
            ? hints.map((hint) => (
                <p
                  key={hint.id}
                  className="flex gap-1 text-xs text-amber-700 dark:text-amber-400"
                >
                  <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  {hint.message}
                </p>
              ))
            : null}
        </div>

        <div
          role="radiogroup"
          aria-label="Packaging mode"
          className="flex items-center gap-1"
        >
          <Button
            role="radio"
            aria-checked={mode === "instruction"}
            variant={mode === "instruction" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={() => setUserMode("instruction")}
          >
            <ListChecks className="h-3 w-3" aria-hidden="true" /> Instructions
            {suggestedMode === "instruction" ? (
              <span className="text-muted-foreground">·sug.</span>
            ) : null}
          </Button>
          <Button
            role="radio"
            aria-checked={mode === "knowledge"}
            variant={mode === "knowledge" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={() => setUserMode("knowledge")}
          >
            <BookOpen className="h-3 w-3" aria-hidden="true" /> Knowledge
            {suggestedMode === "knowledge" ? (
              <span className="text-muted-foreground">·sug.</span>
            ) : null}
          </Button>
        </div>

        {extraFiles.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className="font-medium">Kept files:</span>
            {extraFiles.map((file) => (
              <span
                key={file.path}
                className="max-w-full truncate rounded border bg-muted/40 px-1 py-0.5 font-mono"
              >
                {file.path}
              </span>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-xs"
              onClick={() => setExtraFiles([])}
              aria-label="Clear kept files"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        <Button
          size="sm"
          className="w-full"
          onClick={handleDownload}
          disabled={!validation.valid || isPackaging}
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          {isPackaging ? "Packaging…" : "Download .skill"}
        </Button>

        <div className="flex justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={handleCopySkillMd}
            disabled={!validation.valid}
          >
            <Copy className="h-3 w-3" aria-hidden="true" /> Copy SKILL.md
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={handleDownloadSkillMd}
            disabled={!validation.valid}
          >
            <FileDown className="h-3 w-3" aria-hidden="true" /> SKILL.md only
          </Button>
        </div>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Preview SKILL.md
          </summary>
          <pre className="mt-1.5 max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 leading-relaxed break-words whitespace-pre-wrap">
            {skillMd}
          </pre>
        </details>

        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Add to Claude
          </summary>
          <div className="mt-1.5 space-y-1.5">
            <div className="flex items-center gap-1">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/40 px-1.5 py-1 font-mono whitespace-nowrap">
                {installCommand}
              </code>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Copy install command"
                className="h-6 w-6 shrink-0 p-0"
                onClick={() => copyText(installCommand, "Command copied")}
              >
                <Copy className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-muted-foreground">
              Claude Code: run the command (loads next session or after{" "}
              <span className="font-mono">/reload-plugins</span>). claude.ai:
              Settings › Capabilities › Skills › Upload.
            </p>
          </div>
        </details>

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowImport((v) => !v)}
          aria-expanded={showImport}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${showImport ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          Import or start from template
        </button>

        {showImport ? (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <Input
                type="url"
                inputMode="url"
                placeholder="GitHub link…"
                aria-label="GitHub URL of a skill, folder, or repository"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImportUrl(importUrl);
                }}
                className="h-7 flex-1 text-xs"
                disabled={isImporting}
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleImportUrl(importUrl)}
                disabled={isImporting || !importUrl.trim()}
              >
                {isImporting ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  "Fetch"
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <FileUp className="h-3 w-3" aria-hidden="true" /> Open file
              </Button>
              {MARKETPLACE_SOURCES.map((source) => (
                <Button
                  key={source.url}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs"
                  disabled={isImporting}
                  onClick={() => {
                    setImportUrl(source.url);
                    handleImportUrl(source.url);
                  }}
                >
                  {source.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs"
                onClick={() => {
                  replaceDocument(SKILL_TEMPLATE);
                  resetToDerived();
                  setExtraFiles([]);
                  setUserMode("instruction");
                  setShowImport(false);
                  toast.success("Template loaded into the editor");
                }}
              >
                Template
              </Button>
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
              <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-md border bg-muted/20 p-1">
                {discovered.skills.map((skill) => (
                  <Button
                    key={skill.path}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-full justify-start px-1.5 font-mono text-xs"
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
      </CardContent>
    </Card>
  );
}
