"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseLocalStorageOptions {
  defaultValue?: string;
  key: string;
}

export function useLocalStorage({ key, defaultValue = "" }: UseLocalStorageOptions) {
  const [storedValue, setStoredValue] = useState<string>(defaultValue);

  useEffect(function hydrate() {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setValue = useCallback(
    (value: string | ((val: string) => string)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
          console.warn(`Error setting localStorage key "${key}":`, error);
        }
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}
