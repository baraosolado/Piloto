"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardPeriod } from "@/lib/dashboard-period";

const PERIODS: { id: DashboardPeriod; label: string; custom?: boolean }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "custom", label: "Personalizado", custom: true },
];

type DashboardClientProps = {
  activePeriod: DashboardPeriod;
  customFrom?: string;
  customTo?: string;
  children: React.ReactNode;
};

export function DashboardClient({
  activePeriod,
  customFrom,
  customTo,
  children,
}: DashboardClientProps) {
  const router = useRouter();
  const [draftFrom, setDraftFrom] = useState(customFrom ?? "");
  const [draftTo, setDraftTo] = useState(customTo ?? "");

  useEffect(() => {
    setDraftFrom(customFrom ?? "");
    setDraftTo(customTo ?? "");
  }, [customFrom, customTo]);

  function navigatePeriod(id: DashboardPeriod) {
    if (id === "custom") {
      const t = new Date();
      const f = new Date();
      f.setUTCDate(f.getUTCDate() - 7);
      const qs = new URLSearchParams({
        period: "custom",
        from: f.toISOString().slice(0, 10),
        to: t.toISOString().slice(0, 10),
      });
      router.push(`/dashboard?${qs.toString()}`);
      return;
    }
    router.push(`/dashboard?period=${id}`);
  }

  function applyCustom() {
    if (!draftFrom || !draftTo) return;
    const qs = new URLSearchParams({
      period: "custom",
      from: draftFrom,
      to: draftTo,
    });
    router.push(`/dashboard?${qs.toString()}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERIODS.map(({ id, label, custom }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigatePeriod(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-colors",
              activePeriod === id
                ? "bg-black text-white"
                : "bg-white text-[#474747] shadow-sm",
            )}
          >
            {custom ? (
              <Calendar className="size-3.5" strokeWidth={2} />
            ) : null}
            {label}
          </button>
        ))}
      </div>

      {activePeriod === "custom" ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <label className="text-[10px] font-bold tracking-wide text-[#777777] uppercase">
              De
            </label>
            <input
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="border-input h-9 rounded-md border px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold tracking-wide text-[#777777] uppercase">
              Até
            </label>
            <input
              type="date"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
              className="border-input h-9 rounded-md border px-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            className="h-9 rounded-md bg-black px-4 text-xs font-bold text-white"
          >
            Aplicar
          </button>
        </div>
      ) : null}

      {children}
    </div>
  );
}
