"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { MaintenanceAlertCounts } from "@/lib/maintenance-alert-badge";

type CtxValue = MaintenanceAlertCounts & {
  refetch: () => Promise<void>;
};

const MaintenanceAlertsContext = createContext<CtxValue | null>(null);

export function useMaintenanceAlerts(): MaintenanceAlertCounts {
  const ctx = useContext(MaintenanceAlertsContext);
  if (!ctx) {
    return { overdue: 0, warning: 0 };
  }
  return { overdue: ctx.overdue, warning: ctx.warning };
}

const stableNoopRefetch = async () => {};

/** Atualiza contadores do menu após mudanças em /manutencao (fora do contexto retorna no-op). */
export function useMaintenanceAlertsRefetch(): () => Promise<void> {
  const ctx = useContext(MaintenanceAlertsContext);
  return ctx?.refetch ?? stableNoopRefetch;
}

export function MaintenanceAlertsProvider({
  initial,
  children,
}: {
  initial: MaintenanceAlertCounts;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<MaintenanceAlertCounts>(initial);
  const firstPath = useRef(pathname);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/maintenance/badge", {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data: MaintenanceAlertCounts | null;
      };
      if (json.data) setCounts(json.data);
    } catch {
      /* mantém último valor */
    }
  }, []);

  useEffect(() => {
    if (firstPath.current === pathname) {
      return;
    }
    void refetch();
  }, [pathname, refetch]);

  const value = useMemo(
    (): CtxValue => ({
      ...counts,
      refetch,
    }),
    [counts, refetch],
  );

  return (
    <MaintenanceAlertsContext.Provider value={value}>
      {children}
    </MaintenanceAlertsContext.Provider>
  );
}
