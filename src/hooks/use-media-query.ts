"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * `getServerSnapshot` retorna `false` para evitar mismatch de hidratação.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onStoreChange);
      return () => m.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
