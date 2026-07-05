"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CircleCheck,
  Copy,
  FileCode2,
  FileText,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useContent } from "@/contexts/content-context";
import { useSkillMeta } from "@/contexts/skill-meta-context";
import { useAnalytics } from "@/hooks/use-analytics";
import { KNOWLEDGE_DOC_PATH } from "@/lib/skill/knowledge";

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TRIGGER_RE = /\b(when|use|trigger|invoke)\b/i;
const SCRIPT_EXT_RE = /\.(py|js|ts|tsx|jsx|sh|rb|go|rs|mjs|cjs)$/i;
const MODE_OPTIONS = [
  { value: "instruction" as const, label: "Instructions", Icon: ListChecks },
  { value: "knowledge" as const, label: "Knowledge", Icon: BookOpen },
];
const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.05em] text-ms-muted";
const FIELD_LABEL = "text-[12.5px] font-semibold text-ms-ink-3";
const TEXT_INPUT =
  "ms-in w-full rounded-[9px] border border-ms-border-2 bg-ms-surface px-3 py-2.5 text-[13px] text-ms-ink-2";

function isScript(path: string) {
  return SCRIPT_EXT_RE.test(path);
}

export interface SkillInspectorProps {
  onExit: () => void;
}

export function SkillInspector({ onExit }: SkillInspectorProps) {
  const { content } = useContent();
  const {
    meta,
    mode,
    suggestedMode,
    setUserMode,
    setName,
    setDescription,
    setLicense,
    setVersion,
    setTags,
    setMetaOverride,
    extraFiles,
    setExtraFiles,
  } = useSkillMeta();
  const { trackSkillAction } = useAnalytics();

  const [tagDraft, setTagDraft] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const version = meta.version ?? "1.0.0";
  const tags = meta.tags ?? [];

  // Probe whether the server-side AI refine endpoint is configured.
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

  async function improveWithAi() {
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

  const name = meta.name;
  const nameEmpty = name.length === 0;
  const nameOk = NAME_RE.test(name) && name.length <= 64;
  const descLen = meta.description.length;
  const descOk = descLen > 0 && descLen <= 1024;
  const descWhen = TRIGGER_RE.test(meta.description);
  const bodyOk = content.trim().length > 20;
  const filesCount = extraFiles.length;

  const nameHint = nameEmpty
    ? "Lowercase, hyphen-separated. Becomes the folder name."
    : nameOk
      ? "✓ Valid identifier"
      : "Only lowercase letters, numbers and single hyphens (max 64).";
  const nameHintColor = nameEmpty
    ? "text-ms-muted-2"
    : nameOk
      ? "text-ms-primary-ink"
      : "text-ms-danger-strong";
  const nameBorder = nameEmpty
    ? "border-ms-border-2"
    : nameOk
      ? "border-ms-ok-input-border"
      : "border-ms-danger-border";
  const descCountColor =
    descLen > 1024
      ? "text-ms-danger-strong"
      : descLen > 900
        ? "text-ms-warn"
        : "text-ms-muted";

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    setTags([...tags, tag]);
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function attachFiles(files: FileList) {
    const incoming = await Promise.all(
      Array.from(files).map(async (file) => ({
        path: file.name,
        data: new Uint8Array(await file.arrayBuffer()),
      })),
    );
    // Approximate count for the toast (render-time snapshot)…
    const existingNow = new Set(extraFiles.map((f) => f.path));
    const newlyAdded = incoming.filter((f) => !existingNow.has(f.path));
    // …but commit via a functional updater so a concurrent add/remove during
    // the file read can't clobber state or resurrect a deleted file.
    setExtraFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      const added = incoming.filter((f) => !existing.has(f.path));
      return added.length ? [...prev, ...added] : prev;
    });
    if (newlyAdded.length) toast.success(`Attached ${newlyAdded.length} file(s)`);
  }

  const checks = [
    {
      ok: nameOk,
      warn: false,
      label: "Name",
      detail: nameOk
        ? "Valid skill identifier."
        : "Required — lowercase, hyphenated, ≤64 chars.",
    },
    {
      ok: descOk,
      warn: false,
      label: "Description",
      detail: descOk
        ? `${descLen} / 1024 characters.`
        : "Required — 1 to 1024 characters.",
    },
    {
      ok: descWhen,
      warn: !descWhen,
      label: "Trigger clarity",
      detail: descWhen
        ? "Describes when to use the skill."
        : "Mention when the agent should invoke this.",
    },
    {
      ok: bodyOk,
      warn: false,
      label: "Instructions",
      detail: bodyOk
        ? "Document body has content."
        : "Write instructions in the editor.",
    },
    {
      ok: filesCount > 0,
      warn: filesCount === 0,
      label: "Bundled files",
      detail:
        filesCount > 0
          ? `${filesCount} file(s) attached.`
          : "Optional — attach scripts or references.",
    },
  ];

  const treeLines = [`📁 ${name || "skill-name"}/`, "  📄 SKILL.md"];
  if (mode === "knowledge") treeLines.push(`  📄 ${KNOWLEDGE_DOC_PATH}`);
  extraFiles.forEach((f) => treeLines.push(`  📄 ${f.path}`));

  const installCommand = `unzip -o ~/Downloads/${name || "skill-name"}.skill -d ~/.claude/skills/`;

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Command copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <aside className="ms-slide ms-scroll w-[344px] flex-none overflow-y-auto border-l border-ms-border bg-ms-surface-2">
      <div className="p-[18px]">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-[13px] w-[13px] text-ms-primary-ink" aria-hidden="true" />
          <span className="text-[14px] font-bold text-ms-ink-strong">
            Skill inspector
          </span>
        </div>
        <p className="mb-[18px] text-[12px] leading-[1.5] text-ms-muted-2">
          Your document is the skill body. Add the metadata that tells an agent
          what it does and when to use it.
        </p>

        <div className={`${SECTION_LABEL} mb-3`}>Metadata</div>

        {/* Name */}
        <label className="mb-[15px] block">
          <span className="mb-1.5 flex items-center justify-between">
            <span className={FIELD_LABEL}>Name</span>
            <span className="text-[11px] font-medium text-ms-danger">required</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. pdf-processing"
            spellCheck={false}
            className={`ms-in w-full rounded-[9px] border bg-ms-surface px-3 py-2.5 font-mono text-[13px] text-ms-ink-2 ${nameBorder}`}
          />
          <span className={`mt-1.5 block text-[11px] ${nameHintColor}`}>
            {nameHint}
          </span>
        </label>

        {/* Description */}
        <label className="mb-[15px] block">
          <span className="mb-1.5 flex items-center justify-between gap-2">
            <span className={FIELD_LABEL}>Description</span>
            <span className="flex items-center gap-2">
              {aiEnabled && (
                <button
                  type="button"
                  onClick={improveWithAi}
                  disabled={isImproving}
                  aria-label="Refine name and description with AI"
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-ms-primary-ink transition-colors hover:bg-ms-tint-2 disabled:opacity-50"
                >
                  {isImproving ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                  )}
                  AI
                </button>
              )}
              <span className={`text-[11px] font-medium ${descCountColor}`}>
                {descLen} / 1024
              </span>
            </span>
          </span>
          <textarea
            value={meta.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what the skill does AND when the agent should use it…"
            className="ms-in ms-scroll min-h-[88px] w-full resize-y rounded-[9px] border border-ms-border-2 bg-ms-surface px-3 py-2.5 text-[13px] leading-[1.5] text-ms-ink-2"
          />
          <span className="mt-1.5 block text-[11px] text-ms-muted-2">
            Start with a verb, name the trigger — “Use when the user asks to…”.
          </span>
        </label>

        {/* Version + License */}
        <div className="mb-[15px] flex gap-3">
          <label className="flex-1">
            <span className={`mb-1.5 block ${FIELD_LABEL}`}>Version</span>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className={`${TEXT_INPUT} font-mono`}
            />
          </label>
          <label className="flex-1">
            <span className={`mb-1.5 block ${FIELD_LABEL}`}>License</span>
            <input
              value={meta.license ?? ""}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="MIT"
              className={TEXT_INPUT}
            />
          </label>
        </div>

        {/* Tags */}
        <div className="mb-[15px]">
          <span className={`mb-1.5 block ${FIELD_LABEL}`}>Tags</span>
          <div className="flex flex-wrap items-center gap-1.5 rounded-[9px] border border-ms-border-2 bg-ms-surface px-2.5 py-[7px]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-md bg-ms-tint-2 py-[3px] pr-1.5 pl-2.5 text-[11.5px] font-medium text-ms-ink-3"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                  className="flex text-ms-muted-2 hover:text-ms-danger-strong"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagDraft.trim()) {
                  e.preventDefault();
                  addTag(tagDraft);
                  setTagDraft("");
                }
              }}
              placeholder="add tag…"
              className="ms-in min-w-20 flex-1 border-none bg-transparent py-[3px] text-[12.5px] text-ms-ink-2"
            />
          </div>
        </div>

        {/* Packaging mode */}
        <div className="mb-1">
          <span className={`mb-1.5 flex items-center justify-between ${FIELD_LABEL}`}>
            Packaging
          </span>
          <div
            role="radiogroup"
            aria-label="Packaging mode"
            className="flex gap-1.5"
          >
            {MODE_OPTIONS.map(({ value, label, Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setUserMode(value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border px-2 py-2 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-ms-border-hover bg-ms-tint text-ms-primary-ink"
                      : "border-ms-border-2 bg-ms-surface text-ms-muted-3 hover:bg-ms-hover"
                  }`}
                >
                  <Icon className="h-[14px] w-[14px]" aria-hidden="true" />
                  {label}
                  {suggestedMode === value && (
                    <span className="text-[10px] text-ms-muted">· sug.</span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="mt-1.5 block text-[11px] text-ms-muted-2">
            {mode === "knowledge"
              ? "Ships a short pointer SKILL.md plus your document as a bundled reference."
              : "Uses your document itself as the skill instructions."}
          </span>
        </div>

        {/* Bundled files */}
        <div className="mt-[22px] mb-2.5 flex items-center justify-between">
          <span className={SECTION_LABEL}>Bundled files</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[12px] font-semibold text-ms-primary-ink hover:brightness-95"
          >
            <Plus className="h-[13px] w-[13px]" aria-hidden="true" /> Add
          </button>
        </div>
        <div className="flex flex-col gap-[7px]">
          {filesCount === 0 ? (
            <p className="text-[11.5px] text-ms-muted-2">
              No bundled files. Scripts and references are optional.
            </p>
          ) : (
            extraFiles.map((file, index) => {
              const script = isScript(file.path);
              const Icon = script ? FileCode2 : FileText;
              return (
                <div
                  key={file.path}
                  className="flex items-center gap-2.5 rounded-[9px] border border-ms-border-2 bg-ms-surface px-[11px] py-[9px]"
                >
                  <span
                    className={`flex ${script ? "text-[#3e6da6] dark:text-[#7ba4d6]" : "text-ms-primary-ink"}`}
                  >
                    <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[12.5px] text-ms-ink-2">
                      {file.path}
                    </div>
                    <div className="text-[10.5px] text-ms-muted">
                      {script ? "Script" : "Reference"} ·{" "}
                      {(file.path.split(".").pop() ?? "").toUpperCase()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExtraFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove ${file.path}`}
                    className="flex p-1 text-ms-muted hover:text-ms-danger-strong"
                  >
                    <Trash2 className="h-[15px] w-[15px]" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Validation */}
        <div className={`${SECTION_LABEL} mt-[22px] mb-2.5`}>Validation</div>
        <div className="flex flex-col gap-2">
          {checks.map((check) => {
            const Icon = check.ok ? CircleCheck : TriangleAlert;
            const iconColor = check.ok
              ? "text-ms-primary-ink"
              : check.warn
                ? "text-ms-warn"
                : "text-ms-danger-strong";
            const borderColor = check.ok
              ? "border-ms-ok-border"
              : check.warn
                ? "border-ms-warn-border"
                : "border-ms-danger-border";
            return (
              <div
                key={check.label}
                className={`flex items-start gap-[9px] rounded-[10px] border bg-ms-surface px-[11px] py-2.5 ${borderColor}`}
              >
                <span className={`mt-px flex ${iconColor}`}>
                  <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold text-ms-ink-body">
                    {check.label}
                  </div>
                  <div className="mt-0.5 text-[11.5px] leading-[1.4] text-ms-muted-3">
                    {check.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Skill folder */}
        <div className={`${SECTION_LABEL} mt-[22px] mb-2.5`}>Skill folder</div>
        <div className="rounded-[11px] border border-ms-border-2 bg-ms-surface px-[13px] py-3 font-mono text-[12px] leading-[1.9] text-ms-label">
          {treeLines.map((line, index) => (
            <div key={index} className="whitespace-nowrap">
              {line}
            </div>
          ))}
        </div>

        {/* Add to Claude */}
        <div className={`${SECTION_LABEL} mt-[22px] mb-2.5`}>Add to Claude</div>
        <div className="flex items-center gap-2 rounded-[9px] border border-ms-border-2 bg-ms-surface px-[11px] py-2.5">
          <code className="ms-scroll min-w-0 flex-1 overflow-x-auto font-mono text-[11.5px] whitespace-nowrap text-ms-label">
            {installCommand}
          </code>
          <button
            type="button"
            onClick={() => copyText(installCommand)}
            aria-label="Copy install command"
            className="flex shrink-0 text-ms-muted transition-colors hover:text-ms-primary-ink"
          >
            <Copy className="h-[15px] w-[15px]" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-[1.4] text-ms-muted-2">
          Export the .skill, then run the command (Claude Code) or upload it in
          claude.ai → Settings → Capabilities → Skills.
        </p>

        <button
          type="button"
          onClick={onExit}
          className="mt-[18px] w-full rounded-[9px] border border-ms-border-2 py-2.5 text-[12.5px] font-medium text-ms-muted-3 transition-colors hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink"
        >
          Exit skill mode
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files?.length) attachFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </aside>
  );
}
