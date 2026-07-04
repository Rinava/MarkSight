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

  useEffect(() => {
    if (dirtyRef.current) return;
    const seeded = seedSkillMeta(content);
    setNameState(seeded.name);
    setDescriptionState(seeded.description);
  }, [content]);

  const value = useMemo<SkillMetaContextType>(() => {
    const trimmedLicense = license.trim();
    const trimmedVersion = version.trim();
    const cleanTags = tags.map((t) => t.trim()).filter(Boolean);
    const meta: SkillMeta = {
      name: name.trim(),
      description: description.trim(),
      ...(trimmedLicense ? { license: trimmedLicense } : {}),
      ...(trimmedVersion ? { version: trimmedVersion } : {}),
      ...(cleanTags.length ? { tags: cleanTags } : {}),
    };
    return {
      meta,
      // version/tags serialize under `metadata`, not as top-level frontmatter
      // keys, so validation only sees the real top-level fields.
      validation: validateSkill({
        name: meta.name,
        description: meta.description,
        ...(meta.license ? { license: meta.license } : {}),
      }),
      mode: userMode ?? suggestSkillMode(content),
      suggestedMode: suggestSkillMode(content),
      extraFiles,
      setName: (next) => {
        dirtyRef.current = true;
        setNameState(next);
      },
      setDescription: (next) => {
        dirtyRef.current = true;
        setDescriptionState(next);
      },
      setLicense: setLicenseState,
      setVersion: setVersionState,
      setTags: setTagsState,
      setMetaOverride: (next) => {
        dirtyRef.current = true;
        setNameState(next.name);
        setDescriptionState(next.description);
      },
      resetToDerived: () => {
        dirtyRef.current = false;
        const seeded = seedSkillMeta(content);
        setNameState(seeded.name);
        setDescriptionState(seeded.description);
        setVersionState("1.0.0");
        setTagsState([]);
      },
      setUserMode,
      setExtraFiles,
    };
  }, [name, description, license, version, tags, userMode, extraFiles, content]);

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
