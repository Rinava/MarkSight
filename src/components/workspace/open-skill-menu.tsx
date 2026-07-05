"use client";

import { useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  ChevronDown,
  ChevronLeft,
  FilePlus2,
  FileUp,
  FolderOpen,
  Github,
} from "lucide-react";
import { toast } from "sonner";
import { useContent } from "@/contexts/content-context";
import { useSkillMeta } from "@/contexts/skill-meta-context";
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

const ITEM_CLASS =
  "flex w-full cursor-default items-center gap-[11px] rounded-lg px-2.5 py-[9px] text-left text-ms-ink-2 outline-none transition-colors data-[highlighted]:bg-ms-hover-2 data-[disabled]:opacity-45";
const LABEL_CLASS =
  "px-2.5 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ms-muted";

export function OpenSkillMenu({ onEnterSkill }: { onEnterSkill: () => void }) {
  const { replaceDocument } = useContent();
  const {
    meta,
    setMetaOverride,
    resetToDerived,
    setLicense,
    setVersion,
    setExtraFiles,
    setUserMode,
  } = useSkillMeta();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [discovered, setDiscovered] = useState<{
    gh: GitHubRef;
    skills: DiscoveredSkill[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function applyImport(imported: ImportedSkill, label: string) {
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
    // Preserve imported license/version when present. `frontmatter` is a flat
    // string map, so these arrive as plain strings; `tags` only survives as an
    // unparsed "[a, b]" literal, so it's left out rather than guessed at.
    if (fm.license?.trim()) setLicense(fm.license.trim());
    if (fm.version?.trim()) setVersion(fm.version.trim());
    setExtraFiles(imported.extraFiles);
    setUserMode("instruction");
    onEnterSkill();
    toast.success(`Opened ${label}`, {
      description:
        imported.extraFiles.length > 0
          ? `${imported.extraFiles.length} bundled file(s) kept on export.`
          : "You can undo from the editor.",
    });
  }

  function startTemplate() {
    replaceDocument(SKILL_TEMPLATE);
    resetToDerived();
    setExtraFiles([]);
    setUserMode("instruction");
    onEnterSkill();
    toast.success("Blank skill template loaded");
  }

  async function openFile(file: File) {
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function importFromUrl(url: string, sourceLabel: string) {
    setBusy(true);
    const pending = toast.loading(`Fetching ${sourceLabel}…`);
    try {
      const result = await fetchFromGitHub(url);
      if (result.kind === "skill") {
        applyImport(result.skill, result.skill.rootDir ?? sourceLabel);
        setOpen(false);
        setImportUrl("");
      } else if (result.skills.length === 1) {
        const only = result.skills[0];
        applyImport(await importSkillDir(result.gh, only.path), only.name);
        setOpen(false);
        setImportUrl("");
      } else if (result.skills.length > 1) {
        // Keep the menu open and let the user pick which skill to import.
        setDiscovered({ gh: result.gh, skills: result.skills });
      } else {
        toast.error("No skills found at that link");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      toast.dismiss(pending);
      setBusy(false);
    }
  }

  async function pickDiscovered(skill: DiscoveredSkill) {
    if (!discovered) return;
    setBusy(true);
    const pending = toast.loading(`Opening ${skill.name}…`);
    try {
      applyImport(await importSkillDir(discovered.gh, skill.path), skill.name);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      toast.dismiss(pending);
      setBusy(false);
    }
  }

  return (
    <>
      <Menu.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setDiscovered(null);
            setImportUrl("");
          }
        }}
        modal={false}
      >
        <Menu.Trigger
          render={
            <button
              type="button"
              className="flex h-9 items-center gap-[7px] rounded-[9px] border border-ms-border-2 bg-ms-surface px-[13px] text-[13px] font-medium text-ms-label transition-colors hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink data-[popup-open]:border-ms-border-hover data-[popup-open]:bg-ms-hover"
            />
          }
        >
          <FolderOpen className="h-[15px] w-[15px]" aria-hidden="true" />
          <span>Open skill</span>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
            <Menu.Popup className="ms-pop w-[290px] origin-[var(--transform-origin)] rounded-xl border border-ms-border-2 bg-ms-surface p-1.5 shadow-[var(--ms-shadow-menu)] outline-none">
              {discovered ? (
                <>
                  <div className="flex items-center justify-between px-1 pt-0.5 pb-1">
                    <button
                      type="button"
                      onClick={() => setDiscovered(null)}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-ms-muted-3 transition-colors hover:bg-ms-hover-2 hover:text-ms-primary-ink"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Back
                    </button>
                    <span className="pr-1 text-[10.5px] font-medium text-ms-muted">
                      {discovered.skills.length} skills
                    </span>
                  </div>
                  <div className="ms-scroll max-h-[300px] overflow-y-auto">
                    {discovered.skills.map((skill) => (
                      <Menu.Item
                        key={skill.path}
                        closeOnClick={false}
                        onClick={() => pickDiscovered(skill)}
                        disabled={busy}
                        className={ITEM_CLASS}
                      >
                        <span className="flex text-ms-primary-ink">
                          <FolderOpen className="h-[16px] w-[16px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">
                          {skill.name}
                        </span>
                      </Menu.Item>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className={LABEL_CLASS}>Start a skill</div>
                  <Menu.Item
                    onClick={startTemplate}
                    disabled={busy}
                    className={ITEM_CLASS}
                  >
                    <span className="flex text-ms-primary-ink">
                      <FilePlus2 className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[13px] font-medium">
                        Blank template
                      </span>
                      <span className="block text-[11px] text-ms-muted-3">
                        Skill-shaped starter document
                      </span>
                    </span>
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className={ITEM_CLASS}
                  >
                    <span className="flex text-ms-primary-ink">
                      <FileUp className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[13px] font-medium">
                        Open file…
                      </span>
                      <span className="block text-[11px] text-ms-muted-3">
                        .skill bundle or SKILL.md
                      </span>
                    </span>
                  </Menu.Item>

                  <Menu.Separator className="mx-1 my-1.5 h-px bg-ms-border" />

                  <div className={LABEL_CLASS}>Open from GitHub</div>
                  {/* Free-form URL import. Keydown/pointer events are isolated
                      so the menu's typeahead and roving focus don't hijack the
                      input. */}
                  <div
                    className="flex gap-1.5 px-2.5 py-1"
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="url"
                      inputMode="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter" && importUrl.trim()) {
                          e.preventDefault();
                          importFromUrl(importUrl.trim(), "GitHub link");
                        }
                      }}
                      placeholder="Paste any GitHub link…"
                      aria-label="GitHub URL of a skill, folder, or repository"
                      disabled={busy}
                      className="ms-in min-w-0 flex-1 rounded-md border border-ms-border-2 bg-ms-surface px-2 py-1.5 text-[12px] text-ms-ink-2"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        importUrl.trim() &&
                        importFromUrl(importUrl.trim(), "GitHub link")
                      }
                      disabled={busy || !importUrl.trim()}
                      className="rounded-md bg-ms-primary px-2.5 text-[12px] font-semibold text-white transition-[filter] hover:brightness-[1.07] disabled:opacity-50"
                    >
                      Fetch
                    </button>
                  </div>
                  {MARKETPLACE_SOURCES.map((source) => (
                    <Menu.Item
                      key={source.url}
                      closeOnClick={false}
                      onClick={() => importFromUrl(source.url, source.label)}
                      disabled={busy}
                      className={ITEM_CLASS}
                    >
                      <span className="flex text-ms-primary-ink">
                        <Github className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="block truncate text-[13px] font-medium">
                          {source.label}
                        </span>
                        <span className="block text-[11px] text-ms-muted-3">
                          Browse and import a skill
                        </span>
                      </span>
                    </Menu.Item>
                  ))}
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <input
        ref={fileInputRef}
        type="file"
        accept=".skill,.zip,.md,.markdown"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) openFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
