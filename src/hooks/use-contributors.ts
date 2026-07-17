"use client";

import { useEffect, useState } from "react";
import { fetchContributors, type Contributor } from "@/lib/contributors";

// One shared fetch per session (About section + both footers). A cached promise,
// not an AbortSignal, so one subscriber unmounting can't cancel it for the rest.
let cache: Promise<Contributor[]> | null = null;

function load(): Promise<Contributor[]> {
  if (!cache) cache = fetchContributors();
  return cache;
}

export interface UseContributors {
  contributors: Contributor[];
  loading: boolean;
  error: boolean;
}

export function useContributors(): UseContributors {
  const [state, setState] = useState<UseContributors>({
    contributors: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let active = true;
    load()
      .then((contributors) => {
        if (active) setState({ contributors, loading: false, error: false });
      })
      .catch(() => {
        cache = null; // let the next mount retry (e.g. after a rate-limit window)
        if (active) setState({ contributors: [], loading: false, error: true });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
