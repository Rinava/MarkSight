"use client";

import { useEffect, useRef, useState } from "react";

export interface UseDebouncedValueOptions {
  /** Quiet time after the last change before the value is applied. */
  delayMs?: number;
  /**
   * Upper bound on how stale the value may get while changes keep coming.
   * Without it, steady typing faster than `delayMs` holds the old value until
   * the user pauses. Leave unset for a plain trailing debounce.
   */
  maxWaitMs?: number;
}

export function useDebouncedValue<T>(value: T, options?: UseDebouncedValueOptions) {
  const { delayMs = 200, maxWaitMs } = options ?? {};
  const [debounced, setDebounced] = useState<T>(value);
  const timerRef = useRef<number | null>(null);
  /** When the oldest change that hasn't been applied yet came in. */
  const pendingSinceRef = useRef<number | null>(null);

  useEffect(
    function schedule() {
      if (timerRef.current) window.clearTimeout(timerRef.current);

      const now = Date.now();
      pendingSinceRef.current ??= now;
      const wait =
        maxWaitMs === undefined
          ? delayMs
          : Math.max(0, Math.min(delayMs, pendingSinceRef.current + maxWaitMs - now));

      timerRef.current = window.setTimeout(function apply() {
        setDebounced(value);
        timerRef.current = null;
        pendingSinceRef.current = null;
      }, wait);
      return function cleanup() {
        if (timerRef.current) window.clearTimeout(timerRef.current);
      };
    },
    [value, delayMs, maxWaitMs]
  );

  return debounced;
}
