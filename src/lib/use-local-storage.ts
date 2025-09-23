"use client";

import { useEffect, useState } from "react";

export interface UseLocalStorageOptions {
  defaultValue?: string;
  key: string;
}

export function useLocalStorage({ key, defaultValue = "" }: UseLocalStorageOptions) {
  const [storedValue, setStoredValue] = useState<string>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(function hydrate() {
    setIsHydrated(true);
    
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setValue = (value: string | ((val: string) => string)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (isHydrated) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}
