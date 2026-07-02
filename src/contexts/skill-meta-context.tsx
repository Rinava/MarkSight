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
import { deriveSkillMeta } from "@/lib/skill/derive";
import { parseSkillFrontmatter, stripLeadingFrontmatter } from "@/lib/skill/build";
import { validateSkill } from "@/lib/skill/validate";
import { suggestSkillMode, type SkillMode } from "@/lib/skill/knowledge";
import type { SkillMeta, ValidationResult } from "@/lib/skill/types";

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
  extraFiles: { path: string; data: Uint8Array }[];
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  /** Set both fields programmatically (import, AI refine) and stop reseeding. */
  setMetaOverride: (meta: { name: string; description: string }) => void;
  /** Resume seeding from the document (used after loading a template). */
  resetToDerived: () => void;
  setUserMode: (mode: SkillMode | null) => void;
  setExtraFiles: (files: { path: string; data: Uint8Array }[]) => void;
}

const SkillMetaContext = createContext<SkillMetaContextType | undefined>(
  undefined,
);

function seedFromDocument(content: string) {
  const { frontmatter } = stripLeadingFrontmatter(content);
  const fm = frontmatter ? parseSkillFrontmatter(frontmatter) : {};
  const derived = deriveSkillMeta(content);
  return {
    name: fm.name?.trim() || derived.name,
    description: fm.description?.trim() || derived.description,
  };
}

export function SkillMetaProvider({ children }: { children: ReactNode }) {
  const { content } = useContent();
  const [name, setNameState] = useState("");
  const [description, setDescriptionState] = useState("");
  const [userMode, setUserMode] = useState<SkillMode | null>(null);
  const [extraFiles, setExtraFiles] = useState<
    { path: string; data: Uint8Array }[]
  >([]);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) return;
    const seeded = seedFromDocument(content);
    setNameState(seeded.name);
    setDescriptionState(seeded.description);
  }, [content]);

  const value = useMemo<SkillMetaContextType>(() => {
    const meta: SkillMeta = {
      name: name.trim(),
      description: description.trim(),
    };
    return {
      meta,
      validation: validateSkill({ ...meta }),
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
      setMetaOverride: (next) => {
        dirtyRef.current = true;
        setNameState(next.name);
        setDescriptionState(next.description);
      },
      resetToDerived: () => {
        dirtyRef.current = false;
        const seeded = seedFromDocument(content);
        setNameState(seeded.name);
        setDescriptionState(seeded.description);
      },
      setUserMode,
      setExtraFiles,
    };
  }, [name, description, userMode, extraFiles, content]);

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
