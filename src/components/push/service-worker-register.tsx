"use client";

import { useEffect } from "react";

/**
 * Registra o service worker de push em /sw.js (escopo do site).
 * Silencioso se não suportado ou em SSR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* dev: host sem HTTPS ou bloqueio do browser */
      });
  }, []);
  return null;
}
