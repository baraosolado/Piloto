"use client";

import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoalEditModal } from "@/components/metas/goal-edit-modal";
import type { MetasPagePayload } from "@/lib/metas-page-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function historyBadgeUi(badge: MetasPagePayload["history"][0]["badge"]) {
  switch (badge) {
    case "atingida":
      return {
        label: "Atingida",
        className: "bg-[#5adf82]/30 text-[#00461e]",
      };
    case "parcial":
      return {
        label: "Parcial",
        className: "bg-amber-100 text-amber-950",
      };
    case "sem_meta":
      return {
        label: "Sem meta",
        className: "bg-neutral-200 text-neutral-700",
      };
    default:
      return {
        label: "Não atingida",
        className: "bg-[#e8e8e8] text-[#474747]",
      };
  }
}

export function MetasView({ initialData }: { initialData: MetasPagePayload }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const d = initialData;

  function refresh() {
    router.refresh();
  }

  const barPct = Math.min(
    100,
    Math.max(0, Number.isFinite(d.percentage) ? d.percentage : 0),
  );

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 pb-20 pt-6 sm:max-w-2xl sm:px-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-black">
          Metas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lucro líquido (corridas − gastos) no mês.
        </p>
      </header>

      {!d.hasVehicle ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Sem veículo cadastrado, o lucro usa apenas o valor bruto das corridas.
          Configure em Configurações → Veículo.
        </p>
      ) : null}

      {d.monthlyTarget === null ? (
        <section className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="mb-2 text-lg font-bold text-black">
            Defina sua meta de lucro mensal
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Acompanhe o progresso com base nas suas corridas e gastos.
          </p>
          <Button
            type="button"
            className="gap-2 bg-black font-bold"
            onClick={() => setModalOpen(true)}
          >
            Definir minha meta mensal
            <ChevronRight className="size-4" />
          </Button>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <h2 className="text-xs font-bold tracking-widest text-[#777777] uppercase">
              Meta de {d.monthTitle}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-bold tracking-wide uppercase"
              onClick={() => setModalOpen(true)}
            >
              Ajustar meta
            </Button>
          </div>

          <div className="space-y-6 rounded-xl border border-border bg-white p-8 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#777777]">
                Meta mensal
              </p>
              <p className="text-4xl font-black tracking-tight text-black sm:text-5xl">
                {brl.format(d.monthlyTarget)}
              </p>
            </div>

            {d.achieved ? (
              <div className="inline-flex rounded-full bg-[#00a651]/15 px-3 py-1.5 text-sm font-bold text-[#006d33]">
                Meta atingida! 🎉
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-end justify-between text-xs font-bold tracking-wide uppercase">
                <span className="text-[#006d33]">
                  {brl.format(d.totalEarned)} acumulados
                </span>
                <span className="text-black">
                  {d.percentage.toFixed(0)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#eeeeee]">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <p className="text-xs leading-relaxed text-[#777777]">
                {brl.format(d.totalEarned)} de {brl.format(d.monthlyTarget!)} —{" "}
                {d.achieved ? (
                  <span className="font-bold text-[#006d33]">
                    Parabéns, meta batida!
                  </span>
                ) : d.daysToHit !== null && d.daysToHit >= 0 ? (
                  <span className="font-bold text-[#006d33]">
                    Você vai atingir sua meta em {d.daysToHit}{" "}
                    {d.daysToHit === 1 ? "dia" : "dias"} no ritmo atual.
                  </span>
                ) : d.shortfall !== null && d.shortfall > 0 ? (
                  <span className="font-bold text-[#e53935]">
                    No ritmo atual, você ficará{" "}
                    {brl.format(d.shortfall)} abaixo da meta.
                  </span>
                ) : (
                  <span>
                    Registre corridas e gastos para ver a projeção.
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {d.monthlyTarget !== null ? (
        <section className="grid grid-cols-3 gap-3">
          <div className="flex aspect-square flex-col justify-between rounded-xl bg-[#f3f3f3] p-4">
            <Calendar className="size-5 text-black" strokeWidth={2} />
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#777777]">
                Diária
              </p>
              <p className="text-sm font-black tabular-nums">
                {d.metaDiaria !== null ? brl.format(d.metaDiaria) : "—"}
              </p>
            </div>
          </div>
          <div className="flex aspect-square flex-col justify-between rounded-xl border-l-4 border-l-[#006d33] bg-[#f3f3f3] p-4">
            <CalendarRange className="size-5 text-[#006d33]" strokeWidth={2} />
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#777777]">
                Semanal
              </p>
              <p className="text-sm font-black text-[#006d33] tabular-nums">
                {d.metaSemanal !== null ? brl.format(d.metaSemanal) : "—"}
              </p>
            </div>
          </div>
          <div className="flex aspect-square flex-col justify-between rounded-xl bg-[#f3f3f3] p-4">
            <CalendarDays className="size-5 text-black" strokeWidth={2} />
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase text-[#777777]">
                Úteis rest.
              </p>
              <p className="text-sm font-black tabular-nums">
                {d.remainingWeekdays}{" "}
                <span className="text-[10px] font-bold">dias</span>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-black tracking-tight text-black uppercase">
          Histórico de metas
        </h2>
        <div className="space-y-2">
          {d.history.map((h) => {
            const b = historyBadgeUi(h.badge);
            return (
              <div
                key={`${h.year}-${h.month}`}
                className="flex items-center justify-between rounded-lg bg-[#f3f3f3] p-5 transition-transform active:scale-[0.99]"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold tracking-widest text-[#777777] uppercase">
                    {h.monthLabel}
                  </p>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-black tabular-nums">
                      {brl.format(h.earned)}
                    </span>
                    {h.target !== null ? (
                      <span className="text-[10px] font-medium text-[#777777]">
                        de {brl.format(h.target)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        sem meta definida
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span
                    className={cn(
                      "rounded px-2 py-1 text-[10px] font-black uppercase",
                      b.className,
                    )}
                  >
                    {b.label}
                  </span>
                  {h.percent !== null ? (
                    <span
                      className={cn(
                        "text-xs font-bold",
                        h.percent >= 100
                          ? "text-[#006d33]"
                          : "text-[#777777]",
                      )}
                    >
                      {h.percent.toFixed(0)}%
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <GoalEditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialTarget={d.monthlyTarget}
        year={d.year}
        month={d.month}
        weekdaysInMonth={d.weekdaysInMonth}
        ridesThisMonth={d.ridesThisMonth}
        onSaved={refresh}
      />
    </div>
  );
}
