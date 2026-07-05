"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useContent } from "@/contexts/content-context";
import { seedSkillMeta } from "@/lib/skill/draft";
import { validateSkill } from "@/lib/skill/validate";
import { suggestSkillMode, type SkillMode } from "@/lib/skill/knowledge";
import type { SkillExtraFile, SkillMeta, ValidationResult } from "@/lib/skill/types";

/**
 * Shared Agent Skill state: the toolbar's one-click export and the sidebar
 * panel edit/read the same metadata. Fields are seeded from the document
 * (frontmatter wins, derivation is fallback) until the user edits them.
 */

interface SkillMetaContextType {
  meta: SkillMeta;
  validation: ValidationResult;
  mode: SkillMode;
  suggestedMode: SkillMode;
  extraFiles: SkillExtraFile[];
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setLicense: (license: string) => void;
  setVersion: (version: string) => void;
  setTags: (tags: string[]) => void;
  /** Set both fields programmatically (import, AI refine) and stop reseeding. */
  setMetaOverride: (meta: { name: string; description: string }) => void;
  /** Resume seeding from the document (used after loading a template). */
  resetToDerived: () => void;
  setUserMode: (mode: SkillMode | null) => void;
  setExtraFiles: (
    files: SkillExtraFile[] | ((prev: SkillExtraFile[]) => SkillExtraFile[]),
  ) => void;
}

const SkillMetaContext = createContext<SkillMetaContextType | undefined>(
  undefined,
);

export function SkillMetaProvider({ children }: { children: ReactNode }) {
  const { content } = useContent();
  const [name, setNameState] = useState("");
  const [description, setDescriptionState] = useState("");
  const [license, setLicenseState] = useState("");
  const [version, setVersionState] = useState("1.0.0");
  const [tags, setTagsState] = useState<string[]>([]);
  const [userMode, setUserMode] = useState<SkillMode | null>(null);
  const [extraFiles, setExtraFiles] = useState<SkillExtraFile[]>([]);
  const dirtyRef = useRef(false);

  // Latest document, read by content-seeded setters without making their
  // identities depend on `content` (which would rebuild `value` — and re-render
  // every consumer — on each debounced keystroke).
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
    if (dirtyRef.current) return;
    const seeded = seedSkillMeta(content);
    setNameState(seeded.name);
    setDescriptionState(seeded.description);
  }, [content]);

  const meta = useMemo<SkillMeta>(() => {
    const trimmedLicense = license.trim();
    const trimmedVersion = version.trim();
    const cleanTags = tags.map((t) => t.trim()).filter(Boolean);
    return {
      name: name.trim(),
      description: description.trim(),
      ...(trimmedLicense ? { license: trimmedLicense } : {}),
      ...(trimmedVersion ? { version: trimmedVersion } : {}),
      ...(cleanTags.length ? { tags: cleanTags } : {}),
    };
  }, [name, description, license, version, tags]);

  const validation = useMemo(
    () =>
      // version/tags serialize under `metadata`, not as top-level frontmatter
      // keys, so validation only sees the real top-level fields.
      validateSkill({
        name: meta.name,
        description: meta.description,
        ...(meta.license ? { license: meta.license } : {}),
      }),
    [meta],
  );

  const suggestedMode = useMemo(() => suggestSkillMode(content), [content]);
  const mode = userMode ?? suggestedMode;

  // Setters never close over `content` (they read `contentRef`), so their
  // identities are stable — keeping `value` referentially stable across
  // keystrokes unless a derived value actually changes.
  const setters = useMemo(
    () => ({
      setName: (next: string) => {
        dirtyRef.current = true;
        setNameState(next);
      },
      setDescription: (next: string) => {
        dirtyRef.current = true;
        setDescriptionState(next);
      },
      setLicense: setLicenseState,
      setVersion: setVersionState,
      setTags: setTagsState,
      setMetaOverride: (next: { name: string; description: string }) => {
        dirtyRef.current = true;
        setNameState(next.name);
        setDescriptionState(next.description);
      },
      resetToDerived: () => {
        dirtyRef.current = false;
        const seeded = seedSkillMeta(contentRef.current);
        setNameState(seeded.name);
        setDescriptionState(seeded.description);
        setLicenseState("");
        setVersionState("1.0.0");
        setTagsState([]);
      },
      setUserMode,
      setExtraFiles,
    }),
    [],
  );

  const value = useMemo<SkillMetaContextType>(
    () => ({ meta, validation, mode, suggestedMode, extraFiles, ...setters }),
    [meta, validation, mode, suggestedMode, extraFiles, setters],
  );

  return (
    <SkillMetaContext.Provider value={value}>
      {children}
    </SkillMetaContext.Provider>
  );
}

export function useSkillMeta() {
  const context = useContext(SkillMetaContext);
  if (context === undefined) {
    throw new Error("useSkillMeta must be used within a SkillMetaProvider");
  }
  return context;
}
