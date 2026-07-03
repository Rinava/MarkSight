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
  /** Set both fields programmatically (import, AI refine) and stop reseeding. */
  setMetaOverride: (meta: { name: string; description: string }) => void;
  /** Resume seeding from the document (used after loading a template). */
  resetToDerived: () => void;
  setUserMode: (mode: SkillMode | null) => void;
  setExtraFiles: (files: SkillExtraFile[]) => void;
}

const SkillMetaContext = createContext<SkillMetaContextType | undefined>(
  undefined,
);

export function SkillMetaProvider({ children }: { children: ReactNode }) {
  const { content } = useContent();
  const [name, setNameState] = useState("");
  const [description, setDescriptionState] = useState("");
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
        const seeded = seedSkillMeta(content);
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
