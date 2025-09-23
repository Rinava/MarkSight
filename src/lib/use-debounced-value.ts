"use client";

import { useEffect, useRef, useState } from "react";

export interface UseDebouncedValueOptions {
  delayMs?: number;
}

export function useDebouncedValue<T>(value: T, options?: UseDebouncedValueOptions) {
  const { delayMs = 200 } = options ?? {};
  const [debounced, setDebounced] = useState<T>(value);
  const timerRef = useRef<number | null>(null);

  useEffect(function schedule() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(function apply() {
      setDebounced(value);
      timerRef.current = null;
    }, delayMs);
    return function cleanup() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return debounced;
}
