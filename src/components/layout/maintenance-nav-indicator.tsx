"use client";

import { useMaintenanceAlerts } from "@/components/layout/maintenance-alerts-context";
import { cn } from "@/lib/utils";

/** Pill com quantidade (sidebar / menu lateral). */
export function MaintenanceNavIndicator({
  className,
}: {
  className?: string;
}) {
  const { overdue, warning } = useMaintenanceAlerts();
  const n = overdue + warning;
  if (n === 0) return null;
  const urgent = overdue > 0;
  return (
    <span
      className={cn(
        "ml-auto flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none text-white tabular-nums",
        urgent ? "bg-red-500" : "bg-amber-500",
        className,
      )}
      aria-hidden
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}

/** Ponto no botão Menu (mobile) quando há alerta. */
export function MaintenanceMenuButtonDot() {
  const { overdue, warning } = useMaintenanceAlerts();
  const n = overdue + warning;
  if (n === 0) return null;
  const urgent = overdue > 0;
  return (
    <span
      className={cn(
        "absolute right-3 top-1.5 size-2 rounded-full ring-2 ring-white",
        urgent ? "bg-red-500" : "bg-amber-500",
      )}
      aria-hidden
    />
  );
}
